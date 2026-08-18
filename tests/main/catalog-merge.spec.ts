import { describe, it, expect } from 'vitest'
import {
  computeInputSignature,
  mergeFetchIntoCatalog,
  mergeCategorization,
  updateCatalogSimilarityMetadata
} from '@main/utils/catalog-merge'
import type {
  BugItem,
  CategorizedBug,
  CatalogBug,
  BugCatalog,
  SimilarityResult
} from '@shared/types'
import { NOT_AVAILABLE, PROCESSING_ERROR, UNCATEGORIZED } from '@shared/categorization'

function makeBugItem(overrides: Partial<BugItem> = {}): BugItem {
  return {
    id: 1,
    title: 'Bug title',
    state: 'Active',
    assignee: null,
    areaPath: 'Project\\Area',
    description: 'Bug description',
    priority: 2,
    createdDate: '2024-01-01T00:00:00Z',
    updatedDate: '2024-01-01T00:00:00Z',
    tags: [],
    ...overrides
  }
}

function makeCatalogBug(overrides: Partial<CatalogBug> = {}): CatalogBug {
  return {
    ...makeBugItem(),
    macroCategory: 'Cat',
    technicalLayer: 'Sub',
    categoryReason: 'Reason',
    categorizedAt: '2024-01-01T00:00:00Z',
    firstSeenAt: '2024-01-01T00:00:00Z',
    lastSeenAt: '2024-01-01T00:00:00Z',
    closedAt: null,
    inputSignature: '',
    everInSimilarityGroup: false,
    lastSimilarityGroupAt: null,
    ...overrides
  }
}

function makeCategorizedBug(overrides: Partial<CategorizedBug> = {}): CategorizedBug {
  return {
    ...makeBugItem(),
    macroCategory: '',
    technicalLayer: '',
    categoryReason: '',
    categorizedAt: '',
    ...overrides
  }
}

describe('computeInputSignature', () => {
  it('same inputs produce the same signature', () => {
    const bug1 = makeBugItem()
    const bug2 = makeBugItem()
    expect(computeInputSignature(bug1)).toBe(computeInputSignature(bug2))
  })

  it('different title produces a different signature', () => {
    const bug1 = makeBugItem({ title: 'Title A' })
    const bug2 = makeBugItem({ title: 'Title B' })
    expect(computeInputSignature(bug1)).not.toBe(computeInputSignature(bug2))
  })

  it('different assignee (non-relevant field) produces the same signature', () => {
    const bug1 = makeBugItem({ assignee: 'Alice' })
    const bug2 = makeBugItem({ assignee: 'Bob' })
    expect(computeInputSignature(bug1)).toBe(computeInputSignature(bug2))
  })

  it('is case-insensitive for title, description, and areaPath', () => {
    const bug1 = makeBugItem({ title: 'Bug Title', description: 'Desc', areaPath: 'Project\\Area' })
    const bug2 = makeBugItem({ title: 'BUG TITLE', description: 'DESC', areaPath: 'PROJECT\\AREA' })
    expect(computeInputSignature(bug1)).toBe(computeInputSignature(bug2))
  })

  it('tags order does not matter (sorted internally)', () => {
    const bug1 = makeBugItem({ tags: ['beta', 'alpha', 'gamma'] })
    const bug2 = makeBugItem({ tags: ['gamma', 'alpha', 'beta'] })
    expect(computeInputSignature(bug1)).toBe(computeInputSignature(bug2))
  })

  it('returns a 16-character hex string', () => {
    const sig = computeInputSignature(makeBugItem())
    expect(sig).toMatch(/^[0-9a-f]{16}$/)
  })

  it('computes the same input signature for priority 0 (legacy) and null (new) — review 3.4', () => {
    // A bug catalogued before this fix has priority: 0 (the old "missing priority"
    // sentinel). The same bug re-fetched today has priority: null. If the signature
    // changed here, every such entry in every user's catalog would look "modified"
    // and get bulk re-categorized by the LLM for no reason.
    const legacy = makeBugItem({ priority: 0 })
    const current = makeBugItem({ priority: null })
    expect(computeInputSignature(current)).toBe(computeInputSignature(legacy))
  })
})

