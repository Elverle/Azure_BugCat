import type { CatalogBug } from '@shared/types'
import { UNCATEGORIZED } from '@shared/categorization'

export interface ClosedBugListItem {
  id: number
  title: string
  closedAt: string
  everInSimilarityGroup: boolean
  lastSimilarityGroupAt: string | null
}

export interface ClosedBugCategoryBreakdown {
  category: string
  count: number
  bugs: ClosedBugListItem[]
}

export interface ClosedBugKpiData {
  totalClosed: number
  recentlyClosedCount: number
  categoryDistribution: ClosedBugCategoryBreakdown[]
  similarityGroupCount: number
  similarityGroupPercentage: number
  lastUpdateAt: string | null
  lastClearedAt: string | null
}

export function computeClosedBugKpis(
  closedBugs: CatalogBug[],
  fetchedAt: string | null,
  lastClearedAt: string | null
): ClosedBugKpiData {
  const totalClosed = closedBugs.length

  const recentlyClosedCount =
    fetchedAt !== null ? closedBugs.filter((b) => b.closedAt === fetchedAt).length : 0

  const categoryMap = new Map<string, ClosedBugCategoryBreakdown>()
  for (const bug of closedBugs) {
    const category = bug.macroCategory || UNCATEGORIZED
    const existing = categoryMap.get(category)
    const bugItem: ClosedBugListItem = {
      id: bug.id,
      title: bug.title,
      closedAt: bug.closedAt ?? '',
      everInSimilarityGroup: bug.everInSimilarityGroup,
      lastSimilarityGroupAt: bug.lastSimilarityGroupAt
    }

    if (existing) {
      existing.count += 1
      existing.bugs.push(bugItem)
      continue
    }

    categoryMap.set(category, {
      category,
      count: 1,
      bugs: [bugItem]
    })
  }

  const categoryDistribution = Array.from(categoryMap.entries())
    .map(([, breakdown]) => ({
      ...breakdown,
      bugs: breakdown.bugs.sort((a, b) => {
        if (a.closedAt !== b.closedAt) {
          return b.closedAt.localeCompare(a.closedAt)
        }
        return a.id - b.id
      })
    }))
    .sort((a, b) => {
      if (a.count !== b.count) {
        return b.count - a.count
      }
      return a.category.localeCompare(b.category)
    })

  const similarityGroupCount = closedBugs.filter((b) => b.everInSimilarityGroup === true).length
  const similarityGroupPercentage =
    totalClosed > 0 ? Math.round((similarityGroupCount / totalClosed) * 100) : 0

  return {
    totalClosed,
    recentlyClosedCount,
    categoryDistribution,
    similarityGroupCount,
    similarityGroupPercentage,
    lastUpdateAt: fetchedAt,
    lastClearedAt
  }
}
