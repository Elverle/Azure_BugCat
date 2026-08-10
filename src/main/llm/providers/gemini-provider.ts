import { GoogleGenAI } from '@google/genai'
import { ChatOptions, LLMProvider, LLMProviderConfig } from '../types'
import { getSchema } from '../schemas'
import {
  assertApiKey,
  createRequestTimeout,
  getProviderTimeout,
  isAppError,
  TEST_CONNECTION_SYSTEM_PROMPT,
  TEST_CONNECTION_USER_MESSAGE,
  throwAppError,
  throwIfRequestAborted
} from './provider-shared'

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini'
  readonly displayName = 'Gemini'
  private client: GoogleGenAI

  constructor(private config: LLMProviderConfig) {
    this.client = new GoogleGenAI({ apiKey: assertApiKey(config.apiKey, 'Gemini') })
  }

  async chat(systemPrompt: string, userMessage: string, options?: ChatOptions): Promise<string> {
    const requestTimeout = createRequestTimeout(getProviderTimeout(this.config), options?.signal)

    try {
      const response = await this.client.models.generateContent({
        model: this.config.model ?? 'gemini-2.5-flash',
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
          abortSignal: requestTimeout.signal,
          temperature: 0.1,
          ...(options?.responseSchema && {
            responseMimeType: 'application/json',
            responseSchema: getSchema(options.responseSchema)
          })
        }
      })

      const content = response.text
      if (!content) {
        throwAppError('LLM_PARSE_ERROR', 'Empty response from Gemini')
      }
      return content
    } catch (error: unknown) {
      if (isAppError(error)) throw error
      throwIfRequestAborted(requestTimeout, 'Gemini')
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
        throwAppError('LLM_RATE_LIMIT', 'Rate limit reached for Gemini')
      }
      if (
        message.includes('401') ||
        message.includes('403') ||
        message.includes('API_KEY_INVALID')
      ) {
        throwAppError('LLM_AUTH_ERROR', 'Invalid authentication for Gemini')
      }
      throwAppError('UNKNOWN_ERROR', `Gemini error: ${message}`)
    } finally {
      requestTimeout.dispose()
    }
  }

  async testConnection(): Promise<void> {
    await this.chat(TEST_CONNECTION_SYSTEM_PROMPT, TEST_CONNECTION_USER_MESSAGE)
  }
}
