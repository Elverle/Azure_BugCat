import { isAppError, throwAppError } from '@shared/app-error'
import { ChatOptions, LLMProviderConfig } from '../types'
import { getSchema } from '../schemas'

// Re-exported so the providers keep a single import site for the whole
// AppError toolkit; the implementation lives in src/shared/app-error.ts.
export { isAppError, throwAppError } from '@shared/app-error'

export const DEFAULT_PROVIDER_TIMEOUT_MS = 60000
export const TEST_CONNECTION_SYSTEM_PROMPT =
  'You are a test assistant. Respond with: {"status":"ok"}'
export const TEST_CONNECTION_USER_MESSAGE = 'Test connection'

export function assertApiKey(apiKey: string | undefined, providerName: string): string {
  if (!apiKey?.trim()) {
    throwAppError('LLM_AUTH_ERROR', `API key is missing for ${providerName}`)
  }

  return apiKey
}

export function getProviderTimeout(config: LLMProviderConfig): number {
  return config.timeout ?? DEFAULT_PROVIDER_TIMEOUT_MS
}

export function createRequestTimeout(
  timeoutMs: number,
  externalSignal?: AbortSignal
): {
  signal: AbortSignal
  dispose: () => void
  didTimeout: () => boolean
} {
  const controller = new AbortController()
  let timedOut = false
  const abortFromExternalSignal = (): void => {
    if (!controller.signal.aborted) {
      controller.abort(externalSignal?.reason)
    }
  }

  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort(new Error('timeout'))
  }, timeoutMs)

  if (externalSignal) {
    if (externalSignal.aborted) {
      abortFromExternalSignal()
    } else {
      externalSignal.addEventListener('abort', abortFromExternalSignal, { once: true })
    }
  }

  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout)
      externalSignal?.removeEventListener('abort', abortFromExternalSignal)
    },
    didTimeout: () => timedOut
  }
}

/**
 * Classifies an aborted request as a timeout or a user cancellation using the
 * abort signal's own state, never the thrown error's `.name`. The OpenAI and
 * Anthropic SDKs raise `APIUserAbortError` on abort, whose `.name` is
 * `'Error'` — matching on `error.name === 'AbortError'` is dead code for
 * those providers. `signal.aborted` is provider-agnostic and always true
 * when the abort actually happened, regardless of which library threw.
 *
 * No-op if the signal was never aborted, so callers can call this
 * unconditionally before falling through to their own error mapping.
 */
export function throwIfRequestAborted(
  requestTimeout: { didTimeout: () => boolean; signal: AbortSignal },
  providerLabel: string
): void {
  if (!requestTimeout.signal.aborted) return
  if (requestTimeout.didTimeout()) {
    throwAppError('LLM_TIMEOUT', `Request to ${providerLabel} timed out`)
  }
  throwAppError('OPERATION_CANCELLED', 'Operation cancelled')
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
      anthropicToolName: 'save_triage_results',
      anthropicToolDescription: 'Save the categorized bugs'
    }
  }

  return {
    schemaName: 'similar_bugs_detection',
    anthropicToolName: 'save_similar_bugs',
    anthropicToolDescription: 'Save the groups of similar bugs'
  }
}

/** Everything an OpenAI-compatible provider has to decide before a call. */
export interface OpenAiCompatibleProfile {
  /** API root; `/chat/completions` is appended and trailing slashes are trimmed. */
  baseUrl: string
  apiKey: string
  model: string
  timeoutMs: number
  /** In-sentence provider name, interpolated into user-facing messages. */
  displayName: string
  /** Sentence opener for UNKNOWN_ERROR messages, e.g. `OpenRouter error`. */
  errorPrefix: string
  /** Merged after the mandatory Authorization and Content-Type headers. */
  headers?: Record<string, string>
  /** Top-level body fields sent only when a response schema is active. */
  structuredOutputBody?: Record<string, unknown>
  /**
   * Runs whenever a response cannot be turned into content — either because
   * the status failed or because a 2xx payload carried none. Throw an AppError
   * to classify a provider-specific failure; return to fall through to the
   * shared mapping.
   *
   * Both call sites matter: a router can report an upstream refusal inside a
   * 200 error envelope just as readily as behind a 4xx, and a provider that
   * only inspected the failing statuses would miss half of its own diagnosis.
   */
  onUnusableResponse?: (context: {
    status: number
    bodyText: string
    responseSchema?: ChatOptions['responseSchema']
  }) => void
  /** Same contract, for a body that did not parse as JSON. */
  onNonJsonResponse?: (context: { response: Response; bodyText: string; url: string }) => void
}

const RESPONSE_BODY_PREVIEW_LIMIT = 4000
const RESPONSE_BODY_EXCERPT_LIMIT = 200

export function toResponseBodyPreview(value: string): string {
  return value.length > RESPONSE_BODY_PREVIEW_LIMIT
    ? `${value.slice(0, RESPONSE_BODY_PREVIEW_LIMIT)}...`
    : value
}

