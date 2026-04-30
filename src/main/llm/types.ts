import { BugItem, LLMCategorizeResult } from '../../shared/types'

export interface LLMProviderConfig {
  apiKey?: string
  model?: string
  timeout?: number
}

export interface LLMProvider {
  readonly name: string
  chat(systemPrompt: string, userMessage: string): Promise<string>
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
