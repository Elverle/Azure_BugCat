// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CategorizedBug, ChunkProgress, SessionData } from '@shared/types'
import {
  resetDashboardCategorizationUiStateForTests,
  resetDashboardFetchUiStateForTests,
  useDashboard
} from '@renderer/hooks/useDashboard'
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
  macroCategory: 'Cat',
  technicalLayer: 'Sub',
  categoryReason: 'reason',
  categorizedAt: '2026-01-01'
}

const mockSession: SessionData = {
  bugs: [mockBug],
  fetchedAt: '2026-01-01T00:00:00.000Z',
  lastFetchNewCount: 3,
  categorizedAt: '2026-01-01T12:00:00.000Z'
}

type ElectronApiMock = {
  getSession: ReturnType<typeof vi.fn>
  getCategorizationStatus: ReturnType<typeof vi.fn>
  fetchBugs: ReturnType<typeof vi.fn>
  categorizeBugs: ReturnType<typeof vi.fn>
  cancelCategorization: ReturnType<typeof vi.fn>
  onCategorizeProgress: ReturnType<typeof vi.fn>
  onCategorizeDone: ReturnType<typeof vi.fn>
}

function installElectronApiMock(overrides: Partial<ElectronApiMock> = {}): ElectronApiMock {
  const cleanup = vi.fn()
  const api: ElectronApiMock = {
    getSession: vi.fn().mockResolvedValue(mockSession),
    getCategorizationStatus: vi.fn().mockResolvedValue({ active: false }),
    fetchBugs: vi.fn().mockResolvedValue(undefined),
    categorizeBugs: vi.fn().mockResolvedValue(undefined),
    cancelCategorization: vi.fn().mockResolvedValue({ cancelled: true }),
    onCategorizeProgress: vi.fn().mockReturnValue(cleanup),
    onCategorizeDone: vi.fn().mockReturnValue(cleanup),
    ...overrides
  }

  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: api
  })

  return api
}

