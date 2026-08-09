import OpenAI from 'openai'
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
  throwAppError,
  throwIfRequestAborted
} from './provider-shared'

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai'
  readonly displayName = 'OpenAI'
  private client: OpenAI

  constructor(private config: LLMProviderConfig) {
    this.client = new OpenAI({ apiKey: assertApiKey(config.apiKey, 'OpenAI') })
  }

  async chat(systemPrompt: string, userMessage: string, options?: ChatOptions): Promise<string> {
    const responseSchema = options?.responseSchema
    const responseSchemaMetadata = getStructuredOutputMetadata(responseSchema)
    const requestTimeout = createRequestTimeout(getProviderTimeout(this.config), options?.signal)

    try {
      const response = await this.client.chat.completions.create(
        {
          model: this.config.model ?? 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.1,
          ...(responseSchemaMetadata && {
            response_format: {
              type: 'json_schema' as const,
              json_schema: {
                name: responseSchemaMetadata.schemaName,
                strict: true,
                schema: getSchema(responseSchema!)
              }
            }
          })
        },
        { signal: requestTimeout.signal }
      )

      const content = response.choices[0]?.message?.content
      if (!content) {
        throwAppError('LLM_PARSE_ERROR', 'Empty response from OpenAI')
      }
      return content
    } catch (error: unknown) {
      if (isAppError(error)) throw error
      throwIfRequestAborted(requestTimeout, 'OpenAI')
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          throwAppError('LLM_RATE_LIMIT', 'Rate limit reached for OpenAI')
        }
        if (error.status === 401 || error.status === 403) {
          throwAppError('LLM_AUTH_ERROR', 'Invalid authentication for OpenAI')
        }
      }
      throwAppError(
        'UNKNOWN_ERROR',
        `OpenAI error: ${error instanceof Error ? error.message : 'unknown'}`
      )
    } finally {
      requestTimeout.dispose()
    }
  }

  async testConnection(): Promise<void> {
    await this.chat(TEST_CONNECTION_SYSTEM_PROMPT, TEST_CONNECTION_USER_MESSAGE)
  }
}
