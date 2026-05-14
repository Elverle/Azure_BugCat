import { describe, expect, it } from 'vitest'
import type { CatalogBug } from '@shared/types'
import { computeClosedBugKpis } from '@renderer/lib/closed-bug-kpis'

function makeCatalogBug(overrides: Partial<CatalogBug> = {}): CatalogBug {
  return {
    id: 1,
    title: 'Bug',
    state: 'Closed',
    assignee: null,
    areaPath: 'Project\\Area',
    description: 'desc',
    descriptionHtml: undefined,
    priority: 2,
    createdDate: '2024-01-01T00:00:00Z',
    updatedDate: '2024-01-01T00:00:00Z',
    tags: [],
    macroCategory: '',
    subCategory: '',
    categoryReason: '',
    categorizedAt: '',
    firstSeenAt: '2024-05-01T00:00:00Z',
    lastSeenAt: '2024-06-01T00:00:00Z',
    closedAt: '2024-07-01T00:00:00Z',
    inputSignature: 'sig',
    everInSimilarityGroup: false,
    lastSimilarityGroupAt: null,
    ...overrides
  }
}

describe('computeClosedBugKpis', () => {
  it('returns zeros for empty array', () => {
    const result = computeClosedBugKpis([], null, null)

    expect(result).toEqual({
      totalClosed: 0,
      recentlyClosedCount: 0,
      categoryDistribution: [],
      similarityGroupCount: 0,
      similarityGroupPercentage: 0,
      lastUpdateAt: null,
      lastClearedAt: null
    })
  })

  it('computes totalClosed correctly', () => {
    const bugs = [makeCatalogBug({ id: 1 }), makeCatalogBug({ id: 2 }), makeCatalogBug({ id: 3 })]
    const result = computeClosedBugKpis(bugs, '2024-08-01T00:00:00Z', null)

    expect(result.totalClosed).toBe(3)
  })

  it('computes recentlyClosedCount via exact fetchedAt match', () => {
    const fetchedAt = '2024-07-01T00:00:00Z'
    const bugs = [
      makeCatalogBug({ id: 1, closedAt: fetchedAt }),
      makeCatalogBug({ id: 2, closedAt: fetchedAt }),
      makeCatalogBug({ id: 3, closedAt: '2024-06-15T00:00:00Z' })
    ]
    const result = computeClosedBugKpis(bugs, fetchedAt, null)

    expect(result.recentlyClosedCount).toBe(2)
  })

  it('returns recentlyClosedCount 0 when fetchedAt is null', () => {
    const bugs = [makeCatalogBug({ id: 1, closedAt: '2024-07-01T00:00:00Z' })]
    const result = computeClosedBugKpis(bugs, null, null)

    expect(result.recentlyClosedCount).toBe(0)
  })

  it('groups categorized bugs by macroCategory sorted descending', () => {
    const bugs = [
      makeCatalogBug({ id: 1, macroCategory: 'UI' }),
      makeCatalogBug({ id: 2, macroCategory: 'UI' }),
      makeCatalogBug({ id: 3, macroCategory: 'Performance' }),
      makeCatalogBug({ id: 4, macroCategory: 'Performance' }),
      makeCatalogBug({ id: 5, macroCategory: 'Performance' }),
      makeCatalogBug({ id: 6, macroCategory: 'Security' })
    ]
    const result = computeClosedBugKpis(bugs, null, null)

    expect(result.categoryDistribution).toEqual([
      expect.objectContaining({
        category: 'Performance',
        count: 3,
        bugs: expect.arrayContaining([
          expect.objectContaining({ id: 3 }),
          expect.objectContaining({ id: 4 }),
          expect.objectContaining({ id: 5 })
        ])
      }),
      expect.objectContaining({
        category: 'UI',
        count: 2,
        bugs: expect.arrayContaining([
          expect.objectContaining({ id: 1 }),
          expect.objectContaining({ id: 2 })
        ])
      }),
      expect.objectContaining({
        category: 'Security',
        count: 1,
        bugs: expect.arrayContaining([expect.objectContaining({ id: 6 })])
      })
    ])
  })

  it('uses "Non categorizzato" for bugs without macroCategory', () => {
    const bugs = [
      makeCatalogBug({ id: 1, macroCategory: 'UI' }),
      makeCatalogBug({ id: 2, macroCategory: '' }),
      makeCatalogBug({ id: 3, macroCategory: '' })
    ]
    const result = computeClosedBugKpis(bugs, null, null)

    expect(result.categoryDistribution[0]).toEqual(
      expect.objectContaining({ category: 'Non categorizzato', count: 2 })
    )
    expect(result.categoryDistribution[1]).toEqual(
      expect.objectContaining({ category: 'UI', count: 1 })
    )
  })

  it('computes similarity group count and percentage', () => {
    const bugs = [
      makeCatalogBug({ id: 1, everInSimilarityGroup: true }),
      makeCatalogBug({ id: 2, everInSimilarityGroup: true }),
      makeCatalogBug({ id: 3, everInSimilarityGroup: false }),
      makeCatalogBug({ id: 4, everInSimilarityGroup: false }),
      makeCatalogBug({ id: 5, everInSimilarityGroup: false })
    ]
    const result = computeClosedBugKpis(bugs, null, null)

    expect(result.similarityGroupCount).toBe(2)
    expect(result.similarityGroupPercentage).toBe(40)
  })

  it('returns 0% similarity when all bugs have everInSimilarityGroup false', () => {
    const bugs = [makeCatalogBug({ id: 1 }), makeCatalogBug({ id: 2 })]
    const result = computeClosedBugKpis(bugs, null, null)

    expect(result.similarityGroupCount).toBe(0)
    expect(result.similarityGroupPercentage).toBe(0)
  })

  it('passes through fetchedAt as lastUpdateAt', () => {
    const result = computeClosedBugKpis([], '2024-08-01T00:00:00Z', '2024-07-01T00:00:00Z')

    expect(result.lastUpdateAt).toBe('2024-08-01T00:00:00Z')
    expect(result.lastClearedAt).toBe('2024-07-01T00:00:00Z')
  })
})
