import OpenAI from 'openai'
import { ChatOptions, LLMProvider, LLMProviderConfig } from '../types'
import { getSchema } from '../schemas'
import { AppError } from '../../../shared/types'

const REQUEST_TIMEOUT = 60000

function throwAppError(code: AppError['code'], message: string, details?: unknown): never {
  const err: AppError = { code, message, ...(details !== undefined && { details }) }
  throw err
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai'
  private client: OpenAI

  constructor(private config: LLMProviderConfig) {
    if (!config.apiKey?.trim()) {
      throwAppError('LLM_AUTH_ERROR', 'API Key mancante per OpenAI')
    }
    this.client = new OpenAI({ apiKey: config.apiKey })
  }

  async chat(systemPrompt: string, userMessage: string, options?: ChatOptions): Promise<string> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    try {
      const response = await this.client.chat.completions.create(
        {
          model: this.config.model ?? 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.1,
          ...(options?.responseSchema && {
            response_format: {
              type: 'json_schema' as const,
              json_schema: {
                name:
                  options.responseSchema === 'categorization'
                    ? 'bug_categorization'
                    : 'similar_bugs_detection',
                strict: true,
                schema: getSchema(options.responseSchema)
              }
            }
          })
        },
        { signal: controller.signal }
      )

      const content = response.choices[0]?.message?.content
      if (!content) {
        throwAppError('LLM_PARSE_ERROR', 'Risposta vuota da OpenAI')
      }
      return content
    } catch (error: unknown) {
      if (isAppError(error)) throw error
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          throwAppError('LLM_RATE_LIMIT', 'Rate limit raggiunto per OpenAI')
        }
        if (error.status === 401 || error.status === 403) {
          throwAppError('LLM_AUTH_ERROR', 'Autenticazione non valida per openai')
        }
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throwAppError('LLM_TIMEOUT', 'Timeout nella richiesta a OpenAI')
      }
      throwAppError(
        'UNKNOWN_ERROR',
        `Errore OpenAI: ${error instanceof Error ? error.message : 'sconosciuto'}`
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
