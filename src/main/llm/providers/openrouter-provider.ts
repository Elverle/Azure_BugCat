import { OpenRouter } from '@openrouter/sdk'
import { ChatOptions, LLMProvider, LLMProviderConfig } from '../types'
import { getSchema } from '../schemas'
import {
  assertApiKey,
  getProviderTimeout,
  getStructuredOutputMetadata,
  isAppError,
  TEST_CONNECTION_SYSTEM_PROMPT,
  TEST_CONNECTION_USER_MESSAGE,
  throwAppError
} from './provider-shared'

const RESPONSE_BODY_PREVIEW_LIMIT = 4000

function toPreview(value: string): string {
  return value.length > RESPONSE_BODY_PREVIEW_LIMIT
    ? `${value.slice(0, RESPONSE_BODY_PREVIEW_LIMIT)}...`
    : value
}

function extractOpenRouterContent(payload: unknown): string | null {
  if (payload === null || typeof payload !== 'object') {
    return null
  }

  const choices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) {
    return null
  }

  const content = (choices[0] as { message?: { content?: unknown } } | undefined)?.message?.content
  if (typeof content === 'string') {
    return content
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
        return typeof (item as { text?: unknown }).text === 'string'
          ? (item as { text: string }).text
          : ''
      }
      return ''
    })
    .join('')

  return text || null
}

function tryRecoverValidationErrorContent(error: unknown): string | null {
  if (
    error === null ||
    typeof error !== 'object' ||
    (error as { name?: unknown }).name !== 'ResponseValidationError'
  ) {
    return null
  }

  const rawValueContent = extractOpenRouterContent((error as { rawValue?: unknown }).rawValue)
  if (rawValueContent) {
    return rawValueContent
  }

  const body = (error as { body?: unknown }).body
  if (typeof body !== 'string') {
    return null
  }

  try {
    return extractOpenRouterContent(JSON.parse(body))
  } catch {
    return null
  }
}

function buildResponseValidationDetails(
  error: Error & {
    body?: unknown
    rawValue?: unknown
    pretty?: () => string
  },
  responseSchema?: ChatOptions['responseSchema'],
  requestDetails?: Record<string, unknown>
): Record<string, unknown> {
  const body = typeof error.body === 'string' ? error.body : null
  const recoveredFromRawValue = extractOpenRouterContent(error.rawValue)
  const recoveredFromBody =
    body !== null
      ? (() => {
          try {
            return extractOpenRouterContent(JSON.parse(body))
          } catch {
            return null
          }
        })()
      : null

  return {
    provider: 'openrouter',
    responseSchema: responseSchema ?? null,
    request: requestDetails ?? null,
    sdkErrorName: error.name,
    sdkMessage: error.message,
    sdkPrettyMessage: typeof error.pretty === 'function' ? error.pretty() : null,
    recoveredFromRawValue,
    recoveredFromBody,
    rawValue: error.rawValue ?? null,
    responseBodyPreview: body ? toPreview(body) : null
  }
}

function buildResponseValidationText(
  error: Error & {
    body?: unknown
    pretty?: () => string
  }
): string {
  const parts = [error.message]

  if (typeof error.pretty === 'function') {
    parts.push(error.pretty())
  }

  if (typeof error.body === 'string') {
    parts.push(error.body)
  }

  return parts.join('\n').toLowerCase()
}

function isStructuredOutputRoutingMismatch(
  error: Error & {
    body?: unknown
    pretty?: () => string
  },
  responseSchema?: ChatOptions['responseSchema']
): boolean {
  if (!responseSchema) {
    return false
  }

  const text = buildResponseValidationText(error)
  const hasResponseFormatMismatch =
    ((text.includes('response_format') && text.includes('json_schema')) ||
      text.includes('expected json_schema')) &&
    (text.includes("input': 'json'") ||
      text.includes('"input": "json"') ||
      text.includes('input: json') ||
      text.includes('expected json_schema') ||
      text.includes('"type":"json"') ||
      text.includes('"type": "json"') ||
      text.includes('\\"type\\":\\"json\\"'))

  return hasResponseFormatMismatch
}

