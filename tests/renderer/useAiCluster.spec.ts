// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CategorizedBug, SessionData, SimilarityResult } from '@shared/types'
import { useAiCluster } from '@renderer/hooks/useAiCluster'
import { resetSessionStoreForTests } from '@renderer/state/session-store'

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
  subCategory: 'Sub',
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
  })

  afterEach(() => {
    resetSessionStoreForTests()
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

  it('sets canAnalyze to false when all bugs are Non categorizzato', async () => {
    installElectronApiMock({
      getSession: vi.fn().mockResolvedValue({
        ...mockSession,
        bugs: [
          { ...mockBug, macroCategory: 'Non categorizzato' },
          { ...mockBug, id: 2, macroCategory: 'Non categorizzato' }
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

    expect(result.current.error).toBe('Settings not configured')
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

  it('cancel() invokes cancelFindSimilar (review 2.2)', async () => {
    const api = installElectronApiMock()

    const { result } = renderHook(() => useAiCluster())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.cancel()
    })

    expect(api.cancelFindSimilar).toHaveBeenCalledTimes(1)
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
})
