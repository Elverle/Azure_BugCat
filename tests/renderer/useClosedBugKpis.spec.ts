// @vitest-environment jsdom

import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CatalogBug, ClosedCatalogSnapshot } from '@shared/types'
import { useClosedBugKpis } from '@renderer/hooks/useClosedBugKpis'

function makeCatalogBug(overrides: Partial<CatalogBug> = {}): CatalogBug {
  return {
    id: 1,
    title: 'Bug',
    state: 'Closed',
    assignee: null,
    areaPath: 'Project\\Area',
    description: 'desc',
    priority: 2,
    createdDate: '2024-01-01T00:00:00Z',
    updatedDate: '2024-01-01T00:00:00Z',
    tags: [],
    macroCategory: 'UI',
    technicalLayer: 'Layout',
    categoryReason: 'reason',
    categorizedAt: '2024-06-01T00:00:00Z',
    firstSeenAt: '2024-05-01T00:00:00Z',
    lastSeenAt: '2024-06-01T00:00:00Z',
    closedAt: '2024-07-01T00:00:00Z',
    inputSignature: 'sig',
    everInSimilarityGroup: false,
    lastSimilarityGroupAt: null,
    ...overrides
  }
}

function installMock(snapshot: Partial<ClosedCatalogSnapshot> = {}) {
  const getCatalogClosed = vi.fn().mockResolvedValue({
    closedBugs: [],
    fetchedAt: null,
    lastClearedAt: null,
    ...snapshot
  })
  Object.defineProperty(window, 'electronAPI', {
    value: { getCatalogClosed },
    writable: true,
    configurable: true
  })
  return getCatalogClosed
}

describe('useClosedBugKpis', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('starts in loading state', () => {
    installMock()
    const { result } = renderHook(() => useClosedBugKpis())

    expect(result.current.loading).toBe(true)
    expect(result.current.kpis).toBeNull()
  })

  it('returns computed KPIs after IPC resolves', async () => {
    const bugs = [
      makeCatalogBug({ id: 1, closedAt: '2024-07-01T00:00:00Z' }),
      makeCatalogBug({ id: 2, closedAt: '2024-07-01T00:00:00Z', macroCategory: 'Performance' })
    ]
    installMock({
      closedBugs: bugs,
      fetchedAt: '2024-07-01T00:00:00Z',
      lastClearedAt: '2024-06-01T00:00:00Z'
    })

    const { result } = renderHook(() => useClosedBugKpis())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.kpis).not.toBeNull()
    expect(result.current.kpis!.totalClosed).toBe(2)
    expect(result.current.kpis!.recentlyClosedCount).toBe(2)
    expect(result.current.kpis!.lastClearedAt).toBe('2024-06-01T00:00:00Z')
  })

  it('returns null kpis for empty catalog', async () => {
    installMock()

    const { result } = renderHook(() => useClosedBugKpis())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.kpis).not.toBeNull()
    expect(result.current.kpis!.totalClosed).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('exposes the message of a typed AppError rejection', async () => {
    // What the preload actually delivers since the IPC error contract landed:
    // a plain { code, message }, not an Error instance.
    const getCatalogClosed = vi
      .fn()
      .mockRejectedValue({ code: 'STORE_ERROR', message: 'Catalogo non leggibile' })
    Object.defineProperty(window, 'electronAPI', {
      value: { getCatalogClosed },
      writable: true,
      configurable: true
    })

    const { result } = renderHook(() => useClosedBugKpis())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.kpis).toBeNull()
    expect(result.current.error).toBe('Catalogo non leggibile')
  })

  it('exposes error when IPC call rejects', async () => {
    const getCatalogClosed = vi.fn().mockRejectedValue(new Error('Store corrupted'))
    Object.defineProperty(window, 'electronAPI', {
      value: { getCatalogClosed },
      writable: true,
      configurable: true
    })

    const { result } = renderHook(() => useClosedBugKpis())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.kpis).toBeNull()
    expect(result.current.error).toBe('Store corrupted')
  })
})
