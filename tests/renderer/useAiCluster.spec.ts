// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CategorizedBug, SessionData, SimilarityResult } from '@shared/types'
import { resetAiClusterUiStateForTests, useAiCluster } from '@renderer/hooks/useAiCluster'
import { resetSessionStoreForTests } from '@renderer/state/session-store'
import { UNCATEGORIZED } from '@shared/categorization'

const mockBug: CategorizedBug = {
  id: 1,
  title: 'Test bug',
  state: 'Active',
  assignee: 'Test User',
  areaPath: 'Test',
  description: 'desc',
  priority: 1,
  createdDate: '2026-01-01',
  updatedDate: '2026-01-01',
  tags: [],
  macroCategory: 'Costi',
  technicalLayer: 'Sub',
  categoryReason: 'reason',
  categorizedAt: '2026-01-01T12:00:00Z'
}

const mockSimilarityResult: SimilarityResult = {
  categories: [
    {
      macroCategory: 'Costi',
      groups: [{ similarityScore: 0.85, reason: 'Same issue', bugIds: [1, 2] }]
    }
  ],
  analyzedAt: '2026-01-01T14:00:00Z'
}

const mockSession: SessionData = {
  bugs: [mockBug, { ...mockBug, id: 2, title: 'Bug 2' }],
  fetchedAt: '2026-01-01T00:00:00.000Z',
  categorizedAt: '2026-01-01T12:00:00Z'
}

type ElectronApiMock = {
  getSession: ReturnType<typeof vi.fn>
  findSimilarBugs: ReturnType<typeof vi.fn>
  onFindSimilarProgress: ReturnType<typeof vi.fn>
  onFindSimilarDone: ReturnType<typeof vi.fn>
  cancelFindSimilar: ReturnType<typeof vi.fn>
  getFindSimilarStatus: ReturnType<typeof vi.fn>
  getSettings: ReturnType<typeof vi.fn>
}

function installElectronApiMock(overrides: Partial<ElectronApiMock> = {}): ElectronApiMock {
  const cleanup = vi.fn()
  const api: ElectronApiMock = {
    getSession: vi.fn().mockResolvedValue(mockSession),
    findSimilarBugs: vi.fn().mockResolvedValue(mockSimilarityResult),
    onFindSimilarProgress: vi.fn().mockReturnValue(cleanup),
    onFindSimilarDone: vi.fn().mockReturnValue(cleanup),
    cancelFindSimilar: vi.fn().mockResolvedValue({ cancelled: true }),
    getFindSimilarStatus: vi.fn().mockResolvedValue({ active: false }),
    getSettings: vi.fn().mockResolvedValue(null),
    ...overrides
  }

  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: api
  })

  return api
}

