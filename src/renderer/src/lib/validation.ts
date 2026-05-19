import type { AppSettings, LLMProviderType, ProjectEntry } from '@shared/types'

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
  return validateUrlValue(value, 'Base URL', true)
}

function validateUrlValue(
  value: string | undefined,
  fieldName: string,
  required: boolean
): string | null {
  if (!value || value.trim().length === 0) {
    return required ? `${fieldName} is required for this provider` : null
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

export function validateMaxLength(value: string, max: number, fieldName: string): string | null {
  if (value.length > max) {
    return `${fieldName} must be at most ${max} characters`
  }
  return null
}

export function validateProjectEntry(project: ProjectEntry): Record<string, string | null> {
  const errors: Record<string, string | null> = {
    name: validateRequired(project.name, 'Name') ?? validateMaxLength(project.name, 60, 'Name'),
    path: validateRequired(project.path, 'Path'),
    description: project.description
      ? validateMaxLength(project.description, 300, 'Description')
      : null,
    keywords: null
  }
  for (const keyword of project.keywords) {
    const kwError = validateMaxLength(keyword, 30, 'Keyword')
    if (kwError) {
      errors.keywords = kwError
      break
    }
  }
  return errors
}

export function validateArchitectureContext(value: string): string | null {
  return validateMaxLength(value, 1000, 'Architecture context')
}

export function validateMaxConcurrentSessions(value: number): string | null {
  return validateIntRange(value, 1, 5, 'Max concurrent sessions')
}

export function validateSettings(settings: AppSettings): Record<string, string | null> {
  const errors: Record<string, string | null> = {
    orgUrl: validateOrgUrl(settings.orgUrl),
    projectName: validateRequired(settings.projectName, 'Project Name'),
    queryId: validateUUID(settings.queryId),
    topN: validateIntRange(settings.topN, 1, 200, 'Top N'),
    chunkSize: validateIntRange(settings.chunkSize, 5, 30, 'Chunk Size'),
    apiKey: validateApiKey(settings.apiKey, settings.llmProvider),
    baseUrl: validateBaseUrl(settings.baseUrl, settings.llmProvider),
    pat: validateRequired(settings.pat, 'Personal Access Token'),
    architectureContext: validateArchitectureContext(settings.architectureContext),
    maxConcurrentSessions: validateMaxConcurrentSessions(settings.maxConcurrentSessions)
  }

  // Agent API key: required only for codex-sdk when not auto-derived; optional for claude-sdk
  const autoDerived = settings.llmProvider === 'anthropic' || settings.llmProvider === 'openai'
  if (
    settings.agentProvider !== 'none' &&
    settings.agentProvider !== 'copilot-sdk' &&
    settings.agentProvider !== 'claude-sdk' &&
    !autoDerived
  ) {
    errors.agentApiKey = validateRequired(settings.agentApiKey ?? '', 'Agent API Key')
  } else {
    errors.agentApiKey = null
  }

  // BYOK validation: when copilot-sdk with BYOK enabled, require provider and API key.
  // Base URL is optional only for providers where BugCat can infer a safe default.
  if (settings.agentProvider === 'copilot-sdk' && settings.copilotByokEnabled) {
    errors.copilotByokProvider = validateRequired(
      settings.copilotByokProvider ?? '',
      'BYOK Provider'
    )
    errors.copilotByokApiKey = validateRequired(settings.copilotByokApiKey ?? '', 'BYOK API Key')

    const requiresExplicitBaseUrl =
      settings.copilotByokProvider === 'generic' || settings.copilotByokProvider === 'gemini'
    errors.copilotByokBaseUrl = validateUrlValue(
      settings.copilotByokBaseUrl,
      'BYOK Base URL',
      requiresExplicitBaseUrl
    )
  } else {
    errors.copilotByokProvider = null
    errors.copilotByokApiKey = null
    errors.copilotByokBaseUrl = null
  }

  // Project-level validation
  for (let i = 0; i < settings.projects.length; i++) {
    const projectErrors = validateProjectEntry(settings.projects[i])
    for (const [field, error] of Object.entries(projectErrors)) {
      errors[`project-${i}-${field}`] = error
    }
  }

  return errors
}

export function isSettingsValid(errors: Record<string, string | null>): boolean {
  return Object.values(errors).every((v) => v === null)
}
