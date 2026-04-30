import { GoogleGenAI } from '@google/genai'
import { LLMProvider, LLMProviderConfig } from '../types'
import { AppError } from '../../../shared/types'

const REQUEST_TIMEOUT = 60000

function throwAppError(code: AppError['code'], message: string, details?: unknown): never {
  const err: AppError = { code, message, ...(details !== undefined && { details }) }
  throw err
}

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini'
  private client: GoogleGenAI

  constructor(private config: LLMProviderConfig) {
    if (!config.apiKey?.trim()) {
      throwAppError('LLM_AUTH_ERROR', 'API Key mancante per Gemini')
    }
    this.client = new GoogleGenAI({ apiKey: config.apiKey })
  }

  async chat(systemPrompt: string, userMessage: string): Promise<string> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    try {
      const response = await this.client.models.generateContent({
        model: this.config.model ?? 'gemini-2.5-flash',
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
          abortSignal: controller.signal
        }
      })

      const content = response.text
      if (!content) {
        throwAppError('LLM_PARSE_ERROR', 'Risposta vuota da Gemini')
      }
      return content
    } catch (error: unknown) {
      if (isAppError(error)) throw error
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
        throwAppError('LLM_RATE_LIMIT', 'Rate limit raggiunto per Gemini')
      }
      if (
        message.includes('401') ||
        message.includes('403') ||
        message.includes('API_KEY_INVALID')
      ) {
        throwAppError('LLM_AUTH_ERROR', 'Autenticazione non valida per gemini')
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throwAppError('LLM_TIMEOUT', 'Timeout nella richiesta a Gemini')
      }
      throwAppError('UNKNOWN_ERROR', `Errore Gemini: ${message}`)
    } finally {
      clearTimeout(timeout)
    }
  }

  async testConnection(): Promise<void> {
    await this.chat('You are a test assistant. Respond with: {"status":"ok"}', 'Test connection')
  }
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
