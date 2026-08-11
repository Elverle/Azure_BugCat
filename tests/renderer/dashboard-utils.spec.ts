import { describe, expect, it } from 'vitest'
import type { CategorizedBug } from '@shared/types'
import {
  computeKpis,
  filterBugs,
  getTechnicalLayersForMacros,
  getUniqueValues,
  groupBugs,
  sortBugs,
  type FilterState,
  EMPTY_FILTER_STATE
} from '../../src/renderer/src/lib/dashboard-utils'
import { getCategoryColor, getStatusBadgeClasses } from '../../src/renderer/src/lib/badge-colors'

const mockBugs: CategorizedBug[] = [
  {
    id: 1,
    title: 'OAuth login fails',
    state: 'Active',
    assignee: 'Laura K.',
    areaPath: 'ECommerce\\Frontend\\Auth',
    description: 'Users report MSAL token error',
    priority: 1,
    createdDate: '2026-01-01',
    updatedDate: '2026-01-15',
    tags: ['auth'],
    macroCategory: 'Authentication',
    technicalLayer: 'OAuth',
    categoryReason: 'OAuth related',
    categorizedAt: '2026-01-15'
  },
  {
    id: 2,
    title: 'SSO token expires',
    state: 'Active',
    assignee: null,
    areaPath: 'ECommerce\\Frontend\\Auth',
    description: 'SSO session timeout issue',
    priority: 2,
    createdDate: '2026-01-02',
    updatedDate: '2026-01-16',
    tags: ['sso'],
    macroCategory: 'Authentication',
    technicalLayer: 'SSO',
    categoryReason: 'SSO related',
    categorizedAt: '2026-01-16'
  },
  {
    id: 3,
    title: 'Cart total wrong',
    state: 'Resolved',
    assignee: 'Marco R.',
    areaPath: 'ECommerce\\Cart',
    description: 'Total calculation off by one cent',
    priority: 3,
    createdDate: '2026-01-03',
    updatedDate: '2026-01-17',
    tags: ['cart'],
    macroCategory: 'Cart',
    technicalLayer: 'Calculation',
    categoryReason: 'Math error',
    categorizedAt: '2026-01-17'
  },
  {
    id: 4,
    title: 'Server 500 on login',
    state: 'Closed',
    assignee: 'Laura K.',
    areaPath: 'ECommerce\\Backend\\API',
    description: 'Internal server error on POST /login',
    priority: 1,
    createdDate: '2026-01-04',
    updatedDate: '2026-01-18',
    tags: ['backend'],
    macroCategory: 'Infrastructure',
    technicalLayer: 'API',
    categoryReason: 'Server error',
    categorizedAt: '2026-01-18'
  },
  {
    id: 5,
    title: 'Checkout hangs',
    state: 'Active',
    assignee: 'Marco R.',
    areaPath: 'ECommerce\\Cart',
    description: 'Checkout page never completes',
    priority: 2,
    createdDate: '2026-01-05',
    updatedDate: '2026-01-19',
    tags: ['checkout'],
    macroCategory: 'Cart',
    technicalLayer: 'Checkout',
    categoryReason: 'UX issue',
    categorizedAt: '2026-01-19'
  }
]

