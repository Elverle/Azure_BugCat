// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CategorizedBug, ChunkProgress, SessionData } from '@shared/types'
import { useDashboard } from '@renderer/hooks/useDashboard'

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
  subCategory: 'Sub',
  categoryReason: 'reason',
  categorizedAt: '2026-01-01'
}

const mockSession: SessionData = {
  bugs: [mockBug],
  fetchedAt: '2026-01-01T00:00:00.000Z',
  categorizedAt: '2026-01-01T12:00:00.000Z'
}

type ElectronApiMock = {
  getSession: ReturnType<typeof vi.fn>
  fetchBugs: ReturnType<typeof vi.fn>
  categorizeBugs: ReturnType<typeof vi.fn>
  onCategorizeProgress: ReturnType<typeof vi.fn>
}

function installElectronApiMock(overrides: Partial<ElectronApiMock> = {}): ElectronApiMock {
  const cleanup = vi.fn()
  const api: ElectronApiMock = {
    getSession: vi.fn().mockResolvedValue(mockSession),
    fetchBugs: vi.fn().mockResolvedValue(undefined),
    categorizeBugs: vi.fn().mockResolvedValue(undefined),
    onCategorizeProgress: vi.fn().mockReturnValue(cleanup),
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
    installElectronApiMock()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads session on mount', async () => {
    const { result } = renderHook(() => useDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.bugs).toEqual([mockBug])
    expect(result.current.sessionInfo).toEqual({
      fetchedAt: '2026-01-01T00:00:00.000Z',
      categorizedAt: '2026-01-01T12:00:00.000Z'
    })
  })

  it('handles null session', async () => {
    installElectronApiMock({ getSession: vi.fn().mockResolvedValue(null) })

    const { result } = renderHook(() => useDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.bugs).toEqual([])
    expect(result.current.sessionInfo).toEqual({
      fetchedAt: null,
      categorizedAt: null
    })
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
      categorizeBugs: vi.fn().mockRejectedValue(new Error('Errore OpenRouter'))
    })

    const { result } = renderHook(() => useDashboard())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.categorizeBugs()
    })

    expect(result.current.categorizeError).toBe('Errore OpenRouter')
    expect(result.current.progress).toBeNull()

    act(() => {
      result.current.clearCategorizeError()
    })

    expect(result.current.categorizeError).toBeNull()
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
      categorizeBugs: vi
        .fn()
        .mockImplementation(() => new Promise<void>((resolve) => setTimeout(resolve, 100)))
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
})
