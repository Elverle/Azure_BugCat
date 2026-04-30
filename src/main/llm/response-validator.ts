import { BugItem, LLMCategorizeResult, LLMResponse } from '../../shared/types'

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/m, '')
    .replace(/\n?```\s*$/m, '')
    .trim()
}

export function validateLLMResponse(raw: string, chunkBugs: BugItem[]): LLMCategorizeResult[] {
  let parsed: LLMResponse
  const cleaned = stripMarkdownFences(raw)

  try {
    parsed = JSON.parse(cleaned) as LLMResponse
  } catch {
    console.error('LLM response parse error:', raw.slice(0, 200))
    return buildFallbackResults(chunkBugs, 'Non categorizzato', 'Errore parsing')
  }

  if (!parsed.results || !Array.isArray(parsed.results)) {
    console.error('LLM response missing results array')
    return buildFallbackResults(chunkBugs, 'Non categorizzato', 'Errore parsing')
  }

  const resultMap = new Map<number, LLMCategorizeResult>()

  for (const item of parsed.results) {
    if (typeof item.bugId !== 'number') continue

    resultMap.set(item.bugId, {
      bugId: item.bugId,
      macroCategory: item.macroCategory?.trim() || 'N/D',
      subCategory: item.subCategory?.trim() || 'N/D',
      categoryReason: item.categoryReason?.trim() || 'N/D'
    })
  }

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
