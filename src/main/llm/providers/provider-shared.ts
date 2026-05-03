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

export function createRequestTimeout(timeoutMs: number): {
  signal: AbortSignal
  dispose: () => void
} {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  return {
    signal: controller.signal,
    dispose: () => clearTimeout(timeout)
  }
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