describe('mergeFetchIntoCatalog', () => {
  const now = '2024-06-01T12:00:00Z'

  it('empty catalog + N bugs creates N new entries, all uncategorized', () => {
    const bugs = [makeBugItem({ id: 1 }), makeBugItem({ id: 2, title: 'Second bug' })]
    const { updatedCatalog, sessionBugs, newBugCount } = mergeFetchIntoCatalog(
      bugs,
      null,
      now,
      new Set(bugs.map((b) => b.id))
    )

    expect(Object.keys(updatedCatalog)).toHaveLength(2)
    expect(sessionBugs).toHaveLength(2)
    expect(newBugCount).toBe(2)

    for (const sb of sessionBugs) {
      expect(sb.macroCategory).toBe('')
      expect(sb.technicalLayer).toBe('')
      expect(sb.categoryReason).toBe('')
      expect(sb.categorizedAt).toBe('')
    }

    for (const id of [1, 2]) {
      const entry = updatedCatalog[id]
      expect(entry.firstSeenAt).toBe(now)
      expect(entry.lastSeenAt).toBe(now)
      expect(entry.closedAt).toBeNull()
      expect(entry.everInSimilarityGroup).toBe(false)
      expect(entry.lastSimilarityGroupAt).toBeNull()
    }
  })

  it('all bugs known and unchanged → session carries over categorization, lastSeenAt updated', () => {
    const bug = makeBugItem({ id: 10 })
    const signature = computeInputSignature(bug)
    const catalog: BugCatalog = {
      10: makeCatalogBug({
        id: 10,
        title: bug.title,
        description: bug.description,
        inputSignature: signature,
        lastSeenAt: '2024-01-01T00:00:00Z'
      })
    }

    const { updatedCatalog, sessionBugs } = mergeFetchIntoCatalog(
      [bug],
      catalog,
      now,
      new Set([bug.id])
    )

    expect(sessionBugs[0].macroCategory).toBe('Cat')
    expect(sessionBugs[0].technicalLayer).toBe('Sub')
    expect(sessionBugs[0].categorizedAt).toBe('2024-01-01T00:00:00Z')
    expect(updatedCatalog[10].lastSeenAt).toBe(now)
    expect(mergeFetchIntoCatalog([bug], catalog, now, new Set([bug.id])).newBugCount).toBe(0)
  })

  it('bug with changed signature → session bug has empty categorization, catalog entry updated', () => {
    const originalBug = makeBugItem({ id: 20, title: 'Original title' })
    const originalSig = computeInputSignature(originalBug)
    const catalog: BugCatalog = {
      20: makeCatalogBug({ id: 20, title: 'Original title', inputSignature: originalSig })
    }

    const changedBug = makeBugItem({ id: 20, title: 'Changed title' })
    const { updatedCatalog, sessionBugs } = mergeFetchIntoCatalog(
      [changedBug],
      catalog,
      now,
      new Set([changedBug.id])
    )

    expect(sessionBugs[0].macroCategory).toBe('')
    expect(sessionBugs[0].categorizedAt).toBe('')
    expect(updatedCatalog[20].inputSignature).toBe(computeInputSignature(changedBug))
    expect(updatedCatalog[20].lastSeenAt).toBe(now)
  })

  it('bug absent from fetch → closedAt set in catalog, bug NOT in sessionBugs', () => {
    const bug = makeBugItem({ id: 30 })
    const catalog: BugCatalog = {
      30: makeCatalogBug({ id: 30, inputSignature: computeInputSignature(bug) })
    }

    const { updatedCatalog, sessionBugs } = mergeFetchIntoCatalog([], catalog, now, new Set())

    expect(sessionBugs).toHaveLength(0)
    expect(updatedCatalog[30].closedAt).toBe(now)
  })

  it('bug reappears after being closed → closedAt reset to null, lastSeenAt updated', () => {
    const bug = makeBugItem({ id: 40 })
    const signature = computeInputSignature(bug)
    const catalog: BugCatalog = {
      40: makeCatalogBug({
        id: 40,
        inputSignature: signature,
        closedAt: '2024-03-01T00:00:00Z'
      })
    }

    const { updatedCatalog } = mergeFetchIntoCatalog([bug], catalog, now, new Set([bug.id]))

    expect(updatedCatalog[40].closedAt).toBeNull()
    expect(updatedCatalog[40].lastSeenAt).toBe(now)
  })

  it('fetch returns empty → all catalog open bugs get closedAt', () => {
    const catalog: BugCatalog = {
      50: makeCatalogBug({ id: 50, closedAt: null }),
      51: makeCatalogBug({ id: 51, closedAt: null })
    }

    const { updatedCatalog, sessionBugs } = mergeFetchIntoCatalog([], catalog, now, new Set())

    expect(sessionBugs).toHaveLength(0)
    expect(updatedCatalog[50].closedAt).toBe(now)
    expect(updatedCatalog[51].closedAt).toBe(now)
  })

  it('mixed scenario: new + unchanged + changed + absent', () => {
    const unchangedBug = makeBugItem({ id: 1, title: 'Unchanged' })
    const changedBug = makeBugItem({ id: 2, title: 'Changed title now' })
    const newBug = makeBugItem({ id: 3, title: 'Brand new' })

    const unchangedSig = computeInputSignature(unchangedBug)
    const originalBug2 = makeBugItem({ id: 2, title: 'Original title 2' })
    const originalSig2 = computeInputSignature(originalBug2)

    const catalog: BugCatalog = {
      1: makeCatalogBug({ id: 1, title: 'Unchanged', inputSignature: unchangedSig }),
      2: makeCatalogBug({ id: 2, title: 'Original title 2', inputSignature: originalSig2 }),
      4: makeCatalogBug({ id: 4, title: 'Will be absent', closedAt: null })
    }

    const { updatedCatalog, sessionBugs } = mergeFetchIntoCatalog(
      [unchangedBug, changedBug, newBug],
      catalog,
      now,
      new Set([unchangedBug.id, changedBug.id, newBug.id])
    )

    // Session has 3 bugs (new + unchanged + changed), NOT the absent one
    expect(sessionBugs).toHaveLength(3)
    expect(sessionBugs.find((b) => b.id === 4)).toBeUndefined()

    // Unchanged carries categorization
    const sb1 = sessionBugs.find((b) => b.id === 1)!
    expect(sb1.macroCategory).toBe('Cat')

    // Changed has empty categorization
    const sb2 = sessionBugs.find((b) => b.id === 2)!
    expect(sb2.macroCategory).toBe('')

    // New has empty categorization
    const sb3 = sessionBugs.find((b) => b.id === 3)!
    expect(sb3.macroCategory).toBe('')

    // Absent gets closedAt
    expect(updatedCatalog[4].closedAt).toBe(now)

    // New entry has lifecycle defaults
    expect(updatedCatalog[3].firstSeenAt).toBe(now)
    expect(updatedCatalog[3].everInSimilarityGroup).toBe(false)
  })
})

