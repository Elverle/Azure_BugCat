import { LLMProviderType, AppError } from '../../shared/types'
import { LLMProvider, LLMProviderConfig } from './types'
import { OpenAIProvider } from './providers/openai-provider'
import { AnthropicProvider } from './providers/anthropic-provider'
import { GenericProvider } from './providers/generic-provider'
import { GeminiProvider } from './providers/gemini-provider'

function throwAppError(code: AppError['code'], message: string): never {
  const err: AppError = { code, message }
  throw err
}

export function createLLMProvider(type: LLMProviderType, config: LLMProviderConfig): LLMProvider {
  switch (type) {
    case 'openai':
      return new OpenAIProvider(config)
    case 'anthropic':
      return new AnthropicProvider(config)
    case 'generic':
      return new GenericProvider(config)
    case 'gemini':
      return new GeminiProvider(config)
    default:
      throwAppError('UNKNOWN_ERROR', `Provider LLM non supportato: ${type as string}`)
  }
}
