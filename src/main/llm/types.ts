import { BugItem, LLMCategorizeResult } from '../../shared/types'
import { SchemaType } from './schemas'

export type { SchemaType }

export interface LLMProviderConfig {
  apiKey?: string
  model?: string
  baseUrl?: string
  timeout?: number
}

export interface ChatOptions {
  responseSchema?: SchemaType
  signal?: AbortSignal
}

export interface LLMProvider {
  /** Machine id, used for diagnostics and log lines. Never shown to the user. */
  readonly name: string
  /** User-facing name, interpolated into error messages ('OpenAI', 'the generic provider', ...). */
  readonly displayName: string
  chat(systemPrompt: string, userMessage: string, options?: ChatOptions): Promise<string>
  testConnection(): Promise<void>
}

export interface ChunkInput {
  bugs: BugItem[]
  chunkIndex: number
  totalChunks: number
}

export interface ChunkResult {
  chunkIndex: number
  results: LLMCategorizeResult[]
  failed: boolean
}
