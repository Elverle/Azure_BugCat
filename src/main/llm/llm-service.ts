import {
  AppError,
  AppSettings,
  BugItem,
  CategorizedBug,
  ChunkProgress,
  LLMCategorizeResult
} from '../../shared/types'
import { LLMProvider } from './types'
import { createLLMProvider } from './provider-factory'
import { buildSystemPrompt, buildUserMessage } from './prompts'
import { splitIntoChunks } from './chunking'
import { validateLLMResponse } from './response-validator'

const RETRY_DELAYS = [2000, 4000, 8000]

function isAppError(error: unknown): error is AppError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    typeof (error as AppError).message === 'string'
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function chatWithRetry(
  provider: LLMProvider,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  let lastError: unknown

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await provider.chat(systemPrompt, userMessage)
    } catch (error: unknown) {
      lastError = error
      if (isAppError(error) && error.code === 'LLM_RATE_LIMIT' && attempt < RETRY_DELAYS.length) {
        console.warn(
          `Rate limit hit, retrying in ${RETRY_DELAYS[attempt]}ms (attempt ${attempt + 1}/${RETRY_DELAYS.length})`
        )
        await sleep(RETRY_DELAYS[attempt])
        continue
      }
      throw error
    }
  }

  throw lastError
}

export interface ProgressCallback {
  (progress: ChunkProgress): void
}

export async function categorizeBugs(
  settings: AppSettings,
  bugs: BugItem[],
  onProgress?: ProgressCallback
): Promise<CategorizedBug[]> {
  const provider: LLMProvider = createLLMProvider(settings.llmProvider, {
    apiKey: settings.apiKey,
    timeout: 60000
  })

  const systemPrompt = buildSystemPrompt(settings.categories)
  const chunks = splitIntoChunks(bugs, settings.chunkSize)
  const allResults: LLMCategorizeResult[] = []
  let completed = 0

  for (const chunk of chunks) {
    let chunkResults: LLMCategorizeResult[]

    try {
      const userMessage = buildUserMessage(chunk)
      const raw = await chatWithRetry(provider, systemPrompt, userMessage)
      chunkResults = validateLLMResponse(raw, chunk)
    } catch (error: unknown) {
      if (isAppError(error) && (error.code === 'LLM_AUTH_ERROR' || error.code === 'LLM_TIMEOUT')) {
        throw error
      }
      console.error('Chunk processing error, marking bugs as non-categorized:', error)
      chunkResults = chunk.map((bug) => ({
        bugId: bug.id,
        macroCategory: 'Non categorizzato',
        subCategory: 'Errore elaborazione',
        categoryReason: 'N/D'
      }))
    }

    allResults.push(...chunkResults)
    completed++

    const categorizedChunk = applyCategorization(chunk, chunkResults)

    if (onProgress) {
      onProgress({
        total: chunks.length,
        completed,
        currentChunk: categorizedChunk
      })
    }
  }

  return applyCategorization(bugs, allResults)
}

function applyCategorization(bugs: BugItem[], results: LLMCategorizeResult[]): CategorizedBug[] {
  const resultMap = new Map<number, LLMCategorizeResult>()
  for (const r of results) {
    resultMap.set(r.bugId, r)
  }

  const now = new Date().toISOString()

  return bugs.map((bug) => {
    const result = resultMap.get(bug.id)
    return {
      ...bug,
      macroCategory: result?.macroCategory ?? 'Non categorizzato',
      subCategory: result?.subCategory ?? 'Nessuna risposta LLM',
      categoryReason: result?.categoryReason ?? 'N/D',
      categorizedAt: now
    }
  })
}

export async function testLLMConnection(settings: AppSettings): Promise<void> {
  const provider = createLLMProvider(settings.llmProvider, {
    apiKey: settings.apiKey,
    timeout: 60000
  })
  await provider.testConnection()
}
