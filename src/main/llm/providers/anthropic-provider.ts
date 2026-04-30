import Anthropic from '@anthropic-ai/sdk'
import { LLMProvider, LLMProviderConfig } from '../types'
import { AppError } from '../../../shared/types'

const REQUEST_TIMEOUT = 60000

function throwAppError(code: AppError['code'], message: string, details?: unknown): never {
  const err: AppError = { code, message, ...(details !== undefined && { details }) }
  throw err
}

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic'
  private client: Anthropic

  constructor(private config: LLMProviderConfig) {
    if (!config.apiKey?.trim()) {
      throwAppError('LLM_AUTH_ERROR', 'API Key mancante per Anthropic')
    }
    this.client = new Anthropic({ apiKey: config.apiKey })
  }

  async chat(systemPrompt: string, userMessage: string): Promise<string> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    try {
      const response = await this.client.messages.create(
        {
          model: this.config.model ?? 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }]
        },
        { signal: controller.signal }
      )

      const textBlock = response.content.find((block) => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throwAppError('LLM_PARSE_ERROR', 'Risposta vuota da Anthropic')
      }
      return textBlock.text
    } catch (error: unknown) {
      if (isAppError(error)) throw error
      if (error instanceof Anthropic.APIError) {
        if (error.status === 429) {
          throwAppError('LLM_RATE_LIMIT', 'Rate limit raggiunto per Anthropic')
        }
        if (error.status === 401 || error.status === 403) {
          throwAppError('LLM_AUTH_ERROR', 'Autenticazione non valida per anthropic')
        }
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throwAppError('LLM_TIMEOUT', 'Timeout nella richiesta a Anthropic')
      }
      throwAppError(
        'UNKNOWN_ERROR',
        `Errore Anthropic: ${error instanceof Error ? error.message : 'sconosciuto'}`
      )
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
