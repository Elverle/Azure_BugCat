import Anthropic from '@anthropic-ai/sdk'
import { ChatOptions, LLMProvider, LLMProviderConfig } from '../types'
import { getSchema } from '../schemas'
import {
  assertApiKey,
  createRequestTimeout,
  getProviderTimeout,
  getStructuredOutputMetadata,
  isAppError,
  TEST_CONNECTION_SYSTEM_PROMPT,
  TEST_CONNECTION_USER_MESSAGE,
  throwAppError
} from './provider-shared'

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic'
  private client: Anthropic

  constructor(private config: LLMProviderConfig) {
    this.client = new Anthropic({ apiKey: assertApiKey(config.apiKey, 'Anthropic') })
  }

  async chat(systemPrompt: string, userMessage: string, options?: ChatOptions): Promise<string> {
    const responseSchema = options?.responseSchema
    const responseSchemaMetadata = getStructuredOutputMetadata(responseSchema)
    const requestTimeout = createRequestTimeout(getProviderTimeout(this.config), options?.signal)

    try {
      const response = await this.client.messages.create(
        {
          model: this.config.model ?? 'claude-sonnet-4.6',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
          temperature: 0.1,
          ...(responseSchemaMetadata && {
            tools: [
              {
                name: responseSchemaMetadata.anthropicToolName,
                description: responseSchemaMetadata.anthropicToolDescription,
                input_schema: getSchema(responseSchema!) as unknown as Anthropic.Tool.InputSchema
              }
            ],
            tool_choice: {
              type: 'tool' as const,
              name: responseSchemaMetadata.anthropicToolName
            }
          })
        },
        { signal: requestTimeout.signal }
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
        if (!requestTimeout.didTimeout()) {
          throwAppError('OPERATION_CANCELLED', 'Categorizzazione annullata')
        }
        throwAppError('LLM_TIMEOUT', 'Timeout nella richiesta a Anthropic')
      }
      throwAppError(
        'UNKNOWN_ERROR',
        `Errore Anthropic: ${error instanceof Error ? error.message : 'sconosciuto'}`
      )
    } finally {
      requestTimeout.dispose()
    }
  }

  async testConnection(): Promise<void> {
    await this.chat(TEST_CONNECTION_SYSTEM_PROMPT, TEST_CONNECTION_USER_MESSAGE)
  }
}
