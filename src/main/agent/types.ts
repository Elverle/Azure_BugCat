import type {
  AgentChunk,
  AgentUsageStats,
  CodeSource,
  LLMProviderType,
  SessionMode
} from '@shared/types'

export interface RunParams {
  prompt: string
  primaryPath: string
  secondaryPaths?: string[]
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
  codeSource?: CodeSource
  abortSignal: AbortSignal
  onChunk: (chunk: AgentChunk) => void
}

export interface AgentRunResult {
  report: string
  usage?: AgentUsageStats
}

export interface AgentRunner {
  readonly supportsFixMode: boolean
  readonly supportsMcp: boolean
  run(params: RunParams): Promise<AgentRunResult>
}
