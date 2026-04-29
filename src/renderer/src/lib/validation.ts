import type { AppSettings, LLMProviderType } from '@shared/types'

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

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

export function validateApiKey(
  value: string | undefined,
  provider: LLMProviderType
): string | null {
  if (provider === 'github-copilot') {
    return null
  }
  if (!value || value.trim().length === 0) {
    return 'API Key is required for this provider'
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
    apiKey: validateApiKey(settings.apiKey, settings.llmProvider),
    pat: validateRequired(settings.pat, 'Personal Access Token')
  }
}

export function isSettingsValid(errors: Record<string, string | null>): boolean {
  return Object.values(errors).every((v) => v === null)
}
