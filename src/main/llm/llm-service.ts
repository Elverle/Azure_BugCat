import {
  AppError,
  AppSettings,
  BugItem,
  CategorizedBug,
  ChunkProgress,
  LLMCategorizeResult
} from '../../shared/types'
import { LLMProvider, ChatOptions } from './types'
import { createLLMProvider } from './provider-factory'
import { buildSystemPrompt, buildUserMessage } from './prompts'
import { splitIntoChunks } from './chunking'
import { validateLLMResponse } from './response-validator'
import { isBlockingLLMError } from './error-policy'

const RETRY_DELAYS = [2000, 4000, 8000]
const MAX_TITLE_LOG_LENGTH = 120

function throwAppError(code: AppError['code'], message: string, details?: unknown): never {
  const err: AppError = { code, message, ...(details !== undefined && { details }) }
  throw err
}

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

function buildCancellationError(): AppError {
  return {
    code: 'OPERATION_CANCELLED',
    message: 'Categorizzazione annullata'
  }
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw buildCancellationError()
  }
}

function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) {
    return sleep(ms)
  }

  if (signal.aborted) {
    return Promise.reject(buildCancellationError())
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup()
      resolve()
    }, ms)

    const onAbort = (): void => {
      cleanup()
      reject(buildCancellationError())
    }

    const cleanup = (): void => {
      clearTimeout(timeout)
      signal.removeEventListener('abort', onAbort)
    }

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function isAbortLikeError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') {
    return true
  }

  if (error !== null && typeof error === 'object' && 'name' in error) {
    return (error as { name?: unknown }).name === 'AbortError'
  }

  if (typeof error === 'string') {
    return error.includes('AbortError') || error.includes('aborted')
  }

  return false
}

function buildErrorDiagnostics(error: unknown): Record<string, unknown> {
  if (isAppError(error)) {
    return {
      type: 'AppError',
      code: error.code,
      message: error.message,
      details: error.details
    }
  }

  if (error instanceof Error) {
    return {
      type: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    }
  }

  if (error !== null && typeof error === 'object') {
    return { type: 'object', value: error }
  }

  return { type: typeof error, value: error }
}

function buildChunkDiagnostics(
  providerName: string,
  chunk: BugItem[],
  chunkIndex: number,
  totalChunks: number
): Record<string, unknown> {
  return {
    provider: providerName,
    chunkIndex: chunkIndex + 1,
    totalChunks,
    bugIds: chunk.map((bug) => bug.id),
    bugTitles: chunk.map((bug) =>
      bug.title.length > MAX_TITLE_LOG_LENGTH
        ? `${bug.title.slice(0, MAX_TITLE_LOG_LENGTH)}...`
        : bug.title
    )
  }
}

export async function chatWithRetry(
  provider: LLMProvider,
  systemPrompt: string,
  userMessage: string,
  options?: ChatOptions
): Promise<string> {
  let lastError: unknown

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      throwIfCancelled(options?.signal)
      return await provider.chat(systemPrompt, userMessage, options)
    } catch (error: unknown) {
      lastError = error
      if (isAppError(error) && error.code === 'OPERATION_CANCELLED') {
        throw error
      }
      if (isAbortLikeError(error)) {
        if (options?.signal?.aborted) {
          throw buildCancellationError()
        }
        throwAppError('LLM_TIMEOUT', `Timeout nella richiesta al provider ${provider.name}`, {
          provider: provider.name,
          attempt: attempt + 1,
          originalError: buildErrorDiagnostics(error)
        })
      }

      if (isAppError(error) && error.code === 'LLM_RATE_LIMIT' && attempt < RETRY_DELAYS.length) {
        console.warn(
          `[LLM] Rate limit hit for ${provider.name}, retrying in ${RETRY_DELAYS[attempt]}ms (attempt ${attempt + 1}/${RETRY_DELAYS.length})`
        )
        await sleepWithAbort(RETRY_DELAYS[attempt], options?.signal)
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
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<CategorizedBug[]> {
  const provider: LLMProvider = createLLMProvider(settings.llmProvider, {
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl,
    model: settings.llmModel,
    timeout: 60000
  })

  const systemPrompt = buildSystemPrompt(settings.categories)
  const chunks = splitIntoChunks(bugs, settings.chunkSize)
  const allResults: LLMCategorizeResult[] = []
  let completed = 0

  for (const [chunkIndex, chunk] of chunks.entries()) {
    throwIfCancelled(signal)

    let chunkResults: LLMCategorizeResult[]
    const chunkDiagnostics = buildChunkDiagnostics(provider.name, chunk, chunkIndex, chunks.length)

    try {
      const userMessage = buildUserMessage(chunk)
      const raw = await chatWithRetry(provider, systemPrompt, userMessage, {
        responseSchema: 'categorization',
        signal
      })
      chunkResults = validateLLMResponse(raw, chunk)
    } catch (error: unknown) {
      const normalizedError = isAbortLikeError(error)
        ? signal?.aborted
          ? buildCancellationError()
          : ({
              code: 'LLM_TIMEOUT',
              message: `Timeout nella richiesta al provider ${provider.name}`,
              details: {
                provider: provider.name,
                originalError: buildErrorDiagnostics(error)
              }
            } satisfies AppError)
        : error

      if (isAppError(normalizedError) && normalizedError.code === 'OPERATION_CANCELLED') {
        throw normalizedError
      }

      if (isAppError(normalizedError) && isBlockingLLMError(normalizedError)) {
        console.error('[LLM] Chunk failed with blocking error', {
          ...chunkDiagnostics,
          error: buildErrorDiagnostics(normalizedError)
        })
        throw normalizedError
      }

      console.error('[LLM] Chunk processing error, marking bugs as non-categorized', {
        ...chunkDiagnostics,
        error: buildErrorDiagnostics(normalizedError)
      })

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
    baseUrl: settings.baseUrl,
    model: settings.llmModel,
    timeout: 60000
  })
  await provider.testConnection()
}
