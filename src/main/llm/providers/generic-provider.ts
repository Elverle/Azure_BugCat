import { ChatOptions, LLMProvider, LLMProviderConfig } from '../types'
import {
  assertApiKey,
  getProviderTimeout,
  openAiCompatibleChat,
  TEST_CONNECTION_SYSTEM_PROMPT,
  TEST_CONNECTION_USER_MESSAGE,
  throwAppError
} from './provider-shared'

const DEFAULT_MODEL = 'gpt-4o'

/**
 * Unlike every other provider, this base URL is typed by the user, so it can
 * point at a web page instead of an API root. That mistake arrives as a 200
 * carrying HTML, which would otherwise be reported as a bare parse failure and
 * send the user looking for the wrong problem.
 */
function isLikelyHtmlResponse(response: Response, bodyText: string): boolean {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
    return true
  }

  const trimmed = bodyText.trimStart().toLowerCase()
  return trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html')
}

export class GenericProvider implements LLMProvider {
  readonly name = 'generic'
  readonly displayName = 'the generic provider'

  constructor(private config: LLMProviderConfig) {
    assertApiKey(config.apiKey, 'the generic provider')
    if (!config.baseUrl?.trim()) {
      throwAppError('UNKNOWN_ERROR', 'Base URL is missing for the generic provider')
    }
    // Enforce URL scheme at main-process boundary
    let parsed: URL
    try {
      parsed = new URL(config.baseUrl)
    } catch {
      throwAppError('UNKNOWN_ERROR', 'Invalid base URL for the generic provider')
    }
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    if (parsed.protocol !== 'https:' && !isLocalhost) {
      throwAppError('UNKNOWN_ERROR', 'Base URL must use HTTPS (http is allowed only for localhost)')
    }
  }

  async chat(systemPrompt: string, userMessage: string, options?: ChatOptions): Promise<string> {
    return openAiCompatibleChat(
      {
        baseUrl: this.config.baseUrl!,
        apiKey: this.config.apiKey!,
        model: this.config.model ?? DEFAULT_MODEL,
        timeoutMs: getProviderTimeout(this.config),
        displayName: this.displayName,
        errorPrefix: 'Generic provider error',
        onNonJsonResponse: ({ response, bodyText, url }) => {
          if (!isLikelyHtmlResponse(response, bodyText)) {
            return
          }

          throwAppError(
            'LLM_PARSE_ERROR',
            `The generic provider base URL is likely wrong: ${url} returned HTML instead of JSON. Make sure baseUrl points to an OpenAI-compatible API root, not a web page.`
          )
        }
      },
      systemPrompt,
      userMessage,
      options
    )
  }

  async testConnection(): Promise<void> {
    await this.chat(TEST_CONNECTION_SYSTEM_PROMPT, TEST_CONNECTION_USER_MESSAGE)
  }
}
