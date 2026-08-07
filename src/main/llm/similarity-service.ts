import {
  AppSettings,
  CategorizedBug,
  CategorySimilarityResult,
  SimilarityGroup,
  SimilarityProgress,
  SimilarityResult
} from '../../shared/types'
import { LLMProvider } from './types'
import { createLLMProvider } from './provider-factory'
import { buildSimilarBugsSystemPrompt, buildSimilarBugsUserMessage } from './prompts'
import { chatWithRetry } from './llm-service'
import { isBlockingLLMError } from './error-policy'
import { parseLlmJson } from './llm-json'
import { extractErrorMessage, isAppError } from '@shared/app-error'

export interface SimilarityProgressCallback {
  (progress: SimilarityProgress): void
}

export async function findSimilarBugs(
  settings: AppSettings,
  bugs: CategorizedBug[],
  onProgress?: SimilarityProgressCallback
): Promise<SimilarityResult> {
  const provider: LLMProvider = createLLMProvider(settings.llmProvider, {
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
    model: settings.llmModel,
    timeout: 60000
  })

  // Group bugs by macroCategory (skip empty/non-categorized)
  const groupedByCategory = new Map<string, CategorizedBug[]>()
  for (const bug of bugs) {
    if (!bug.macroCategory || bug.macroCategory === 'Non categorizzato') continue
    const existing = groupedByCategory.get(bug.macroCategory) ?? []
    existing.push(bug)
    groupedByCategory.set(bug.macroCategory, existing)
  }

  // Filter to groups with ≥2 bugs
  const eligibleGroups = [...groupedByCategory.entries()].filter(
    ([, groupBugs]) => groupBugs.length >= 2
  )

  const systemPrompt = buildSimilarBugsSystemPrompt()
  const categories: CategorySimilarityResult[] = []
  let completed = 0
  const total = eligibleGroups.length

  for (const [macroCategory, groupBugs] of eligibleGroups) {
    try {
      const userMessage = buildSimilarBugsUserMessage(
        groupBugs.map((b) => ({
          id: b.id,
          title: b.title,
          description: b.description,
          macroCategory: b.macroCategory
        }))
      )

      const raw = await chatWithRetry(provider, systemPrompt, userMessage, {
        responseSchema: 'similar-bugs'
      })

      const parsed = parseSimilarityResponse(raw)
      categories.push({ macroCategory, groups: parsed })
    } catch (error: unknown) {
      if (isAppError(error) && isBlockingLLMError(error)) {
        throw error
      }

      categories.push({ macroCategory, groups: [], error: extractErrorMessage(error) })
    }

    completed++
    if (onProgress) {
      onProgress({ total, completed, currentGroup: macroCategory })
    }
  }

  return {
    categories,
    analyzedAt: new Date().toISOString()
  }
}

function parseSimilarityResponse(raw: string): SimilarityGroup[] {
  const parsed = parseLlmJson(raw)

  if (parsed === null) {
    throw new SyntaxError('Invalid JSON in similarity response')
  }

  const groups = (parsed as { groups?: unknown }).groups
  if (!Array.isArray(groups)) {
    console.warn('[Similarity] LLM response missing groups array, treating as empty')
    return []
  }

  // Validate and filter each group
  return groups.filter(
    (g: unknown): g is SimilarityGroup =>
      g !== null &&
      typeof g === 'object' &&
      'similarityScore' in g &&
      'reason' in g &&
      'bugIds' in g &&
      typeof (g as SimilarityGroup).similarityScore === 'number' &&
      (g as SimilarityGroup).similarityScore >= 0 &&
      (g as SimilarityGroup).similarityScore <= 1 &&
      typeof (g as SimilarityGroup).reason === 'string' &&
      Array.isArray((g as SimilarityGroup).bugIds) &&
      (g as SimilarityGroup).bugIds.length >= 2 &&
      (g as SimilarityGroup).bugIds.every((id) => typeof id === 'number')
  )
}