describe('filterBugs', () => {
  it('should return all bugs when filters are empty', () => {
    const result = filterBugs(mockBugs, EMPTY_FILTER_STATE)
    expect(result).toHaveLength(5)
  })

  it('should filter by statuses only', () => {
    const filters: FilterState = { ...EMPTY_FILTER_STATE, statuses: ['Active'] }
    const result = filterBugs(mockBugs, filters)
    expect(result).toHaveLength(3)
    expect(result.every((b) => b.state === 'Active')).toBe(true)
  })

  it('should filter by combined statuses and assignees', () => {
    const filters: FilterState = {
      ...EMPTY_FILTER_STATE,
      statuses: ['Active'],
      assignees: ['Laura K.']
    }
    const result = filterBugs(mockBugs, filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('should return empty array when all bugs filtered out', () => {
    const filters: FilterState = { ...EMPTY_FILTER_STATE, statuses: ['New'] }
    const result = filterBugs(mockBugs, filters)
    expect(result).toHaveLength(0)
  })

  it('should search text case-insensitively in title', () => {
    const filters: FilterState = { ...EMPTY_FILTER_STATE, searchText: 'oauth' }
    const result = filterBugs(mockBugs, filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('should search text case-insensitively in description', () => {
    const filters: FilterState = { ...EMPTY_FILTER_STATE, searchText: 'MSAL' }
    const result = filterBugs(mockBugs, filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('should match "Unassigned" filter to null assignees', () => {
    const filters: FilterState = { ...EMPTY_FILTER_STATE, assignees: ['Unassigned'] }
    const result = filterBugs(mockBugs, filters)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(2)
    expect(result[0].assignee).toBeNull()
  })

  it('should filter by macroCategories', () => {
    const filters: FilterState = { ...EMPTY_FILTER_STATE, macroCategories: ['Cart'] }
    const result = filterBugs(mockBugs, filters)
    expect(result).toHaveLength(2)
    expect(result.every((b) => b.macroCategory === 'Cart')).toBe(true)
  })

  it('should filter by technicalLayers', () => {
    const filters: FilterState = { ...EMPTY_FILTER_STATE, technicalLayers: ['OAuth', 'SSO'] }
    const result = filterBugs(mockBugs, filters)
    expect(result).toHaveLength(2)
  })
})

describe('sortBugs', () => {
  it('should sort by string field ascending', () => {
    const result = sortBugs(mockBugs, 'title', 'asc')
    expect(result[0].title).toBe('Cart total wrong')
    expect(result[4].title).toBe('SSO token expires')
  })

  it('should sort by string field descending', () => {
    const result = sortBugs(mockBugs, 'title', 'desc')
    expect(result[0].title).toBe('SSO token expires')
    expect(result[4].title).toBe('Cart total wrong')
  })

  it('should sort by numeric field (priority) ascending', () => {
    const result = sortBugs(mockBugs, 'priority', 'asc')
    expect(result[0].priority).toBe(1)
    expect(result[result.length - 1].priority).toBe(3)
  })

  it('should sort by numeric field (priority) descending', () => {
    const result = sortBugs(mockBugs, 'priority', 'desc')
    expect(result[0].priority).toBe(3)
    expect(result[result.length - 1].priority).toBe(1)
  })

  it('should sort bugs without a priority last in both directions', () => {
    // A missing ADO priority is null, not 0: it must never sort as if it were
    // the most urgent bug in the list.
    const withMissing = [
      { ...mockBugs[0], id: 9001, priority: null },
      ...mockBugs.map((bug) => ({ ...bug }))
    ]

    const asc = sortBugs(withMissing, 'priority', 'asc')
    expect(asc[asc.length - 1].priority).toBeNull()
    expect(asc[0].priority).toBe(1)

    const desc = sortBugs(withMissing, 'priority', 'desc')
    expect(desc[desc.length - 1].priority).toBeNull()
    expect(desc[0].priority).toBe(3)
  })

  it('should return unchanged array when sortKey is null', () => {
    const result = sortBugs(mockBugs, null, 'asc')
    expect(result).toEqual(mockBugs)
  })

  it('should sort null values last regardless of direction', () => {
    const result = sortBugs(mockBugs, 'assignee', 'asc')
    expect(result[result.length - 1].assignee).toBeNull()

    const resultDesc = sortBugs(mockBugs, 'assignee', 'desc')
    expect(resultDesc[resultDesc.length - 1].assignee).toBeNull()
  })
})

describe('groupBugs', () => {
  it('should group by macroCategory', () => {
    const result = groupBugs(mockBugs, 'macroCategory')
    expect(result.size).toBe(3)
    expect(result.get('Authentication')).toHaveLength(2)
    expect(result.get('Cart')).toHaveLength(2)
    expect(result.get('Infrastructure')).toHaveLength(1)
  })

  it('should group by technicalLayer with empty mapped to "Non categorizzato"', () => {
    const bugsWithEmpty: CategorizedBug[] = [
      ...mockBugs,
      {
        ...mockBugs[0],
        id: 99,
        technicalLayer: ''
      }
    ]
    const result = groupBugs(bugsWithEmpty, 'technicalLayer')
    expect(result.has('Non categorizzato')).toBe(true)
    expect(result.get('Non categorizzato')).toHaveLength(1)
  })

  it('should group by assignee with null mapped to "Non assegnato"', () => {
    const result = groupBugs(mockBugs, 'assignee')
    expect(result.has('Non assegnato')).toBe(true)
    expect(result.get('Non assegnato')).toHaveLength(1)
    expect(result.get('Laura K.')).toHaveLength(2)
    expect(result.get('Marco R.')).toHaveLength(2)
  })

  it('should return empty Map for empty dataset', () => {
    const result = groupBugs([], 'macroCategory')
    expect(result.size).toBe(0)
  })

  it('should return all bugs under empty key when groupBy is "none"', () => {
    const result = groupBugs(mockBugs, 'none')
    expect(result.size).toBe(1)
    expect(result.get('')).toHaveLength(5)
  })
})

describe('computeKpis', () => {
  it('should compute KPIs for standard dataset', () => {
    const kpis = computeKpis(mockBugs)
    expect(kpis.total).toBe(5)
    expect(kpis.statusSummary).toEqual({
      todo: 0,
      inProgress: 3,
      suspended: 0
    })
    expect(kpis.macroCategories).toBe(3)
    expect(kpis.topAssignees).toEqual([
      { name: 'Laura K.', count: 2 },
      { name: 'Marco R.', count: 2 }
    ])
  })

  it('should handle empty array', () => {
    const kpis = computeKpis([])
    expect(kpis.total).toBe(0)
    expect(kpis.statusSummary).toEqual({
      todo: 0,
      inProgress: 0,
      suspended: 0
    })
    expect(kpis.macroCategories).toBe(0)
    expect(kpis.topAssignees).toEqual([])
  })

  it('should normalize Todo, To Do, In Progress, Active, and Suspended states', () => {
    const stateVariants: CategorizedBug[] = [
      { ...mockBugs[0], id: 100, state: 'Todo' },
      { ...mockBugs[0], id: 101, state: 'To Do' },
      { ...mockBugs[0], id: 102, state: 'In Progress' },
      { ...mockBugs[0], id: 103, state: 'Active' },
      { ...mockBugs[0], id: 104, state: 'Suspended' }
    ]

    const kpis = computeKpis(stateVariants)

    expect(kpis.statusSummary).toEqual({
      todo: 2,
      inProgress: 2,
      suspended: 1
    })
  })

  it('should return empty topAssignees when all assignees are null', () => {
    const nullAssigneeBugs: CategorizedBug[] = mockBugs.map((b) => ({ ...b, assignee: null }))
    const kpis = computeKpis(nullAssigneeBugs)
    expect(kpis.topAssignees).toEqual([])
  })

  it('should limit topAssignees to 3', () => {
    const manyAssignees: CategorizedBug[] = [
      { ...mockBugs[0], assignee: 'Alice', id: 10 },
      { ...mockBugs[0], assignee: 'Alice', id: 11 },
      { ...mockBugs[0], assignee: 'Bob', id: 12 },
      { ...mockBugs[0], assignee: 'Bob', id: 13 },
      { ...mockBugs[0], assignee: 'Charlie', id: 14 },
      { ...mockBugs[0], assignee: 'Charlie', id: 15 },
      { ...mockBugs[0], assignee: 'Diana', id: 16 },
      { ...mockBugs[0], assignee: 'Diana', id: 17 },
      { ...mockBugs[0], assignee: 'Diana', id: 18 }
    ]
    const kpis = computeKpis(manyAssignees)
    expect(kpis.topAssignees).toHaveLength(3)
    expect(kpis.topAssignees[0].name).toBe('Diana')
    expect(kpis.topAssignees[0].count).toBe(3)
  })
})

describe('getUniqueValues', () => {
  it('should return sorted unique string values', () => {
    const result = getUniqueValues(mockBugs, 'state')
    expect(result).toEqual(['Active', 'Closed', 'Resolved'])
  })

  it('should handle numeric fields as strings', () => {
    const result = getUniqueValues(mockBugs, 'priority')
    expect(result).toEqual(['1', '2', '3'])
  })

  it('should handle null values gracefully by excluding them', () => {
    const result = getUniqueValues(mockBugs, 'assignee')
    expect(result).not.toContain(null)
    expect(result).toEqual(['Laura K.', 'Marco R.'])
  })

  it('should return empty array for empty input', () => {
    const result = getUniqueValues([], 'state')
    expect(result).toEqual([])
  })
})

describe('getTechnicalLayersForMacros', () => {
  it('should return only sub-categories for selected macros', () => {
    const result = getTechnicalLayersForMacros(mockBugs, ['Authentication'])
    expect(result).toEqual(['OAuth', 'SSO'])
  })

  it('should return all sub-categories when no macros selected', () => {
    const result = getTechnicalLayersForMacros(mockBugs, [])
    expect(result).toEqual(['API', 'Calculation', 'Checkout', 'OAuth', 'SSO'])
  })

  it('should return sorted results', () => {
    const result = getTechnicalLayersForMacros(mockBugs, ['Cart'])
    expect(result).toEqual(['Calculation', 'Checkout'])
  })

  it('should return empty array for non-matching macro', () => {
    const result = getTechnicalLayersForMacros(mockBugs, ['NonExistent'])
    expect(result).toEqual([])
  })
})

describe('getCategoryColor', () => {
  it('should be deterministic — same input produces same output', () => {
    const result1 = getCategoryColor('Authentication')
    const result2 = getCategoryColor('Authentication')
    expect(result1).toEqual(result2)
  })

  it('should return gray fallback for empty string', () => {
    const result = getCategoryColor('')
    expect(result).toEqual({ bg: 'bg-gray-100', text: 'text-gray-600' })
  })

  it('should return an object with bg and text properties', () => {
    const result = getCategoryColor('Cart')
    expect(result).toHaveProperty('bg')
    expect(result).toHaveProperty('text')
    expect(result.bg).toMatch(/^bg-/)
    expect(result.text).toMatch(/^text-/)
  })
})

describe('getStatusBadgeClasses', () => {
  it('should return red classes for Active state', () => {
    expect(getStatusBadgeClasses('Active')).toBe('bg-red-100 text-red-700')
  })

  it('should return green classes for Resolved state', () => {
    expect(getStatusBadgeClasses('Resolved')).toBe('bg-green-100 text-green-700')
  })

  it('should return gray classes for Closed state', () => {
    expect(getStatusBadgeClasses('Closed')).toBe('bg-gray-100 text-gray-700')
  })

  it('should return blue classes for unknown state', () => {
    expect(getStatusBadgeClasses('Unknown')).toBe('bg-blue-100 text-blue-700')
  })
})
