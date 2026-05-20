import type { AgentChunk, LLMProviderType, SessionMode } from '@shared/types'

export interface RunParams {
  prompt: string
  primaryPath: string
  mode: SessionMode
  apiKey?: string
  baseUrl?: string
  providerType?: LLMProviderType
  model?: string
  maxTurns?: number
  mcpAvailable?: boolean
  adoPat?: string
  adoOrgUrl?: string
  adoProjectName?: string
  abortSignal: AbortSignal
  onChunk: (chunk: AgentChunk) => void
}

export interface AgentRunner {
  readonly supportsFixMode: boolean
  readonly supportsMcp: boolean
  run(params: RunParams): Promise<string>
}
