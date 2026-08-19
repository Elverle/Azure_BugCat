import type { CategorizedBug } from '@shared/types'
import { UNASSIGNED, UNCATEGORIZED } from '@shared/categorization'

// ============================================
// Types
// ============================================

export interface FilterState {
  statuses: string[]
  assignees: string[]
  macroCategories: string[]
  technicalLayers: string[]
  searchText: string
}

export type SortKey = keyof CategorizedBug | null
export type SortDirection = 'asc' | 'desc'

export interface SortState {
  key: SortKey
  direction: SortDirection
}

export type GroupBy = 'none' | 'macroCategory' | 'technicalLayer' | 'assignee'

export interface KpiData {
  total: number
  statusSummary: {
    todo: number
    inProgress: number
    suspended: number
  }
  macroCategories: number
  topAssignees: Array<{ name: string; count: number }>
}

// ============================================
// Constants
// ============================================

export const DEFAULT_SORT_STATE: SortState = { key: 'priority', direction: 'asc' }

export const EMPTY_FILTER_STATE: FilterState = {
  statuses: [],
  assignees: [],
  macroCategories: [],
  technicalLayers: [],
  searchText: ''
}

// ============================================
// Filter
// ============================================

export function filterBugs(bugs: CategorizedBug[], filters: FilterState): CategorizedBug[] {
  return bugs.filter((bug) => {
    if (filters.statuses.length > 0 && !filters.statuses.includes(bug.state)) {
      return false
    }

    if (filters.assignees.length > 0) {
      const assigneeValue = bug.assignee ?? UNASSIGNED
      if (!filters.assignees.includes(assigneeValue)) {
        return false
      }
    }

    if (
      filters.macroCategories.length > 0 &&
      !filters.macroCategories.includes(bug.macroCategory)
    ) {
      return false
    }

    if (
      filters.technicalLayers.length > 0 &&
      !filters.technicalLayers.includes(bug.technicalLayer)
    ) {
      return false
    }

    if (filters.searchText) {
      const search = filters.searchText.toLowerCase()
      const inTitle = bug.title.toLowerCase().includes(search)
      const inDescription = bug.description.toLowerCase().includes(search)
      if (!inTitle && !inDescription) {
        return false
      }
    }

    return true
  })
}

// ============================================
// Sort
// ============================================

export function sortBugs(
  bugs: CategorizedBug[],
  sortKey: SortKey,
  sortDir: SortDirection
): CategorizedBug[] {
  if (sortKey === null) return bugs

  const dirMultiplier = sortDir === 'asc' ? 1 : -1

  return [...bugs].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]

    // Null/undefined values sorted last regardless of direction
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * dirMultiplier
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      // Check if both are date strings (ISO format)
      if (isDateField(sortKey)) {
        const dateA = new Date(aVal).getTime()
        const dateB = new Date(bVal).getTime()
        return (dateA - dateB) * dirMultiplier
      }
      return aVal.localeCompare(bVal) * dirMultiplier
    }

    return 0
  })
}

const DATE_FIELDS: Set<string> = new Set(['createdDate', 'updatedDate', 'categorizedAt'])

function isDateField(key: keyof CategorizedBug): boolean {
  return DATE_FIELDS.has(key)
}

// ============================================
// Group
// ============================================

export function groupBugs(bugs: CategorizedBug[], groupBy: GroupBy): Map<string, CategorizedBug[]> {
  const map = new Map<string, CategorizedBug[]>()

  if (groupBy === 'none') {
    map.set('', bugs)
    return map
  }

  for (const bug of bugs) {
    let key: string

    switch (groupBy) {
      case 'macroCategory':
        key = bug.macroCategory || UNCATEGORIZED
        break
      case 'technicalLayer':
        key = bug.technicalLayer || UNCATEGORIZED
        break
      case 'assignee':
        key = bug.assignee ?? UNASSIGNED
        break
    }

    const group = map.get(key)
    if (group) {
      group.push(bug)
    } else {
      map.set(key, [bug])
    }
  }

  return map
}

// ============================================
// KPIs
// ============================================

export function computeKpis(bugs: CategorizedBug[]): KpiData {
  const total = bugs.length
  const statusSummary = {
    todo: 0,
    inProgress: 0,
    suspended: 0
  }
  const macroCategorySet = new Set<string>()
  const assigneeCounts = new Map<string, number>()

  for (const bug of bugs) {
    switch (normalizeKpiState(bug.state)) {
      case 'todo':
        statusSummary.todo++
        break
      case 'inProgress':
        statusSummary.inProgress++
        break
      case 'suspended':
        statusSummary.suspended++
        break
    }

    if (bug.macroCategory) {
      macroCategorySet.add(bug.macroCategory)
    }

    if (bug.assignee !== null) {
      assigneeCounts.set(bug.assignee, (assigneeCounts.get(bug.assignee) ?? 0) + 1)
    }
  }

  const topAssignees = [...assigneeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }))

  return {
    total,
    statusSummary,
    macroCategories: macroCategorySet.size,
    topAssignees
  }
}

function normalizeKpiState(state: string): 'todo' | 'inProgress' | 'suspended' | null {
  const normalized = state.trim().toLowerCase()

  if (normalized === 'todo' || normalized === 'to do') {
    return 'todo'
  }

  if (normalized === 'in progress' || normalized === 'inprogress' || normalized === 'active') {
    return 'inProgress'
  }

  if (normalized === 'suspended') {
    return 'suspended'
  }

  return null
}

// ============================================
// Utility
// ============================================

export function getUniqueValues(bugs: CategorizedBug[], field: keyof CategorizedBug): string[] {
  const values = new Set<string>()

  for (const bug of bugs) {
    const val = bug[field]
    if (val != null && typeof val === 'string') {
      values.add(val)
    } else if (val != null && typeof val === 'number') {
      values.add(String(val))
    }
  }

  return [...values].sort((a, b) => a.localeCompare(b))
}

export function getTechnicalLayersForMacros(
  bugs: CategorizedBug[],
  selectedMacros: string[]
): string[] {
  const technicalLayers = new Set<string>()

  if (selectedMacros.length === 0) {
    for (const bug of bugs) {
      if (bug.technicalLayer) {
        technicalLayers.add(bug.technicalLayer)
      }
    }
  } else {
    for (const bug of bugs) {
      if (selectedMacros.includes(bug.macroCategory) && bug.technicalLayer) {
        technicalLayers.add(bug.technicalLayer)
      }
    }
  }

  return [...technicalLayers].sort((a, b) => a.localeCompare(b))
}