describe('useDashboard', () => {
  beforeEach(() => {
    resetDashboardCategorizationUiStateForTests()
    resetDashboardFetchUiStateForTests()
    resetSessionStoreForTests()
    installElectronApiMock()
  })

  afterEach(() => {
    resetDashboardCategorizationUiStateForTests()
    resetDashboardFetchUiStateForTests()
    resetSessionStoreForTests()
    vi.restoreAllMocks()
  })

  it('loads session on mount', async () => {
    const { result } = renderHook(() => useDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.bugs).toEqual([mockBug])
    expect(result.current.sessionInfo).toEqual({
      fetchedAt: '2026-01-01T00:00:00.000Z',
      categorizedAt: '2026-01-01T12:00:00.000Z',
      lastFetchNewCount: 3
    })
  })

  it('handles null session', async () => {
    installElectronApiMock({ getSession: vi.fn().mockResolvedValue(null) })

    const { result } = renderHook(() => useDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.bugs).toEqual([])
    expect(result.current.sessionInfo).toEqual({
      fetchedAt: null,
      categorizedAt: null,
      lastFetchNewCount: null
    })
  })

  it('does not leave an unhandled rejection when the initial mount read fails', async () => {
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)

    installElectronApiMock({
      getSession: vi.fn().mockRejectedValue({ code: 'STORE_ERROR', message: 'Store unavailable' })
    })

    try {
      const { result } = renderHook(() => useDashboard())

      await waitFor(() => expect(result.current.loading).toBe(false))
      // Node emits 'unhandledRejection' once the microtask queue drains.
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(unhandled).not.toHaveBeenCalled()
      expect(result.current.bugs).toEqual([])
    } finally {
      process.off('unhandledRejection', unhandled)
    }
  })

  it('sets loading false after initial load', async () => {
    const { result } = renderHook(() => useDashboard())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('fetchBugs calls IPC and reloads session', async () => {
    const api = installElectronApiMock()
    const { result } = renderHook(() => useDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.fetchBugs()
    })

    expect(api.fetchBugs).toHaveBeenCalledOnce()
    // getSession called twice: initial load + reload after fetchBugs
    expect(api.getSession).toHaveBeenCalledTimes(2)
    expect(result.current.loading).toBe(false)
  })

  it('exposes fetchError when fetchBugs rejects instead of swallowing it', async () => {
    installElectronApiMock({
      fetchBugs: vi.fn().mockRejectedValue({
        code: 'ADO_AUTH_ERROR',
        message: 'Authentication failed: 401'
      })
    })

    const { result } = renderHook(() => useDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.fetchBugs()
    })

    expect(result.current.fetchError).toEqual({
      code: 'ADO_AUTH_ERROR',
      message: 'Authentication failed: 401'
    })
    expect(result.current.loading).toBe(false)

    act(() => {
      result.current.clearFetchError()
    })

    expect(result.current.fetchError).toBeNull()
  })

  it('clears a previous fetchError when a new fetch succeeds', async () => {
    const fetchBugs = vi
      .fn()
      .mockRejectedValueOnce({ code: 'ADO_TIMEOUT', message: 'Azure DevOps connection timed out' })
      .mockResolvedValue(undefined)
    installElectronApiMock({ fetchBugs })

    const { result } = renderHook(() => useDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.fetchBugs()
    })

    expect(result.current.fetchError).toEqual({
      code: 'ADO_TIMEOUT',
      message: 'Azure DevOps connection timed out'
    })

    await act(async () => {
      await result.current.fetchBugs()
    })

    expect(result.current.fetchError).toBeNull()
  })

  it('keeps fetchError visible on a fresh mount after the previous fetch failed while unmounted', async () => {
    let rejectFetchBugs: (error: unknown) => void = () => {}
    installElectronApiMock({
      fetchBugs: vi.fn().mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            rejectFetchBugs = reject
          })
      )
    })

    const { result, unmount } = renderHook(() => useDashboard())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let fetchPromise: Promise<void> = Promise.resolve()
    act(() => {
      fetchPromise = result.current.fetchBugs()
    })

    // Navigate away before the fetch settles — DashboardPage is a route and
    // React Router unmounts it.
    unmount()

    await act(async () => {
      rejectFetchBugs({ code: 'ADO_AUTH_ERROR', message: 'Authentication failed: 401' })
      await fetchPromise
    })

    // Navigating back mounts a fresh hook instance. The error must still be
    // visible: it lives in the module-level store, not in state local to the
    // unmounted instance that could never flush it.
    const { result: remounted } = renderHook(() => useDashboard())
    await waitFor(() => expect(remounted.current.loading).toBe(false))

    expect(remounted.current.fetchError).toEqual({
      code: 'ADO_AUTH_ERROR',
      message: 'Authentication failed: 401'
    })
  })

  it('categorizeBugs calls IPC and reloads session on success', async () => {
    const api = installElectronApiMock()
    const { result } = renderHook(() => useDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.categorizeBugs()
    })

    expect(api.categorizeBugs).toHaveBeenCalledOnce()
    expect(api.onCategorizeProgress).toHaveBeenCalledOnce()
    // getSession called twice: initial load + reload after categorize
    expect(api.getSession).toHaveBeenCalledTimes(2)
    expect(result.current.loading).toBe(false)
    expect(result.current.progress).toBeNull()
    expect(result.current.categorizeError).toBeNull()
  })

  it('stores categorize error when IPC categorization fails', async () => {
    installElectronApiMock({
      categorizeBugs: vi.fn().mockRejectedValue(new Error('OpenRouter error'))
    })

    const { result } = renderHook(() => useDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.categorizeBugs()
    })

    // A bare Error has no code of ours, so it is kept as UNKNOWN_ERROR.
    expect(result.current.categorizeError).toEqual({
      code: 'UNKNOWN_ERROR',
      message: 'OpenRouter error'
    })
    expect(result.current.progress).toBeNull()

    act(() => {
      result.current.clearCategorizeError()
    })

    expect(result.current.categorizeError).toBeNull()
  })

  it('swallows a cancellation identified by its error code', async () => {
    installElectronApiMock({
      categorizeBugs: vi
        .fn()
        .mockRejectedValue({ code: 'OPERATION_CANCELLED', message: 'Operation cancelled' })
    })

    const { result } = renderHook(() => useDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.categorizeBugs()
    })

    expect(result.current.categorizeError).toBeNull()
    expect(result.current.isCategorizing).toBe(false)
  })

  it('refreshes the session after a cancellation, so the partials persisted by the main process show up', async () => {
    const partialBug: CategorizedBug = {
      ...mockBug,
      id: 2,
      macroCategory: 'UI',
      categorizedAt: '2026-01-02T00:00:00.000Z'
    }
    const partialSession: SessionData = { ...mockSession, bugs: [mockBug, partialBug] }

    const getSession = vi
      .fn()
      .mockResolvedValueOnce(mockSession)
      .mockResolvedValueOnce(partialSession)

    installElectronApiMock({
      getSession,
      categorizeBugs: vi
        .fn()
        .mockRejectedValue({ code: 'OPERATION_CANCELLED', message: 'Operation cancelled' })
    })

    const { result } = renderHook(() => useDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.categorizeBugs()
    })

    // getSession called twice: initial load + refresh after the cancellation
    expect(getSession).toHaveBeenCalledTimes(2)
    expect(result.current.bugs).toEqual([mockBug, partialBug])
  })

  it('surfaces a non-cancellation error even when its wording resembles a cancellation', async () => {
    // The code is the only signal: matching on message text used to swallow
    // genuine failures whose wording happened to mention a cancellation.
    installElectronApiMock({
      categorizeBugs: vi
        .fn()
        .mockRejectedValue({ code: 'LLM_TIMEOUT', message: 'Richiesta annullata dal provider' })
    })

    const { result } = renderHook(() => useDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.categorizeBugs()
    })

    expect(result.current.categorizeError).toEqual({
      code: 'LLM_TIMEOUT',
      message: 'Richiesta annullata dal provider'
    })
  })

  it('tracks progress during categorization', async () => {
    let progressCallback: ((data: unknown) => void) | null = null
    let resolveCategorizeBugs: () => void
    const cleanup = vi.fn()

    installElectronApiMock({
      onCategorizeProgress: vi.fn().mockImplementation((cb) => {
        progressCallback = cb
        return cleanup
      }),
      categorizeBugs: vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveCategorizeBugs = resolve
          })
      )
    })

    const { result } = renderHook(() => useDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))

    // Start categorization (does not resolve yet)
    act(() => {
      result.current.categorizeBugs()
    })

    // Simulate a progress event
    await act(async () => {
      progressCallback?.({
        total: 10,
        completed: 5,
        currentChunk: []
      } satisfies ChunkProgress)
    })

    expect(result.current.progress).toEqual({
      total: 10,
      completed: 5,
      currentChunk: []
    })

    // Now resolve the categorization
    await act(async () => {
      resolveCategorizeBugs!()
    })

    // Progress is cleared after completion
    await waitFor(() => expect(result.current.progress).toBeNull())
  })

  it('cleans up progress listener on unmount', async () => {
    const cleanup = vi.fn()
    installElectronApiMock({
      onCategorizeProgress: vi.fn().mockReturnValue(cleanup),
      categorizeBugs: vi.fn().mockImplementation(
        () =>
          new Promise<void>(() => {
            // Stays pending for the life of the test — unmount happens before
            // it would ever resolve, and a real timer here would leak a
            // pending callback into whichever test runs next.
          })
      )
    })

    const { result, unmount } = renderHook(() => useDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))

    // Start categorization to register the progress listener
    act(() => {
      result.current.categorizeBugs()
    })

    // Unmount while categorization is still in progress
    unmount()

    expect(cleanup).toHaveBeenCalled()
  })

  it('resyncs when attaching to an active run and the main process signals completion', async () => {
    let doneCallback: (() => void) | null = null
    const api = installElectronApiMock({
      getCategorizationStatus: vi.fn().mockResolvedValue({ active: true }),
      onCategorizeDone: vi.fn((cb: () => void) => {
        doneCallback = cb
        return () => {}
      })
    })

    const { result } = renderHook(() => useDashboard())
    await waitFor(() => expect(result.current.isCategorizing).toBe(true))

    act(() => {
      doneCallback?.()
    })

    await waitFor(() => expect(result.current.isCategorizing).toBe(false))
    // getSession called twice: initial mount load + resync triggered by the done event
    expect(api.getSession).toHaveBeenCalledTimes(2)
  })

  it('stays idempotent when the done event and the local run promise both settle for the same run', async () => {
    let doneCallback: (() => void) | null = null
    let resolveCategorizeBugs: (() => void) | undefined
    const api = installElectronApiMock({
      onCategorizeDone: vi.fn((cb: () => void) => {
        doneCallback = cb
        return () => {}
      }),
      categorizeBugs: vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveCategorizeBugs = resolve
          })
      )
    })

    const { result } = renderHook(() => useDashboard())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      void result.current.categorizeBugs()
    })
    await waitFor(() => expect(doneCallback).not.toBeNull())

    // In production the main process sends LLM_CATEGORIZE_DONE from the handler's
    // `finally`, synchronously before the invoke() promise itself settles, so the
    // renderer sees this event before categorizeBugs()'s own promise resolves.
    act(() => {
      doneCallback?.()
    })
    await waitFor(() => expect(result.current.isCategorizing).toBe(false))

    // The local run's own promise then resolves too, running its own success
    // path (refreshSession + the same UI reset) on top of what the done event
    // already did. Both paths must converge on the same correct state.
    await act(async () => {
      resolveCategorizeBugs?.()
    })

    expect(result.current.isCategorizing).toBe(false)
    expect(result.current.categorizeError).toBeNull()
    // mount + done-triggered resync + the local success path's own refresh:
    // the second refresh is redundant work, not a correctness issue, because
    // refreshSession's generation counter discards the outcome of whichever
    // read is no longer the latest one.
    expect(api.getSession).toHaveBeenCalledTimes(3)
  })
})
