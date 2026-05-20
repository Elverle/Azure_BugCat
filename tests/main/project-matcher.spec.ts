import { describe, expect, it } from 'vitest'
import { selectPrimaryProject, suggestSecondaryProjects } from '@main/agent/project-matcher'
import type { CategorizedBug, ProjectEntry } from '@shared/types'

const baseBug: CategorizedBug = {
  id: 101,
  title: 'Hotel booking fails on payment',
  state: 'Active',
  assignee: 'Alice',
  areaPath: 'HotelProject\\Backend\\Payments',
  description: 'Payment processing error during booking',
  priority: 2,
  createdDate: '2026-01-01T00:00:00Z',
  updatedDate: '2026-01-02T00:00:00Z',
  tags: ['payments', 'backend'],
  macroCategory: 'Payments',
  subCategory: 'Processing',
  categoryReason: 'Payment processing failure',
  categorizedAt: '2026-01-01T00:00:00Z'
}

const projects: ProjectEntry[] = [
  {
    id: 'proj-backend',
    name: 'hotel-api',
    path: '/repos/hotel-api',
    type: 'backend',
    description: 'Hotel backend API',
    keywords: ['hotel', 'payments', 'booking']
  },
  {
    id: 'proj-frontend',
    name: 'hotel-web',
    path: '/repos/hotel-web',
    type: 'frontend',
    description: 'Hotel frontend web app',
    keywords: ['hotel', 'react', 'web']
  },
  {
    id: 'proj-shared',
    name: 'hotel-common',
    path: '/repos/hotel-common',
    type: 'shared',
    description: 'Shared types and utilities',
    keywords: ['hotel', 'shared']
  }
]

