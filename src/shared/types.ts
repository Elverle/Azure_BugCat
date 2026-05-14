// ============================================
// Shared Types — Bug Categorizer
// ============================================

export type LLMProviderType = 'openai' | 'anthropic' | 'generic' | 'gemini' | 'openrouter'

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
