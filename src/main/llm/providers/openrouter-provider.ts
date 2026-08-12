import { ChatOptions, LLMProvider, LLMProviderConfig } from '../types'
import {
  assertApiKey,
  getProviderTimeout,
  openAiCompatibleChat,
  TEST_CONNECTION_SYSTEM_PROMPT,
  TEST_CONNECTION_USER_MESSAGE,
  throwAppError
} from './provider-shared'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'openai/gpt-4o'
const RESPONSE_BODY_PREVIEW_LIMIT = 4000

/**
 * Attribution only — these place the app in the openrouter.ai rankings and
 * have no effect on routing or on the response. The title mirrors
 * `productName` in package.json.
 */
const ATTRIBUTION_HEADERS = {
  'HTTP-Referer': 'https://github.com/Elverle/Azure_BugCat',
  'X-Title': 'BugCat'
}

function toPreview(value: string): string {
  return value.length > RESPONSE_BODY_PREVIEW_LIMIT
    ? `${value.slice(0, RESPONSE_BODY_PREVIEW_LIMIT)}...`
    : value
}

/**
 * OpenRouter is a router, not a model host, so a request carrying
 * `response_format: json_schema` can fail for a reason no direct provider has:
 * no backend behind the chosen model honours structured outputs. It surfaces
 * either as a 404 announcing that no endpoint was found, or as an upstream
 * complaint that `response_format` arrived as plain `json` where `json_schema`
 * was expected — the second signature is quoted verbatim from a real failure.
 *
 * Retrying either one is pointless, which is why the caller has to be able to
 * tell them apart: `error-policy.ts` reads `details.reason` to stop the retry
 * ladder immediately instead of burning the budget on a routing decision that
 * will not change.
 */
function isStructuredOutputRoutingMismatch(status: number, bodyText: string): boolean {
  const text = bodyText.toLowerCase()

  if (status === 404 && text.includes('no endpoints found')) {
    return true
  }

  return (
    ((text.includes('response_format') && text.includes('json_schema')) ||
      text.includes('expected json_schema')) &&
    (text.includes("input': 'json'") ||
      text.includes('"input": "json"') ||
      text.includes('input: json') ||
      text.includes('expected json_schema') ||
      text.includes('"type":"json"') ||
      text.includes('"type": "json"') ||
      text.includes('\\"type\\":\\"json\\"'))
  )
}

export class OpenRouterProvider implements LLMProvider {
  readonly name = 'openrouter'
  readonly displayName = 'OpenRouter'

  constructor(private config: LLMProviderConfig) {
    assertApiKey(config.apiKey, 'OpenRouter')
  }

  async chat(systemPrompt: string, userMessage: string, options?: ChatOptions): Promise<string> {
    return openAiCompatibleChat(
      {
        baseUrl: OPENROUTER_BASE_URL,
        apiKey: this.config.apiKey!,
        model: this.config.model ?? DEFAULT_MODEL,
        timeoutMs: getProviderTimeout(this.config),
        displayName: this.displayName,
        errorPrefix: 'OpenRouter error',
        headers: ATTRIBUTION_HEADERS,
        // Without this the router is free to send a structured-output request
        // to a backend that ignores `response_format` and answers in free text.
        // The whole categorization pipeline rests on it.
        structuredOutputBody: { provider: { require_parameters: true } },
        onErrorResponse: ({ status, bodyText, responseSchema }) => {
          if (!responseSchema || !isStructuredOutputRoutingMismatch(status, bodyText)) {
            return
          }

          throwAppError(
            'LLM_PARSE_ERROR',
            'OpenRouter routed the request to a provider or model that does not properly support structured outputs with json_schema. Select a compatible model, or change the routing/provider.',
            {
              provider: 'openrouter',
              responseSchema,
              status,
              responseBodyPreview: toPreview(bodyText),
              reason: 'structured-output-routing-mismatch'
            }
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
