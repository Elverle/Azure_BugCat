import { createHash } from 'crypto'
import type {
  BugItem,
  CategorizedBug,
  CatalogBug,
  BugCatalog,
  SimilarityResult
} from '@shared/types'
import { isFailedCategorization } from '@shared/categorization'

export interface MergeResult {
  updatedCatalog: BugCatalog
  sessionBugs: CategorizedBug[]
  newBugCount: number
}

export function computeInputSignature(bug: BugItem): string {
  const parts = [
    bug.title.trim().toLowerCase(),
    bug.description.trim().toLowerCase(),
    (bug.tags ?? []).slice().sort().join(';'),
    // A missing ADO priority is represented as null (see ado-service.ts), but legacy
    // catalog entries persisted before that fix carry priority: 0. Folding null back
    // to 0 here keeps the signature stable across the fix, so existing catalogs are
    // not mass-invalidated (and re-categorized by the LLM) on the next fetch.
    String(bug.priority ?? 0),
    bug.areaPath.trim().toLowerCase()
  ]
  const input = parts.join('\0')
  return createHash('sha256').update(input).digest('hex').slice(0, 16)
}

export function mergeFetchIntoCatalog(
  fetchedBugs: BugItem[],
  existingCatalog: BugCatalog | null,
  now: string,
  closureScopeIds: Set<number> | null
): MergeResult {
  const catalog: BugCatalog = existingCatalog ? { ...existingCatalog } : {}
  const sessionBugs: CategorizedBug[] = []
  const fetchedIds = new Set<number>()
  let newBugCount = 0

  for (const bug of fetchedBugs) {
    fetchedIds.add(bug.id)
    const signature = computeInputSignature(bug)
    const existing = catalog[bug.id]

    if (existing && existing.inputSignature === signature && existing.categorizedAt) {
      // Signature matches and categorization exists — carry over
      catalog[bug.id] = {
        ...existing,
        ...bug,
        macroCategory: existing.macroCategory,
        subCategory: existing.subCategory,
        categoryReason: existing.categoryReason,
        categorizedAt: existing.categorizedAt,
        lastSeenAt: now,
        closedAt: null,
        inputSignature: signature
      }

      sessionBugs.push({
        ...bug,
        macroCategory: existing.macroCategory,
        subCategory: existing.subCategory,
        categoryReason: existing.categoryReason,
        categorizedAt: existing.categorizedAt
      })
    } else if (existing) {
      // Signature differs or categorizedAt is falsy — reset categorization
      catalog[bug.id] = {
        ...existing,
        ...bug,
        macroCategory: '',
        subCategory: '',
        categoryReason: '',
        categorizedAt: '',
        lastSeenAt: now,
        closedAt: null,
        inputSignature: signature
      }

      sessionBugs.push({
        ...bug,
        macroCategory: '',
        subCategory: '',
        categoryReason: '',
        categorizedAt: ''
      })
    } else {
      // New bug — not in catalog
      newBugCount += 1
      catalog[bug.id] = {
        ...bug,
        macroCategory: '',
        subCategory: '',
        categoryReason: '',
        categorizedAt: '',
        firstSeenAt: now,
        lastSeenAt: now,
        closedAt: null,
        inputSignature: signature,
        everInSimilarityGroup: false,
        lastSimilarityGroupAt: null
      }

      sessionBugs.push({
        ...bug,
        macroCategory: '',
        subCategory: '',
        categoryReason: '',
        categorizedAt: ''
      })
    }
  }

  // Mark catalog entries outside the full query result as closed.
  // closureScopeIds is the complete WIQL id set (not the topN-truncated fetch),
  // so entries beyond topN are never mistaken for closed bugs. A null scope
  // means the query changed since the last fetch — skip closure detection
  // entirely rather than closing the whole previous catalog.
  if (closureScopeIds) {
    for (const idStr of Object.keys(catalog)) {
      const id = Number(idStr)
      if (!fetchedIds.has(id) && !closureScopeIds.has(id) && catalog[id].closedAt === null) {
        catalog[id] = { ...catalog[id], closedAt: now }
      }
    }
  }

  return { updatedCatalog: catalog, sessionBugs, newBugCount }
}

export function mergeCategorization(
  sessionBugs: CategorizedBug[],
  llmResults: CategorizedBug[],
  catalog: BugCatalog,
  now: string
): { updatedSessionBugs: CategorizedBug[]; updatedCatalog: BugCatalog } {
  const llmMap = new Map<number, CategorizedBug>()
  for (const result of llmResults) {
    llmMap.set(result.id, result)
  }

  const updatedSessionBugs = sessionBugs.map((bug) => {
    const llmResult = llmMap.get(bug.id)
    if (llmResult) {
      return {
        ...bug,
        macroCategory: llmResult.macroCategory,
        subCategory: llmResult.subCategory,
        categoryReason: llmResult.categoryReason,
        categorizedAt: isFailedCategorization(llmResult.macroCategory) ? '' : now
      }
    }
    return { ...bug }
  })

  const updatedCatalog: BugCatalog = { ...catalog }
  for (const [id, llmResult] of llmMap) {
    if (updatedCatalog[id]) {
      const entry = updatedCatalog[id]
      const updatedEntry: CatalogBug = {
        ...entry,
        macroCategory: llmResult.macroCategory,
        subCategory: llmResult.subCategory,
        categoryReason: llmResult.categoryReason,
        categorizedAt: isFailedCategorization(llmResult.macroCategory) ? '' : now,
        inputSignature: computeInputSignature(entry)
      }
      updatedCatalog[id] = updatedEntry
    }
  }

  return { updatedSessionBugs, updatedCatalog }
}

export function updateCatalogSimilarityMetadata(
  catalog: BugCatalog,
  similarityResult: SimilarityResult
): BugCatalog {
  const updated: BugCatalog = { ...catalog }

  for (const category of similarityResult.categories) {
    for (const group of category.groups) {
      for (const bugId of group.bugIds) {
        if (updated[bugId]) {
          updated[bugId] = {
            ...updated[bugId],
            everInSimilarityGroup: true,
            lastSimilarityGroupAt: similarityResult.analyzedAt
          }
        }
      }
    }
  }

  return updated
}
