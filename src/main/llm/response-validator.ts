import { BugItem, LLMCategorizeResult, LLMResponse } from '../../shared/types'
import { parseLlmJson } from './llm-json'
import { normalizeTechnicalLayer } from './technical-layer'

const RAW_PREVIEW_LENGTH = 1200

function getResultItems(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) {
    return parsed
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const candidate = parsed as {
    results?: unknown
    items?: unknown
    data?: unknown
  }

  if (Array.isArray(candidate.results)) {
    return candidate.results
  }

  if (Array.isArray(candidate.items)) {
    return candidate.items
  }

  if (candidate.data && typeof candidate.data === 'object') {
    const nestedData = candidate.data as { results?: unknown; items?: unknown }
    if (Array.isArray(nestedData.results)) {
      return nestedData.results
    }
    if (Array.isArray(nestedData.items)) {
      return nestedData.items
    }
  }

  return null
}

function normalizeBugId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function getStringField(value: unknown, fallback = 'N/D'): string {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()
  return trimmed || fallback
}

function buildRawPreview(raw: string): string {
  const normalized = raw.replace(/\s+/g, ' ').trim()
  return normalized.length > RAW_PREVIEW_LENGTH
    ? `${normalized.slice(0, RAW_PREVIEW_LENGTH)}...`
    : normalized
}

function logValidationFailure(reason: string, raw: string, chunkBugs: BugItem[]): void {
  console.warn('[LLM] Response validation fallback', {
    reason,
    bugIds: chunkBugs.map((bug) => bug.id),
    rawPreview: buildRawPreview(raw)
  })
}

function logMissingBugResults(
  raw: string,
  chunkBugs: BugItem[],
  resultMap: Map<number, LLMCategorizeResult>
): void {
  const missingBugIds = chunkBugs.map((bug) => bug.id).filter((bugId) => !resultMap.has(bugId))

  if (missingBugIds.length === 0) {
    return
  }

  console.warn('[LLM] Response did not include all bugs from the chunk', {
    expectedBugIds: chunkBugs.map((bug) => bug.id),
    returnedBugIds: [...resultMap.keys()],
    missingBugIds,
    rawPreview: buildRawPreview(raw)
  })
}

export function validateLLMResponse(raw: string, chunkBugs: BugItem[]): LLMCategorizeResult[] {
  const parsed = parseLlmJson(raw) as LLMResponse | null

  if (parsed === null) {
    logValidationFailure('invalid-json', raw, chunkBugs)
    return buildFallbackResults(chunkBugs, 'Non categorizzato', 'Errore parsing')
  }

  const resultItems = getResultItems(parsed)
  if (!resultItems) {
    logValidationFailure('missing-results-array', raw, chunkBugs)
    return buildFallbackResults(chunkBugs, 'Non categorizzato', 'Errore parsing')
  }

  const resultMap = new Map<number, LLMCategorizeResult>()

  for (const item of resultItems) {
    if (!item || typeof item !== 'object') continue

    const result = item as {
      bugId?: unknown
      bugID?: unknown
      id?: unknown
      bug_id?: unknown
      macroCategory?: unknown
      macro_category?: unknown
      category?: unknown
      macro?: unknown
      subCategory?: unknown
      sub_category?: unknown
      subcategory?: unknown
      reason?: unknown
      categoryReason?: unknown
      category_reason?: unknown
    }

    const bugId = normalizeBugId(result.bugId ?? result.bugID ?? result.id ?? result.bug_id)
    if (bugId === null) continue

    resultMap.set(bugId, {
      bugId,
      macroCategory: getStringField(
        result.macroCategory ?? result.macro_category ?? result.category ?? result.macro
      ),
      subCategory: normalizeTechnicalLayer(
        result.subCategory ?? result.sub_category ?? result.subcategory
      ),
      categoryReason: getStringField(
        result.categoryReason ?? result.category_reason ?? result.reason
      )
    })
  }

  logMissingBugResults(raw, chunkBugs, resultMap)

  const results: LLMCategorizeResult[] = []
  for (const bug of chunkBugs) {
    const match = resultMap.get(bug.id)
    if (match) {
      results.push(match)
    } else {
      results.push({
        bugId: bug.id,
        macroCategory: 'Non categorizzato',
        subCategory: 'Nessuna risposta LLM',
        categoryReason: 'N/D'
      })
    }
  }

  return results
}

function buildFallbackResults(
  bugs: BugItem[],
  macroCategory: string,
  subCategory: string
): LLMCategorizeResult[] {
  return bugs.map((bug) => ({
    bugId: bug.id,
    macroCategory,
    subCategory,
    categoryReason: 'N/D'
  }))
}
