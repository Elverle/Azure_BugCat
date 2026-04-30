import { CopilotClient, approveAll } from '@github/copilot-sdk'
import { LLMProvider, LLMProviderConfig } from '../types'
import { AppError } from '../../../shared/types'

const REQUEST_TIMEOUT = 60000

function throwAppError(code: AppError['code'], message: string, details?: unknown): never {
  const err: AppError = { code, message, ...(details !== undefined && { details }) }
  throw err
}

export class CopilotProvider implements LLMProvider {
  readonly name = 'github-copilot'

  constructor(private config: LLMProviderConfig) {}

  async chat(systemPrompt: string, userMessage: string): Promise<string> {
    let client: CopilotClient | null = null

    try {
      client = new CopilotClient()

      const session = await client.createSession({
        onPermissionRequest: approveAll,
        model: this.config.model ?? 'gpt-4.1',
        systemMessage: { mode: 'replace', content: systemPrompt }
      })

      try {
        const response = await session.sendAndWait({ prompt: userMessage }, REQUEST_TIMEOUT)

        if (!response?.data?.content) {
          throwAppError('LLM_PARSE_ERROR', 'Risposta vuota da GitHub Copilot')
        }
        return response.data.content
      } finally {
        await session.disconnect()
      }
    } catch (error: unknown) {
      if (isAppError(error)) throw error
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('auth') || message.includes('401') || message.includes('403')) {
        throwAppError('LLM_AUTH_ERROR', 'Autenticazione GitHub Copilot richiesta')
      }
      if (message.includes('rate') || message.includes('429')) {
        throwAppError('LLM_RATE_LIMIT', 'Rate limit raggiunto per GitHub Copilot')
      }
      if (message.includes('timeout') || message.includes('Timeout')) {
        throwAppError('LLM_TIMEOUT', 'Timeout nella richiesta a GitHub Copilot')
      }
      return throwAppError('UNKNOWN_ERROR', `Errore GitHub Copilot: ${message}`)
    } finally {
      if (client) {
        await client.stop().catch(() => {})
      }
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
