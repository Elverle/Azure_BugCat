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
  readonly name: string
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
