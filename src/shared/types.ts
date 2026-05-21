// ============================================
// Shared Types — Bug Categorizer
// ============================================

export type LLMProviderType = 'openai' | 'anthropic' | 'generic' | 'gemini' | 'openrouter'

export type AgentProviderType = 'claude-sdk' | 'codex-sdk' | 'copilot-sdk' | 'none'

export type ProjectType = 'backend' | 'frontend' | 'shared'

export type ErrorCode =
  | 'ADO_AUTH_ERROR'
  | 'ADO_NOT_FOUND'
  | 'ADO_EMPTY'
  | 'ADO_TIMEOUT'
  | 'LLM_AUTH_ERROR'
  | 'LLM_RATE_LIMIT'
  | 'OPERATION_CANCELLED'
  | 'LLM_TIMEOUT'
  | 'LLM_PARSE_ERROR'
  | 'STORE_ERROR'
  | 'UNKNOWN_ERROR'
  | 'AGENT_NOT_CONFIGURED'
  | 'AGENT_SESSION_ACTIVE'
  | 'AGENT_SESSION_NOT_FOUND'
  | 'AGENT_BINARY_MISSING'

export interface BugItem {
  id: number
  title: string
  state: string
  assignee: string | null
  areaPath: string
  description: string
  descriptionHtml?: string
  priority: number
  createdDate: string
  updatedDate: string
  tags: string[]
}

export interface CategorizedBug extends BugItem {
  macroCategory: string
  subCategory: string
  categoryReason: string
  categorizedAt: string
}

export interface ProjectEntry {
  id: string
  name: string
  path: string
  type: ProjectType
  description: string
  keywords: string[]
}

export interface CopilotByokConfig {
  enabled: boolean
  provider?: LLMProviderType
  apiKey?: string
  baseUrl?: string
}

export interface AppSettings {
  orgUrl: string
  projectName: string
  queryId: string
  topN: number
  chunkSize: number
  llmProvider: LLMProviderType
  apiKey?: string
  baseUrl?: string
  llmModel?: string
  pat: string
  categories: string[]
  agentProvider: AgentProviderType
  agentApiKey?: string
  agentModel?: string
  copilotByokEnabled?: boolean
  copilotByokProvider?: LLMProviderType
  copilotByokApiKey?: string
  copilotByokBaseUrl?: string
  projects: ProjectEntry[]
  architectureContext: string
  maxConcurrentSessions: number
}

export interface SessionData {
  bugs: CategorizedBug[]
  fetchedAt: string
  lastFetchNewCount?: number
  categorizedAt?: string
  similarityResults?: SimilarityResult
}

export interface AppError {
  code: ErrorCode
  message: string
  details?: unknown
}

export interface ChunkProgress {
  total: number
  completed: number
  currentChunk: CategorizedBug[]
}

export interface LLMCategorizeResult {
  bugId: number
  macroCategory: string
  subCategory: string
  categoryReason: string
}

export interface LLMResponse {
  results: LLMCategorizeResult[]
}

export interface TestConnectionResult {
  success: boolean
  message: string
}

export interface SimilarityGroup {
  similarityScore: number
  reason: string
  bugIds: number[]
}

export interface CategorySimilarityResult {
  macroCategory: string
  groups: SimilarityGroup[]
  error?: string
}

export interface SimilarityResult {
  categories: CategorySimilarityResult[]
  analyzedAt: string
}

export interface SimilarityProgress {
  total: number
  completed: number
  currentGroup: string
}

export interface CatalogBug extends CategorizedBug {
  firstSeenAt: string
  lastSeenAt: string
  closedAt: string | null
  inputSignature: string
  everInSimilarityGroup: boolean
  lastSimilarityGroupAt: string | null
}

export interface CatalogMetadata {
  lastClearedAt: string | null
}

export interface ClosedCatalogSnapshot {
  closedBugs: CatalogBug[]
  fetchedAt: string | null
  lastClearedAt: string | null
}

export type BugCatalog = Record<number, CatalogBug>

export interface BinaryCheckResult {
  installed: boolean
  version?: string
  error?: string
}

// ============================================
// Agent Sessions Types
// ============================================

export type SessionMode = 'analyze' | 'fix'

export type AgentChunkType = 'text' | 'tool_use' | 'tool_result' | 'status'

export interface AgentChunk {
  sessionId: string
  type: AgentChunkType
  content: string
  timestamp: string
  toolName?: string
}

export type AgentSessionStatus = 'running' | 'completed' | 'aborted' | 'error'

export interface AgentUsageStats {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  reasoningTokens?: number
  durationMs?: number
  model?: string
}

export interface AgentSession {
  id: string
  bugId: number
  mode: SessionMode
  primaryProjectId: string
  secondaryProjectIds?: string[]
  agentProvider: AgentProviderType
  status: AgentSessionStatus
  startedAt: string
  completedAt?: string
  report?: string
  usage?: AgentUsageStats
  error?: AppError
  chunks: AgentChunk[]
}

export interface AgentStartPayload {
  bugId: number
  mode: SessionMode
  primaryProjectId: string
  secondaryProjectIds?: string[]
}

export interface AgentAbortPayload {
  sessionId: string
}

export interface AgentCompletedPayload {
  sessionId: string
  report: string
  usage?: AgentUsageStats
}

export interface AgentErrorPayload {
  sessionId: string
  error: AppError
}

export interface McpStatus {
  available: boolean
  reason?: string
}

export interface AgentMcpStatusPayload {
  sessionId: string
  mcpStatus: McpStatus
}

export type AgentSessionFilter = 'all' | AgentSessionStatus

export interface AgentSessionSummary {
  id: string
  bugId: number
  mode: SessionMode
  primaryProjectId: string
  secondaryProjectIds?: string[]
  agentProvider: AgentProviderType
  status: AgentSessionStatus
  startedAt: string
  completedAt?: string
  report?: string
  usage?: AgentUsageStats
  error?: AppError
  mcpStatus?: McpStatus
  chunkCount: number
}

export interface AgentSessionUpdatedPayload {
  sessionId: string
  status: AgentSessionStatus
  completedAt?: string
}

export interface AgentSaveReportPayload {
  sessionId: string
  defaultFilename?: string
}

export interface PersistedAgentSession extends AgentSession {
  persistedAt: string
}

export interface ProjectSuggestionPayload {
  bugId: number
  primaryOverride?: string
}

export interface ProjectSuggestion {
  primaryProjectId: string | null
  suggestedSecondaryIds: string[]
}