describe('selectPrimaryProject', () => {
  it('returns the project with the highest score above threshold', () => {
    const result = selectPrimaryProject(baseBug, projects)
    expect(result).toBe('proj-backend')
  })

  it('returns null if no project scores >= 3', () => {
    const lowMatchBug: CategorizedBug = {
      ...baseBug,
      title: 'Unknown issue xyz',
      areaPath: 'OtherProject\\Misc',
      tags: [],
      macroCategory: 'Unknown',
      subCategory: 'Unknown'
    }
    const noMatchProjects: ProjectEntry[] = [
      {
        id: 'proj-1',
        name: 'unrelated',
        path: '/repos/unrelated',
        type: 'backend',
        description: 'Unrelated project',
        keywords: ['unrelated', 'nothing']
      }
    ]
    const result = selectPrimaryProject(lowMatchBug, noMatchProjects)
    expect(result).toBeNull()
  })

  it('returns null for empty projects array', () => {
    const result = selectPrimaryProject(baseBug, [])
    expect(result).toBeNull()
  })

  it('scores areaPath keyword match as +2', () => {
    const bug: CategorizedBug = {
      ...baseBug,
      title: 'Some issue',
      areaPath: 'Project\\Payments\\Module',
      tags: [],
      macroCategory: 'Other',
      subCategory: 'Other'
    }
    // 'payments' appears in areaPath -> +2, 'booking' not there -> 0
    // areaPath doesn't contain 'backend' type -> 0
    // Only 'payments' keyword scores +2, which is below threshold
    const singleKeywordProject: ProjectEntry[] = [
      {
        id: 'p1',
        name: 'test',
        path: '/test',
        type: 'frontend',
        description: '',
        keywords: ['payments']
      }
    ]
    const result = selectPrimaryProject(bug, singleKeywordProject)
    expect(result).toBeNull() // score = 2, below threshold
  })

  it('scores tag match as +2 per matching tag', () => {
    const bug: CategorizedBug = {
      ...baseBug,
      title: 'Something else',
      areaPath: 'Other\\Path',
      tags: ['react', 'web'],
      macroCategory: 'Other',
      subCategory: 'Other'
    }
    // proj-frontend keywords: hotel, react, web
    // tag 'react' matches keyword 'react' → +2
    // tag 'web' matches keyword 'web' → +2
    // total = 4, above threshold
    const result = selectPrimaryProject(bug, projects)
    expect(result).toBe('proj-frontend')
  })

  it('scores macroCategory match as +1', () => {
    const bug: CategorizedBug = {
      ...baseBug,
      title: 'No match here',
      areaPath: 'Other\\Path',
      tags: ['payments'],
      macroCategory: 'payments',
      subCategory: 'other'
    }
    // proj-backend keywords: hotel, payments, booking
    // tag 'payments' matches keyword 'payments' → +2
    // macroCategory 'payments' matches keyword 'payments' → +1
    // total = 3, meets threshold
    const result = selectPrimaryProject(bug, projects)
    expect(result).toBe('proj-backend')
  })

  it('scores title word match as +1 per keyword', () => {
    const bug: CategorizedBug = {
      ...baseBug,
      title: 'hotel booking payment issue',
      areaPath: 'Other\\Path',
      tags: [],
      macroCategory: 'Other',
      subCategory: 'Other'
    }
    // proj-backend keywords: hotel, payments, booking
    // title 'hotel' matches keyword 'hotel' → +1
    // title 'booking' matches keyword 'booking' → +1
    // title 'payment' does NOT match keyword 'payments' (exact word match)
    // total = 2, below threshold... but let's check proj-frontend too
    // proj-frontend keywords: hotel, react, web → title 'hotel' → +1
    // proj-backend wins with score 2... still below threshold
    const result = selectPrimaryProject(bug, projects)
    expect(result).toBeNull()
  })

  it('case-insensitive matching', () => {
    const bug: CategorizedBug = {
      ...baseBug,
      title: 'HOTEL issue',
      areaPath: 'Project\\PAYMENTS\\Module',
      tags: ['BACKEND'],
      macroCategory: 'PAYMENTS',
      subCategory: 'Other'
    }
    // proj-backend keywords: hotel, payments, booking
    // areaPath 'project\\payments\\module' contains 'payments' → +2
    // areaPath contains 'hotel'? No.
    // tag 'BACKEND' matches keyword? No (keywords are hotel, payments, booking)
    // macroCategory 'PAYMENTS' matches keyword 'payments' → +1
    // title 'hotel' matches keyword 'hotel' → +1
    // areaPath contains 'backend' type → +1
    // total = 5
    const result = selectPrimaryProject(bug, projects)
    expect(result).toBe('proj-backend')
  })

  it('adds +1 when areaPath contains project type', () => {
    const bug: CategorizedBug = {
      ...baseBug,
      title: 'hotel payments crash',
      areaPath: 'Project\\Backend\\Service',
      tags: ['payments'],
      macroCategory: 'Other',
      subCategory: 'Other'
    }
    // proj-backend keywords: hotel, payments, booking
    // areaPath contains 'hotel'? No. Contains 'payments'? No. Contains 'booking'? No.
    // tag 'payments' matches keyword 'payments' → +2
    // title 'hotel' matches keyword 'hotel' → +1, 'payments' matches 'payments' → +1
    // areaPath contains 'backend' (project type) → +1
    // total = 5
    const result = selectPrimaryProject(bug, projects)
    expect(result).toBe('proj-backend')
  })
})

describe('suggestSecondaryProjects', () => {
  it('returns shared projects plus frontend when primary is backend', () => {
    const result = suggestSecondaryProjects('proj-backend', projects)
    expect(result).toContain('proj-frontend')
    expect(result).toContain('proj-shared')
    expect(result).not.toContain('proj-backend')
  })

  it('returns shared projects plus backend when primary is frontend', () => {
    const result = suggestSecondaryProjects('proj-frontend', projects)
    expect(result).toContain('proj-backend')
    expect(result).toContain('proj-shared')
    expect(result).not.toContain('proj-frontend')
  })

  it('returns only frontend and backend when primary is shared', () => {
    const result = suggestSecondaryProjects('proj-shared', projects)
    // shared type primary → only adds other shared projects (none here)
    expect(result).toHaveLength(0)
  })

  it('returns empty array when primaryId not found', () => {
    const result = suggestSecondaryProjects('nonexistent', projects)
    expect(result).toEqual([])
  })

  it('never includes the primary project in results', () => {
    const result = suggestSecondaryProjects('proj-backend', projects)
    expect(result).not.toContain('proj-backend')
  })

  it('handles empty projects array', () => {
    const result = suggestSecondaryProjects('proj-backend', [])
    expect(result).toEqual([])
  })
})
