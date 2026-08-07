import { AppError } from '../../../shared/types'
import { ChatOptions, LLMProviderConfig } from '../types'

export const DEFAULT_PROVIDER_TIMEOUT_MS = 60000
export const TEST_CONNECTION_SYSTEM_PROMPT =
  'You are a test assistant. Respond with: {"status":"ok"}'
export const TEST_CONNECTION_USER_MESSAGE = 'Test connection'

export function throwAppError(code: AppError['code'], message: string, details?: unknown): never {
  const err: AppError = { code, message, ...(details !== undefined && { details }) }
  throw err
}

export function isAppError(error: unknown): error is AppError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    typeof (error as AppError).message === 'string'
  )
}

export function assertApiKey(apiKey: string | undefined, providerName: string): string {
  if (!apiKey?.trim()) {
    throwAppError('LLM_AUTH_ERROR', `API Key mancante per ${providerName}`)
  }

  return apiKey
}

export function getProviderTimeout(config: LLMProviderConfig): number {
  return config.timeout ?? DEFAULT_PROVIDER_TIMEOUT_MS
}

export function createRequestTimeout(
  timeoutMs: number,
  externalSignal?: AbortSignal
): {
  signal: AbortSignal
  dispose: () => void
  didTimeout: () => boolean
} {
  const controller = new AbortController()
  let timedOut = false
  const abortFromExternalSignal = (): void => {
    if (!controller.signal.aborted) {
      controller.abort(externalSignal?.reason)
    }
  }

  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort(new Error('timeout'))
  }, timeoutMs)

  if (externalSignal) {
    if (externalSignal.aborted) {
      abortFromExternalSignal()
    } else {
      externalSignal.addEventListener('abort', abortFromExternalSignal, { once: true })
    }
  }

  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout)
      externalSignal?.removeEventListener('abort', abortFromExternalSignal)
    },
    didTimeout: () => timedOut
  }
}

/**
 * Classifies an aborted request as a timeout or a user cancellation using the
 * abort signal's own state, never the thrown error's `.name`. The OpenAI and
 * Anthropic SDKs raise `APIUserAbortError` on abort, whose `.name` is
 * `'Error'` — matching on `error.name === 'AbortError'` is dead code for
 * those providers. `signal.aborted` is provider-agnostic and always true
 * when the abort actually happened, regardless of which library threw.
 *
 * No-op if the signal was never aborted, so callers can call this
 * unconditionally before falling through to their own error mapping.
 */
export function throwIfRequestAborted(
  requestTimeout: { didTimeout: () => boolean; signal: AbortSignal },
  providerLabel: string
): void {
  if (!requestTimeout.signal.aborted) return
  if (requestTimeout.didTimeout()) {
    throwAppError('LLM_TIMEOUT', `Timeout nella richiesta a ${providerLabel}`)
  }
  throwAppError('OPERATION_CANCELLED', 'Categorizzazione annullata')
}

export function getStructuredOutputMetadata(responseSchema: ChatOptions['responseSchema']): {
  schemaName: string
  anthropicToolName: string
  anthropicToolDescription: string
} | null {
  if (!responseSchema) {
    return null
  }

  if (responseSchema === 'categorization') {
    return {
      schemaName: 'bug_categorization',
      anthropicToolName: 'salva_risultati_triage',
      anthropicToolDescription: 'Salva i bug categorizzati'
    }
  }

  return {
    schemaName: 'similar_bugs_detection',
    anthropicToolName: 'salva_bug_simili',
    anthropicToolDescription: 'Salva i gruppi di bug simili'
  }
}