describe('useAiCluster', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    resetSessionStoreForTests()
    resetAiClusterUiStateForTests()
  })

  afterEach(() => {
    resetSessionStoreForTests()
    resetAiClusterUiStateForTests()
  })

  it('loads session on mount and sets canAnalyze when categorized', async () => {
    installElectronApiMock()

    const { result } = renderHook(() => useAiCluster())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.canAnalyze).toBe(true)
    expect(result.current.bugs).toHaveLength(2)
    expect(result.current.results).toBeNull()
  })

  it('sets canAnalyze to false when no categorizedAt', async () => {
    installElectronApiMock({
      getSession: vi.fn().mockResolvedValue({
        ...mockSession,
        categorizedAt: undefined,
        bugs: [{ ...mockBug, macroCategory: '' }]
      })
    })

    const { result } = renderHook(() => useAiCluster())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.canAnalyze).toBe(false)
  })

  it('sets canAnalyze to false when all bugs carry the uncategorized sentinel', async () => {
    installElectronApiMock({
      getSession: vi.fn().mockResolvedValue({
        ...mockSession,
        bugs: [
          { ...mockBug, macroCategory: UNCATEGORIZED },
          { ...mockBug, id: 2, macroCategory: UNCATEGORIZED }
        ]
      })
    })

    const { result } = renderHook(() => useAiCluster())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.canAnalyze).toBe(false)
  })

  it('loads existing similarity results from session', async () => {
    installElectronApiMock({
      getSession: vi.fn().mockResolvedValue({
        ...mockSession,
        similarityResults: mockSimilarityResult
      })
    })

    const { result } = renderHook(() => useAiCluster())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.results).toEqual(mockSimilarityResult)
  })

  it('runs analysis and updates results', async () => {
    const api = installElectronApiMock()
    // The main process persists the analysis into the session, so a later
    // getSession returns it — the hook reads the results back from the store.
    api.findSimilarBugs.mockImplementation(async () => {
      api.getSession.mockResolvedValue({
        ...mockSession,
        similarityResults: mockSimilarityResult
      })
      return mockSimilarityResult
    })

    const { result } = renderHook(() => useAiCluster())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.analyze()
    })

    expect(api.findSimilarBugs).toHaveBeenCalledTimes(1)
    expect(api.onFindSimilarProgress).toHaveBeenCalledTimes(1)
    expect(result.current.results).toEqual(mockSimilarityResult)
    expect(result.current.analyzing).toBe(false)
    expect(result.current.progress).toBeNull()
  })

  it('sets error state when analysis fails', async () => {
    installElectronApiMock({
      findSimilarBugs: vi.fn().mockRejectedValue({ message: 'Settings not configured' })
    })

    const { result } = renderHook(() => useAiCluster())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.analyze()
    })

    // The rejection carries no code of ours, so it is kept as UNKNOWN_ERROR
    // with its message intact.
    expect(result.current.error).toEqual({
      code: 'UNKNOWN_ERROR',
      message: 'Settings not configured'
    })
    expect(result.current.analyzing).toBe(false)
  })

  it('detects stale results when categorizedAt is newer than analyzedAt', async () => {
    installElectronApiMock({
      getSession: vi.fn().mockResolvedValue({
        ...mockSession,
        categorizedAt: '2026-01-02T12:00:00Z',
        similarityResults: mockSimilarityResult // analyzedAt is 2026-01-01T14:00:00Z
      })
    })

    const { result } = renderHook(() => useAiCluster())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isStale).toBe(true)
  })

  it('is not stale when analyzedAt is after categorizedAt', async () => {
    installElectronApiMock({
      getSession: vi.fn().mockResolvedValue({
        ...mockSession,
        categorizedAt: '2026-01-01T12:00:00Z',
        similarityResults: mockSimilarityResult // analyzedAt is 2026-01-01T14:00:00Z
      })
    })

    const { result } = renderHook(() => useAiCluster())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isStale).toBe(false)
  })

  it('does not set an error when analysis is cancelled by the user (review 2.2)', async () => {
    installElectronApiMock({
      findSimilarBugs: vi
        .fn()
        .mockRejectedValue({ code: 'OPERATION_CANCELLED', message: 'Operation cancelled' })
    })

    const { result } = renderHook(() => useAiCluster())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.analyze()
    })

    expect(result.current.error).toBeNull()
    expect(result.current.analyzing).toBe(false)
  })

  it('cancel() invokes cancelFindSimilar while a run is active (review 2.2; guard tightened in Task 18b item 4)', async () => {
    const api = installElectronApiMock({
      findSimilarBugs: vi.fn().mockImplementation(() => new Promise(() => {}))
    })

    const { result } = renderHook(() => useAiCluster())

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      void result.current.analyze()
    })
    await waitFor(() => expect(result.current.analyzing).toBe(true))

    await act(async () => {
      await result.current.cancel()
    })

    expect(api.cancelFindSimilar).toHaveBeenCalledTimes(1)
  })

  it('cancel() is a no-op when there is no active run, matching cancelCategorization (Task 18b item 4)', async () => {
    const api = installElectronApiMock()

    const { result } = renderHook(() => useAiCluster())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.cancel()
    })

    expect(api.cancelFindSimilar).not.toHaveBeenCalled()
  })

  it('reattaches to a run already in progress at mount and clears state on done (review 2.2)', async () => {
    let doneCallback: (() => void) | undefined
    const api = installElectronApiMock({
      getFindSimilarStatus: vi.fn().mockResolvedValue({ active: true }),
      onFindSimilarDone: vi.fn((callback: () => void) => {
        doneCallback = callback
        return vi.fn()
      })
    })

    const { result } = renderHook(() => useAiCluster())

    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.analyzing).toBe(true))

    expect(api.getFindSimilarStatus).toHaveBeenCalledTimes(1)

    api.getSession.mockResolvedValue({
      ...mockSession,
      similarityResults: mockSimilarityResult
    })

    await act(async () => {
      doneCallback?.()
      await Promise.resolve()
    })

    await waitFor(() => expect(result.current.analyzing).toBe(false))
    expect(result.current.results).toEqual(mockSimilarityResult)
  })

  it('does not reattach when no similarity run is active at mount (review 2.2)', async () => {
    installElectronApiMock({ getFindSimilarStatus: vi.fn().mockResolvedValue({ active: false }) })

    const { result } = renderHook(() => useAiCluster())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.analyzing).toBe(false)
  })

  it('clears a stuck analyzing flag on remount when the run finished while unmounted (FIX 1, regression from d00a666)', async () => {
    // First mount adopts a run already in progress...
    const api = installElectronApiMock({
      getFindSimilarStatus: vi.fn().mockResolvedValue({ active: true })
    })

    const { result, unmount } = renderHook(() => useAiCluster())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.analyzing).toBe(true))

    // ...then the view is switched away before DONE fires — this tears down the
    // DONE listener that was installed for the adopted run, exactly like
    // DashboardSimilaritySection unmounting on a tab switch.
    unmount()

    // The run finishes while nothing is listening: getFindSimilarStatus now
    // reports no active run, and the session already carries the result the
    // main process persisted.
    api.getFindSimilarStatus.mockResolvedValue({ active: false })
    api.getSession.mockResolvedValue({
      ...mockSession,
      similarityResults: mockSimilarityResult
    })

    // Switching back mounts a fresh hook instance. Without the fix, `analyzing`
    // stays stuck at `true` forever (module-scope store, no listener left to
    // clear it) and the freshly computed results never surface.
    const { result: remounted } = renderHook(() => useAiCluster())
    await waitFor(() => expect(remounted.current.loading).toBe(false))

    await waitFor(() => expect(remounted.current.analyzing).toBe(false))
    expect(remounted.current.results).toEqual(mockSimilarityResult)
  })

  it('does not cancel a locally started analyze() when a late status check resolves inactive (FIX 1)', async () => {
    let resolveStatus: (status: { active: boolean }) => void = () => {}
    installElectronApiMock({
      getFindSimilarStatus: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveStatus = resolve
          })
      ),
      findSimilarBugs: vi.fn().mockImplementation(() => new Promise(() => {}))
    })

    const { result } = renderHook(() => useAiCluster())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      void result.current.analyze()
    })
    await waitFor(() => expect(result.current.analyzing).toBe(true))

    // The mount's status check resolves late, after the user already started
    // their own run — it must not clobber it.
    await act(async () => {
      resolveStatus({ active: false })
      await Promise.resolve()
    })

    expect(result.current.analyzing).toBe(true)
  })

  it('keeps the error visible on a fresh mount after a run failed while unmounted (Task 18b item 3)', async () => {
    let rejectFindSimilar: (error: unknown) => void = () => {}
    installElectronApiMock({
      findSimilarBugs: vi.fn().mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            rejectFindSimilar = reject
          })
      )
    })

    const { result, unmount } = renderHook(() => useAiCluster())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let analyzePromise: Promise<void> = Promise.resolve()
    act(() => {
      analyzePromise = result.current.analyze()
    })

    // Switch away from the similarity view before the run settles —
    // DashboardSimilaritySection is conditionally rendered and unmounts.
    unmount()

    await act(async () => {
      rejectFindSimilar({ message: 'LLM provider unavailable' })
      await analyzePromise
    })

    // Switching back to the similarity view mounts a fresh hook instance. The
    // error must still be visible: it lives in the module-level store, not in
    // state local to the unmounted instance that could never flush it.
    const { result: remounted } = renderHook(() => useAiCluster())
    await waitFor(() => expect(remounted.current.loading).toBe(false))

    expect(remounted.current.error).toEqual({
      code: 'UNKNOWN_ERROR',
      message: 'LLM provider unavailable'
    })
    expect(remounted.current.analyzing).toBe(false)
  })

  it('does not start an analysis while the session is still loading (Task 18b item 5)', async () => {
    let resolveGetSession: (session: SessionData) => void = () => {}
    const api = installElectronApiMock({
      getSession: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveGetSession = resolve
          })
      )
    })

    const { result } = renderHook(() => useAiCluster())
    expect(result.current.loading).toBe(true)

    await act(async () => {
      await result.current.analyze()
    })

    expect(api.findSimilarBugs).not.toHaveBeenCalled()
    expect(result.current.analyzing).toBe(false)

    await act(async () => {
      resolveGetSession(mockSession)
      await Promise.resolve()
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('flips isCancelling visibly even when the main process reports no run to cancel (Task 18b item 4)', async () => {
    let resolveCancel: (value: { cancelled: boolean }) => void = () => {}
    const api = installElectronApiMock({
      findSimilarBugs: vi.fn().mockImplementation(() => new Promise(() => {})),
      cancelFindSimilar: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveCancel = resolve
          })
      )
    })

    const { result } = renderHook(() => useAiCluster())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      void result.current.analyze()
    })
    await waitFor(() => expect(result.current.analyzing).toBe(true))

    let cancelPromise: Promise<void> = Promise.resolve()
    act(() => {
      cancelPromise = result.current.cancel()
    })

    // The cancel is visibly in flight, unlike the old fire-and-forget call
    // which left the button state untouched no matter the outcome.
    await waitFor(() => expect(result.current.isCancelling).toBe(true))

    await act(async () => {
      resolveCancel({ cancelled: false })
      await cancelPromise
    })

    expect(result.current.isCancelling).toBe(false)
    expect(api.cancelFindSimilar).toHaveBeenCalledTimes(1)
  })

  it('clearError resets the error without touching other state (FIX 4)', async () => {
    installElectronApiMock({
      findSimilarBugs: vi.fn().mockRejectedValue({ message: 'Settings not configured' })
    })

    const { result } = renderHook(() => useAiCluster())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.analyze()
    })

    expect(result.current.error).toEqual({
      code: 'UNKNOWN_ERROR',
      message: 'Settings not configured'
    })

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
    expect(result.current.analyzing).toBe(false)
  })

  it('sets error when cancelFindSimilar rejects, without an unhandled rejection (Task 18b item 4)', async () => {
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)

    installElectronApiMock({
      findSimilarBugs: vi.fn().mockImplementation(() => new Promise(() => {})),
      cancelFindSimilar: vi.fn().mockRejectedValue(new Error('IPC channel closed'))
    })

    try {
      const { result } = renderHook(() => useAiCluster())
      await waitFor(() => expect(result.current.loading).toBe(false))

      act(() => {
        void result.current.analyze()
      })
      await waitFor(() => expect(result.current.analyzing).toBe(true))

      await act(async () => {
        await result.current.cancel()
      })
      // Node emits 'unhandledRejection' once the microtask queue drains.
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(unhandled).not.toHaveBeenCalled()
      expect(result.current.error).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'IPC channel closed'
      })
      expect(result.current.isCancelling).toBe(false)
    } finally {
      process.off('unhandledRejection', unhandled)
    }
  })
})