/**
 * Turns a failing body into something worth showing the user. Only `code` and
 * `message` survive `encodeIpcError`, so a reason left in `details` never
 * reaches the screen — "HTTP 402 Payment Required" on its own tells the user
 * nothing they can act on, while "Insufficient credits" does.
 */
function describeErrorBody(bodyText: string): string {
  const trimmed = bodyText.trim()
  if (!trimmed) {
    return ''
  }

  let envelopeMessage: unknown
  try {
    envelopeMessage = (JSON.parse(trimmed) as { error?: { message?: unknown } })?.error?.message
  } catch {
    envelopeMessage = undefined
  }

  const text = typeof envelopeMessage === 'string' && envelopeMessage ? envelopeMessage : trimmed
  return text.length > RESPONSE_BODY_EXCERPT_LIMIT
    ? `${text.slice(0, RESPONSE_BODY_EXCERPT_LIMIT)}...`
    : text
}

/**
 * Extracts the assistant text from an OpenAI-compatible payload. The content
 * is a plain string on most providers, but a router can hand back the array of
 * `{type:'text',text}` parts its upstream produced, so both are accepted.
 */
function extractMessageContent(payload: unknown): string | null {
  if (payload === null || typeof payload !== 'object') {
    return null
  }

  const choices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) {
    return null
  }

  const content = (choices[0] as { message?: { content?: unknown } } | undefined)?.message?.content
  if (typeof content === 'string') {
    return content || null
  }

  if (!Array.isArray(content)) {
    return null
  }

  const text = content
    .map((item) => {
      if (typeof item === 'string') {
        return item
      }
      if (item !== null && typeof item === 'object' && 'text' in item) {
        const itemText = (item as { text?: unknown }).text
        return typeof itemText === 'string' ? itemText : ''
      }
      return ''
    })
    .join('')

  return text || null
}

/**
 * The chat call every OpenAI-compatible provider makes: POST
 * `{baseUrl}/chat/completions` with a Bearer key, read the body once, map the
 * status, parse, extract. Everything a specific provider needs on top of that
 * — extra headers, extra body fields, a sharper reading of a failing response —
 * arrives through the profile, so no provider has to own a copy of this.
 */
export async function openAiCompatibleChat(
  profile: OpenAiCompatibleProfile,
  systemPrompt: string,
  userMessage: string,
  options?: ChatOptions
): Promise<string> {
  const url = `${profile.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const responseSchema = options?.responseSchema
  const responseSchemaMetadata = getStructuredOutputMetadata(responseSchema)
  const requestTimeout = createRequestTimeout(profile.timeoutMs, options?.signal)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${profile.apiKey}`,
        'Content-Type': 'application/json',
        ...profile.headers
      },
      body: JSON.stringify({
        model: profile.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.1,
        ...(responseSchemaMetadata && {
          ...profile.structuredOutputBody,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: responseSchemaMetadata.schemaName,
              strict: true,
              schema: getSchema(responseSchema!)
            }
          }
        })
      }),
      signal: requestTimeout.signal
    })

    const bodyText = await response.text()

    if (!response.ok) {
      profile.onUnusableResponse?.({ status: response.status, bodyText, responseSchema })

      if (response.status === 401 || response.status === 403) {
        throwAppError('LLM_AUTH_ERROR', `Invalid authentication for ${profile.displayName}`)
      }
      if (response.status === 429) {
        throwAppError('LLM_RATE_LIMIT', `Rate limit reached for ${profile.displayName}`)
      }

      const reason = describeErrorBody(bodyText)
      throwAppError(
        'UNKNOWN_ERROR',
        `${profile.errorPrefix}: HTTP ${response.status} ${response.statusText}${reason ? ` — ${reason}` : ''}`,
        { status: response.status, responseBodyPreview: toResponseBodyPreview(bodyText) }
      )
    }

    let payload: unknown
    try {
      payload = JSON.parse(bodyText)
    } catch {
      profile.onNonJsonResponse?.({ response, bodyText, url })
      throwAppError('LLM_PARSE_ERROR', `Non-JSON response from ${profile.displayName}`)
    }

    const content = extractMessageContent(payload)
    if (!content) {
      profile.onUnusableResponse?.({ status: response.status, bodyText, responseSchema })
      throwAppError('LLM_PARSE_ERROR', `Empty response from ${profile.displayName}`, {
        status: response.status,
        responseBodyPreview: toResponseBodyPreview(bodyText)
      })
    }

    return content
  } catch (error: unknown) {
    if (isAppError(error)) throw error
    throwIfRequestAborted(requestTimeout, profile.displayName)
    throwAppError(
      'UNKNOWN_ERROR',
      `${profile.errorPrefix}: ${error instanceof Error ? error.message : 'unknown'}`
    )
  } finally {
    requestTimeout.dispose()
  }
}