describe('closure scope (review 1.1)', () => {
  const NOW = '2024-06-01T12:00:00Z'

  it('does NOT close a catalog bug that is in the full query result but beyond topN', () => {
    const catalog = { 7: makeCatalogBug({ id: 7, closedAt: null }) }
    const { updatedCatalog } = mergeFetchIntoCatalog([], catalog, NOW, new Set([7]))
    expect(updatedCatalog[7].closedAt).toBeNull()
  })

  it('closes a catalog bug absent from the full query result', () => {
    const catalog = { 7: makeCatalogBug({ id: 7, closedAt: null }) }
    const { updatedCatalog } = mergeFetchIntoCatalog([], catalog, NOW, new Set([99]))
    expect(updatedCatalog[7].closedAt).toBe(NOW)
  })

  it('does not close anything when closureScopeIds is null (query changed)', () => {
    const catalog = { 7: makeCatalogBug({ id: 7, closedAt: null }) }
    const { updatedCatalog } = mergeFetchIntoCatalog([], catalog, NOW, null)
    expect(updatedCatalog[7].closedAt).toBeNull()
  })
})

describe('mergeCategorization', () => {
  const now = '2024-06-01T12:00:00Z'

  it('LLM results merged correctly into session bugs and catalog entries', () => {
    const bug = makeBugItem({ id: 1 })
    const sessionBugs: CategorizedBug[] = [
      { ...bug, macroCategory: '', technicalLayer: '', categoryReason: '', categorizedAt: '' }
    ]
    const llmResults: CategorizedBug[] = [
      {
        ...bug,
        macroCategory: 'Performance',
        technicalLayer: 'Memory Leak',
        categoryReason: 'Uses too much RAM',
        categorizedAt: ''
      }
    ]
    const catalog: BugCatalog = {
      1: makeCatalogBug({
        id: 1,
        macroCategory: '',
        technicalLayer: '',
        categorizedAt: '',
        inputSignature: computeInputSignature(bug)
      })
    }

    const { updatedSessionBugs, updatedCatalog } = mergeCategorization(
      sessionBugs,
      llmResults,
      catalog,
      now
    )

    expect(updatedSessionBugs[0].macroCategory).toBe('Performance')
    expect(updatedSessionBugs[0].technicalLayer).toBe('Memory Leak')
    expect(updatedSessionBugs[0].categoryReason).toBe('Uses too much RAM')
    expect(updatedCatalog[1].macroCategory).toBe('Performance')
    expect(updatedCatalog[1].technicalLayer).toBe('Memory Leak')
  })

  it('only processed bugs updated, others untouched', () => {
    const bug1 = makeBugItem({ id: 1 })
    const bug2 = makeBugItem({ id: 2, title: 'Other bug' })
    const sessionBugs: CategorizedBug[] = [
      { ...bug1, macroCategory: '', technicalLayer: '', categoryReason: '', categorizedAt: '' },
      {
        ...bug2,
        macroCategory: 'Existing',
        technicalLayer: 'ExSub',
        categoryReason: 'ExReason',
        categorizedAt: '2024-01-01T00:00:00Z'
      }
    ]
    const llmResults: CategorizedBug[] = [
      {
        ...bug1,
        macroCategory: 'NewCat',
        technicalLayer: 'NewSub',
        categoryReason: 'NewReason',
        categorizedAt: ''
      }
    ]
    const catalog: BugCatalog = {
      1: makeCatalogBug({
        id: 1,
        macroCategory: '',
        categorizedAt: '',
        inputSignature: computeInputSignature(bug1)
      }),
      2: makeCatalogBug({
        id: 2,
        title: 'Other bug',
        macroCategory: 'Existing',
        inputSignature: computeInputSignature(bug2)
      })
    }

    const { updatedSessionBugs, updatedCatalog } = mergeCategorization(
      sessionBugs,
      llmResults,
      catalog,
      now
    )

    // Bug 1 updated
    expect(updatedSessionBugs[0].macroCategory).toBe('NewCat')
    // Bug 2 untouched
    expect(updatedSessionBugs[1].macroCategory).toBe('Existing')
    expect(updatedSessionBugs[1].categorizedAt).toBe('2024-01-01T00:00:00Z')
    expect(updatedCatalog[2].macroCategory).toBe('Existing')
  })

  it('categorizedAt set to now for categorized bugs', () => {
    const bug = makeBugItem({ id: 5 })
    const sessionBugs: CategorizedBug[] = [
      { ...bug, macroCategory: '', technicalLayer: '', categoryReason: '', categorizedAt: '' }
    ]
    const llmResults: CategorizedBug[] = [
      {
        ...bug,
        macroCategory: 'UI',
        technicalLayer: 'Layout',
        categoryReason: 'Broken',
        categorizedAt: ''
      }
    ]
    const catalog: BugCatalog = {
      5: makeCatalogBug({
        id: 5,
        macroCategory: '',
        categorizedAt: '',
        inputSignature: computeInputSignature(bug)
      })
    }

    const { updatedSessionBugs, updatedCatalog } = mergeCategorization(
      sessionBugs,
      llmResults,
      catalog,
      now
    )

    expect(updatedSessionBugs[0].categorizedAt).toBe(now)
    expect(updatedCatalog[5].categorizedAt).toBe(now)
  })

  it('catalog inputSignature recomputed for categorized bugs', () => {
    const bug = makeBugItem({ id: 7 })
    const expectedSig = computeInputSignature(bug)
    const sessionBugs: CategorizedBug[] = [
      { ...bug, macroCategory: '', technicalLayer: '', categoryReason: '', categorizedAt: '' }
    ]
    const llmResults: CategorizedBug[] = [
      {
        ...bug,
        macroCategory: 'Security',
        technicalLayer: 'XSS',
        categoryReason: 'Unsafe',
        categorizedAt: ''
      }
    ]
    const catalog: BugCatalog = {
      7: makeCatalogBug({ id: 7, inputSignature: 'stale_signature_' })
    }

    const { updatedCatalog } = mergeCategorization(sessionBugs, llmResults, catalog, now)

    expect(updatedCatalog[7].inputSignature).toBe(expectedSig)
  })
})

