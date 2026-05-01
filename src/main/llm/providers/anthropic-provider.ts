import Anthropic from '@anthropic-ai/sdk'
import { ChatOptions, LLMProvider, LLMProviderConfig } from '../types'
import { getSchema } from '../schemas'
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

  async chat(systemPrompt: string, userMessage: string, options?: ChatOptions): Promise<string> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    try {
      const toolName =
        options?.responseSchema === 'categorization' ? 'salva_risultati_triage' : 'salva_bug_simili'
      const toolDescription =
        options?.responseSchema === 'categorization'
          ? 'Salva i bug categorizzati'
          : 'Salva i gruppi di bug simili'

      const response = await this.client.messages.create(
        {
          model: this.config.model ?? 'claude-sonnet-4.6',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
          temperature: 0.1,
          ...(options?.responseSchema && {
            tools: [
              {
                name: toolName,
                description: toolDescription,
                input_schema: getSchema(
                  options.responseSchema
                ) as unknown as Anthropic.Tool.InputSchema
              }
            ],
            tool_choice: { type: 'tool' as const, name: toolName }
          })
        },
        { signal: controller.signal }
      )

      const toolUseBlock = response.content.find((block) => block.type === 'tool_use')
      if (toolUseBlock && toolUseBlock.type === 'tool_use') {
        return JSON.stringify(toolUseBlock.input)
      }

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
