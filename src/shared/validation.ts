import type { AppSettings, LLMProviderType } from '@shared/types'
import { throwAppError } from './app-error'

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const VALID_LLM_PROVIDERS: readonly LLMProviderType[] = [
  'openai',
  'anthropic',
  'generic',
  'gemini',
  'openrouter'
]

const ADO_ORG_URL_REGEX = /^https:\/\/(dev\.azure\.com\/[^/\s]+|[^/\s]+\.visualstudio\.com)\/?$/

export function validateOrgUrl(url: string): string | null {
  const trimmed = url.trim()
  if (trimmed.length === 0) {
    return 'Organization URL is required'
  }
  if (!ADO_ORG_URL_REGEX.test(trimmed)) {
    return 'Must be https://dev.azure.com/{org} or https://{org}.visualstudio.com'
  }
  return null
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (value.trim().length === 0) {
    return `${fieldName} is required`
  }
  return null
}

export function validateUUID(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return 'Query ID is required'
  }
  if (!UUID_REGEX.test(trimmed)) {
    return 'Must be a valid UUID'
  }
  return null
}

export function validateIntRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): string | null {
  if (!Number.isInteger(value)) {
    return `${fieldName} must be an integer`
  }
  if (value < min || value > max) {
    return `${fieldName} must be between ${min} and ${max}`
  }
  return null
}

export function validateApiKey(value: string | undefined): string | null {
  if (!value || value.trim().length === 0) {
    return 'API Key is required for this provider'
  }
  return null
}

export function validateBaseUrl(
  value: string | undefined,
  provider: LLMProviderType
): string | null {
  if (provider !== 'generic') {
    return null
  }
  if (!value || value.trim().length === 0) {
    return 'Base URL is required for Generic provider'
  }
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return 'Must be a valid URL'
  }
  if (parsed.protocol !== 'https:') {
    const hostname = parsed.hostname
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return 'Base URL must use HTTPS (http allowed only for localhost)'
    }
  }
  return null
}

export function validateSettings(settings: AppSettings): Record<string, string | null> {
  return {
    orgUrl: validateOrgUrl(settings.orgUrl),
    projectName: validateRequired(settings.projectName, 'Project Name'),
    queryId: validateUUID(settings.queryId),
    topN: validateIntRange(settings.topN, 1, 200, 'Top N'),
    chunkSize: validateIntRange(settings.chunkSize, 5, 30, 'Chunk Size'),
    apiKey: validateApiKey(settings.apiKey),
    baseUrl: validateBaseUrl(settings.baseUrl, settings.llmProvider),
    pat: validateRequired(settings.pat, 'Personal Access Token')
  }
}

export function isSettingsValid(errors: Record<string, string | null>): boolean {
  return Object.values(errors).every((v) => v === null)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

/**
 * Main-process gate for `SETTINGS_SET`: the renderer already validates before
 * calling `setSettings`, but the main process is the actual trust boundary —
 * it must not persist whatever crosses the IPC bridge on faith. Rejects a
 * non-object payload, a payload whose fields have the wrong primitive type,
 * and (via `validateSettings`/`isSettingsValid`) a payload whose values are
 * the right type but out of range — including `NaN`, which passes a bare
 * `typeof x === 'number'` check but is caught by `validateIntRange`.
 */
export function assertValidSettings(input: unknown): AppSettings {
  if (!isRecord(input)) {
    throwAppError('STORE_ERROR', 'Invalid settings payload: expected an object')
  }

  const candidate = input as unknown as AppSettings
  if (
    typeof candidate.orgUrl !== 'string' ||
    typeof candidate.projectName !== 'string' ||
    typeof candidate.queryId !== 'string' ||
    typeof candidate.pat !== 'string' ||
    typeof candidate.topN !== 'number' ||
    typeof candidate.chunkSize !== 'number' ||
    !VALID_LLM_PROVIDERS.includes(candidate.llmProvider) ||
    (candidate.apiKey !== undefined && typeof candidate.apiKey !== 'string') ||
    (candidate.baseUrl !== undefined && typeof candidate.baseUrl !== 'string') ||
    (candidate.llmModel !== undefined && typeof candidate.llmModel !== 'string') ||
    !Array.isArray(candidate.categories) ||
    candidate.categories.some((category) => typeof category !== 'string')
  ) {
    throwAppError('STORE_ERROR', 'Invalid settings payload: unexpected field types')
  }

  const errors = validateSettings(candidate)
  if (!isSettingsValid(errors)) {
    const detail = Object.entries(errors)
      .filter(([, message]) => message !== null)
      .map(([field, message]) => `${field}: ${message}`)
      .join('; ')
    throwAppError('STORE_ERROR', `Invalid settings: ${detail}`)
  }

  return candidate
}