describe('mergeCategorization with failed results', () => {
  it('does not set categorizedAt for fallback uncategorized results', () => {
    const bug = makeCategorizedBug({ id: 1, macroCategory: '', categorizedAt: '' })
    const catalog = { 1: makeCatalogBug({ id: 1, categorizedAt: '' }) }
    const failed = {
      ...bug,
      macroCategory: UNCATEGORIZED,
      technicalLayer: PROCESSING_ERROR,
      categoryReason: NOT_AVAILABLE,
      categorizedAt: '2026-01-01T00:00:00Z'
    }

    const { updatedCatalog, updatedSessionBugs } = mergeCategorization(
      [bug],
      [failed],
      catalog,
      '2026-01-01T00:00:00Z'
    )

    expect(updatedCatalog[1].categorizedAt).toBe('')
    expect(updatedSessionBugs[0].categorizedAt).toBe('')
    expect(updatedCatalog[1].macroCategory).toBe(UNCATEGORIZED)
  })

  it('keeps failed bugs eligible for re-categorization on next fetch (reset branch)', () => {
    // Catalog entry left behind by a fallback categorization: macroCategory is the
    // UNCATEGORIZED sentinel but categorizedAt is empty, and the bug's input has not
    // changed since (same inputSignature). mergeFetchIntoCatalog must still take the
    // reset branch (categorizedAt falsy) rather than the carry-over branch, so the bug
    // is sent back to the LLM on the next categorization run instead of being treated
    // as "already categorized as uncategorized".
    const bug = makeBugItem({ id: 60 })
    const signature = computeInputSignature(bug)
    const catalog: BugCatalog = {
      60: makeCatalogBug({
        id: 60,
        macroCategory: UNCATEGORIZED,
        technicalLayer: PROCESSING_ERROR,
        categoryReason: NOT_AVAILABLE,
        categorizedAt: '',
        inputSignature: signature
      })
    }

    const { updatedCatalog, sessionBugs } = mergeFetchIntoCatalog(
      [bug],
      catalog,
      '2026-01-01T00:00:00Z',
      new Set([bug.id])
    )

    expect(sessionBugs[0].macroCategory).toBe('')
    expect(sessionBugs[0].categorizedAt).toBe('')
    expect(updatedCatalog[60].macroCategory).toBe('')
    expect(updatedCatalog[60].categorizedAt).toBe('')
  })
})

