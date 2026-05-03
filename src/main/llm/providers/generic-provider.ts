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

  constructor(private config: LLMProviderConfig) {
    assertApiKey(config.apiKey, 'il provider generico')
    if (!config.baseUrl?.trim()) {
      throwAppError('UNKNOWN_ERROR', 'Base URL mancante per il provider generico')
    }
    // Enforce URL scheme at main-process boundary
    let parsed: URL
    try {
      parsed = new URL(config.baseUrl)
    } catch {
      throwAppError('UNKNOWN_ERROR', 'Base URL non valida per il provider generico')
    }
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    if (parsed.protocol !== 'https:' && !isLocalhost) {
      throwAppError(
        'UNKNOWN_ERROR',
        'Base URL deve usare HTTPS (http consentito solo per localhost)'
      )
    }
  }

  async chat(systemPrompt: string, userMessage: string, options?: ChatOptions): Promise<string> {
    const baseUrl = this.config.baseUrl!.replace(/\/+$/, '')
    const url = `${baseUrl}/chat/completions`
    const timeout = getProviderTimeout(this.config)
    const responseSchema = options?.responseSchema
    const responseSchemaMetadata = getStructuredOutputMetadata(responseSchema)
    const requestTimeout = createRequestTimeout(timeout, options?.signal)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model ?? 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.1,
          ...(responseSchemaMetadata && {
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
        const status = response.status
        if (status === 401 || status === 403) {
          throwAppError('LLM_AUTH_ERROR', 'Autenticazione non valida per il provider generico')
        }
        if (status === 429) {
          throwAppError('LLM_RATE_LIMIT', 'Rate limit raggiunto per il provider generico')
        }
        throwAppError(
          'UNKNOWN_ERROR',
          `Errore provider generico: HTTP ${status} ${response.statusText}`
        )
      }

      let json: { choices?: { message?: { content?: string } }[] }
      try {
        json = JSON.parse(bodyText) as { choices?: { message?: { content?: string } }[] }
      } catch {
        if (isLikelyHtmlResponse(response, bodyText)) {
          throwAppError(
            'LLM_PARSE_ERROR',
            `Base URL del provider generico probabilmente errato: ${url} ha restituito HTML invece di JSON. Verifica che il baseUrl punti alla root API compatibile OpenAI e non a una pagina web.`
          )
        }

        throwAppError('LLM_PARSE_ERROR', 'Risposta non-JSON dal provider generico')
      }
      const content = json.choices?.[0]?.message?.content

      if (!content) {
        throwAppError('LLM_PARSE_ERROR', 'Risposta vuota dal provider generico')
      }

      return content
    } catch (error: unknown) {
      if (isAppError(error)) throw error
      if (error instanceof Error && error.name === 'AbortError') {
        if (!requestTimeout.didTimeout()) {
          throwAppError('OPERATION_CANCELLED', 'Categorizzazione annullata')
        }
        throwAppError('LLM_TIMEOUT', 'Timeout nella richiesta al provider generico')
      }
      throwAppError(
        'UNKNOWN_ERROR',
        `Errore provider generico: ${error instanceof Error ? error.message : 'sconosciuto'}`
      )
    } finally {
      requestTimeout.dispose()
    }
  }

  async testConnection(): Promise<void> {
    await this.chat(TEST_CONNECTION_SYSTEM_PROMPT, TEST_CONNECTION_USER_MESSAGE)
  }
}