function buildStructuredRequestDetails(
  request: {
    model?: string
    messages: Array<{ role: 'system' | 'user'; content: string }>
    temperature?: number
    stream?: boolean
    provider?: { requireParameters?: boolean }
    responseFormat?: {
      type: 'json_schema'
      jsonSchema: {
        name: string
        strict?: boolean
        schema?: Record<string, unknown>
      }
    }
  },
  responseSchema?: ChatOptions['responseSchema']
): Record<string, unknown> {
  const requestBody = {
    model: request.model,
    messages: request.messages,
    temperature: request.temperature,
    stream: request.stream,
    ...(request.provider && {
      provider: {
        require_parameters: request.provider.requireParameters ?? false
      }
    }),
    ...(request.responseFormat && {
      response_format: {
        type: request.responseFormat.type,
        json_schema: {
          name: request.responseFormat.jsonSchema.name,
          strict: request.responseFormat.jsonSchema.strict ?? false,
          schema: request.responseFormat.jsonSchema.schema
        }
      }
    })
  }

  return {
    provider: 'openrouter',
    responseSchema: responseSchema ?? null,
    requestBody,
    requestBodyPreview: toPreview(JSON.stringify(requestBody))
  }
}

export class OpenRouterProvider implements LLMProvider {
  readonly name = 'openrouter'
  private client: OpenRouter

  constructor(private config: LLMProviderConfig) {
    this.client = new OpenRouter({ apiKey: assertApiKey(config.apiKey, 'OpenRouter') })
  }

  async chat(systemPrompt: string, userMessage: string, options?: ChatOptions): Promise<string> {
    const responseSchemaMetadata = getStructuredOutputMetadata(options?.responseSchema)
    const chatRequest = {
      model: this.config.model ?? 'openai/gpt-4o',
      messages: [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userMessage }
      ],
      temperature: 0.1,
      stream: false,
      ...(responseSchemaMetadata && {
        provider: {
          requireParameters: true
        },
        responseFormat: {
          type: 'json_schema' as const,
          jsonSchema: {
            name: responseSchemaMetadata.schemaName,
            strict: true,
            schema: getSchema(options.responseSchema!) as Record<string, unknown>
          }
        }
      })
    }
    const structuredRequestDetails = options?.responseSchema
      ? buildStructuredRequestDetails(chatRequest, options.responseSchema)
      : null

    try {
      const response = await this.client.chat.send(
        {
          chatRequest
        },
        { timeoutMs: getProviderTimeout(this.config) }
      )

      const content = extractOpenRouterContent(response)
      if (!content) {
        throwAppError('LLM_PARSE_ERROR', 'Risposta vuota da OpenRouter')
      }
      return content
    } catch (error: unknown) {
      if (isAppError(error)) throw error

      const recoveredContent = tryRecoverValidationErrorContent(error)
      if (recoveredContent) {
        return recoveredContent
      }

      if (error instanceof Error && error.name === 'ResponseValidationError') {
        const errorDetails = buildResponseValidationDetails(
          error as Error & {
            body?: unknown
            rawValue?: unknown
            pretty?: () => string
          },
          options?.responseSchema,
          structuredRequestDetails ?? undefined
        )

        if (
          isStructuredOutputRoutingMismatch(
            error as Error & {
              body?: unknown
              pretty?: () => string
            },
            options?.responseSchema
          )
        ) {
          throwAppError(
            'LLM_PARSE_ERROR',
            'OpenRouter ha instradato la richiesta verso un provider o modello che non supporta correttamente structured outputs con json_schema. Seleziona un modello compatibile oppure cambia routing/provider.',
            {
              ...errorDetails,
              reason: 'structured-output-routing-mismatch'
            }
          )
        }

        throwAppError('LLM_PARSE_ERROR', 'Risposta OpenRouter non valida secondo SDK', errorDetails)
      }

      // SDK error classes with statusCode
      if (error !== null && typeof error === 'object' && 'statusCode' in error) {
        const statusCode = (error as { statusCode: number }).statusCode
        if (statusCode === 429) {
          throwAppError('LLM_RATE_LIMIT', 'Rate limit raggiunto per OpenRouter')
        }
        if (statusCode === 401 || statusCode === 403) {
          throwAppError('LLM_AUTH_ERROR', 'Autenticazione non valida per OpenRouter')
        }
      }

      // SDK timeout and abort errors
      if (error instanceof Error) {
        if (
          error.name === 'RequestTimeoutError' ||
          error.name === 'RequestAbortedError' ||
          error.name === 'AbortError'
        ) {
          throwAppError('LLM_TIMEOUT', 'Timeout nella richiesta a OpenRouter')
        }
      }

      throwAppError(
        'UNKNOWN_ERROR',
        `Errore OpenRouter: ${error instanceof Error ? error.message : 'sconosciuto'}`
      )
    }
  }

  async testConnection(): Promise<void> {
    await this.chat(TEST_CONNECTION_SYSTEM_PROMPT, TEST_CONNECTION_USER_MESSAGE)
  }
}
