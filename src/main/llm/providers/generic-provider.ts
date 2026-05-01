import { LLMProvider, LLMProviderConfig } from '../types'
import { AppError } from '../../../shared/types'

function throwAppError(code: AppError['code'], message: string, details?: unknown): never {
  const err: AppError = { code, message, ...(details !== undefined && { details }) }
  throw err
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

export class GenericProvider implements LLMProvider {
  readonly name = 'generic'

  constructor(private config: LLMProviderConfig) {
    if (!config.apiKey?.trim()) {
      throwAppError('LLM_AUTH_ERROR', 'API Key mancante per il provider generico')
    }
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

  async chat(systemPrompt: string, userMessage: string): Promise<string> {
    const baseUrl = this.config.baseUrl!.replace(/\/+$/, '')
    const url = `${baseUrl}/chat/completions`
    const timeout = this.config.timeout ?? 60000

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

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
          temperature: 0.1
        }),
        signal: controller.signal
      })

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
        json = await response.json()
      } catch {
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
        throwAppError('LLM_TIMEOUT', 'Timeout nella richiesta al provider generico')
      }
      throwAppError(
        'UNKNOWN_ERROR',
        `Errore provider generico: ${error instanceof Error ? error.message : 'sconosciuto'}`
      )
    } finally {
      clearTimeout(timer)
    }
  }

  async testConnection(): Promise<void> {
    await this.chat('You are a test assistant. Respond with: {"status":"ok"}', 'Test connection')
  }
}