describe('updateCatalogSimilarityMetadata', () => {
  it('bugs in groups get everInSimilarityGroup = true and lastSimilarityGroupAt updated', () => {
    const catalog: BugCatalog = {
      1: makeCatalogBug({ id: 1, everInSimilarityGroup: false, lastSimilarityGroupAt: null }),
      2: makeCatalogBug({ id: 2, everInSimilarityGroup: false, lastSimilarityGroupAt: null })
    }
    const similarityResult: SimilarityResult = {
      categories: [
        {
          macroCategory: 'Performance',
          groups: [{ similarityScore: 0.9, reason: 'Similar', bugIds: [1, 2] }]
        }
      ],
      analyzedAt: '2024-06-01T15:00:00Z'
    }

    const updated = updateCatalogSimilarityMetadata(catalog, similarityResult)

    expect(updated[1].everInSimilarityGroup).toBe(true)
    expect(updated[1].lastSimilarityGroupAt).toBe('2024-06-01T15:00:00Z')
    expect(updated[2].everInSimilarityGroup).toBe(true)
    expect(updated[2].lastSimilarityGroupAt).toBe('2024-06-01T15:00:00Z')
  })

  it('bugs not in groups remain unchanged', () => {
    const catalog: BugCatalog = {
      1: makeCatalogBug({ id: 1, everInSimilarityGroup: false, lastSimilarityGroupAt: null }),
      2: makeCatalogBug({ id: 2, everInSimilarityGroup: false, lastSimilarityGroupAt: null })
    }
    const similarityResult: SimilarityResult = {
      categories: [
        {
          macroCategory: 'UI',
          groups: [{ similarityScore: 0.8, reason: 'Related', bugIds: [1] }]
        }
      ],
      analyzedAt: '2024-06-01T15:00:00Z'
    }

    const updated = updateCatalogSimilarityMetadata(catalog, similarityResult)

    expect(updated[2].everInSimilarityGroup).toBe(false)
    expect(updated[2].lastSimilarityGroupAt).toBeNull()
  })

  it('bug already with everInSimilarityGroup = true keeps it true', () => {
    const catalog: BugCatalog = {
      1: makeCatalogBug({
        id: 1,
        everInSimilarityGroup: true,
        lastSimilarityGroupAt: '2024-01-01T00:00:00Z'
      })
    }
    const similarityResult: SimilarityResult = {
      categories: [
        {
          macroCategory: 'Performance',
          groups: [{ similarityScore: 0.95, reason: 'Still similar', bugIds: [1] }]
        }
      ],
      analyzedAt: '2024-07-01T00:00:00Z'
    }

    const updated = updateCatalogSimilarityMetadata(catalog, similarityResult)

    expect(updated[1].everInSimilarityGroup).toBe(true)
    expect(updated[1].lastSimilarityGroupAt).toBe('2024-07-01T00:00:00Z')
  })
})
