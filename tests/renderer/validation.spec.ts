// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import type { AppSettings, ProjectEntry } from '@shared/types'
import {
  isSettingsValid,
  validateApiKey,
  validateArchitectureContext,
  validateIntRange,
  validateMaxConcurrentSessions,
  validateMaxLength,
  validateOrgUrl,
  validateProjectEntry,
  validateSettings,
  validateUUID
} from '@renderer/lib/validation'

const validSettings: AppSettings = {
  orgUrl: 'https://dev.azure.com/gversino',
  projectName: 'BugCat',
  queryId: '123e4567-e89b-12d3-a456-426614174000',
  topN: 20,
  chunkSize: 15,
  llmProvider: 'openai',
  apiKey: 'sk-test',
  pat: 'pat-token',
  categories: ['UI'],
  agentProvider: 'none',
  projects: [],
  architectureContext: '',
  maxConcurrentSessions: 1,
  codeSource: 'local'
}

describe('validation utils', () => {
  it('accepts valid ADO organization urls and rejects invalid ones', () => {
    expect(validateOrgUrl(validSettings.orgUrl)).toBeNull()
    expect(validateOrgUrl('http://dev.azure.com/gversino')).toBe(
      'Must be https://dev.azure.com/{org} or https://{org}.visualstudio.com'
    )
  })

  it('validates UUID and integer boundaries', () => {
    expect(validateUUID(validSettings.queryId)).toBeNull()
    expect(validateUUID('not-a-uuid')).toBe('Must be a valid UUID')
    expect(validateIntRange(15, 5, 30, 'Chunk Size')).toBeNull()
    expect(validateIntRange(31, 5, 30, 'Chunk Size')).toBe('Chunk Size must be between 5 and 30')
  })

  it('requires API keys for all providers', () => {
    expect(validateApiKey('', 'openai')).toBe('API Key is required for this provider')
    expect(validateApiKey('', 'generic')).toBe('API Key is required for this provider')
    expect(validateApiKey('sk-test', 'generic')).toBeNull()
  })

  it('validates the entire settings object coherently', () => {
    const errors = validateSettings(validSettings)
    expect(isSettingsValid(errors)).toBe(true)

    const invalidErrors = validateSettings({
      ...validSettings,
      orgUrl: '',
      topN: 0,
      apiKey: ''
    })

    expect(invalidErrors.orgUrl).toBe('Organization URL is required')
    expect(invalidErrors.topN).toBe('Top N must be between 1 and 200')
    expect(invalidErrors.apiKey).toBe('API Key is required for this provider')
  })
})

describe('validateMaxLength', () => {
  it('returns null when value is under limit', () => {
    expect(validateMaxLength('short', 10, 'Field')).toBeNull()
  })

  it('returns null when value is at limit', () => {
    expect(validateMaxLength('a'.repeat(10), 10, 'Field')).toBeNull()
  })

  it('returns error when value is over limit', () => {
    expect(validateMaxLength('a'.repeat(11), 10, 'Field')).toBe(
      'Field must be at most 10 characters'
    )
  })
})

describe('validateProjectEntry', () => {
  const validProject: ProjectEntry = {
    id: 'p1',
    name: 'MyProject',
    path: '/home/user/project',
    type: 'backend',
    description: 'A project',
    keywords: ['api', 'rest']
  }

  it('returns all nulls for a valid project', () => {
    const errors = validateProjectEntry(validProject)
    expect(errors.name).toBeNull()
    expect(errors.path).toBeNull()
    expect(errors.description).toBeNull()
    expect(errors.keywords).toBeNull()
  })

  it('returns error for missing name', () => {
    const errors = validateProjectEntry({ ...validProject, name: '' })
    expect(errors.name).toBe('Name is required')
  })

  it('returns error for name over 60 chars', () => {
    const errors = validateProjectEntry({ ...validProject, name: 'a'.repeat(61) })
    expect(errors.name).toBe('Name must be at most 60 characters')
  })

  it('returns error for empty path', () => {
    const errors = validateProjectEntry({ ...validProject, path: '' })
    expect(errors.path).toBe('Path is required')
  })

  it('returns error for description over 300 chars', () => {
    const errors = validateProjectEntry({ ...validProject, description: 'a'.repeat(301) })
    expect(errors.description).toBe('Description must be at most 300 characters')
  })

  it('returns error for keyword over 30 chars', () => {
    const errors = validateProjectEntry({ ...validProject, keywords: ['a'.repeat(31)] })
    expect(errors.keywords).toBe('Keyword must be at most 30 characters')
  })
})

describe('validateArchitectureContext', () => {
  it('returns null for empty string', () => {
    expect(validateArchitectureContext('')).toBeNull()
  })

  it('returns null for 1000 characters', () => {
    expect(validateArchitectureContext('a'.repeat(1000))).toBeNull()
  })

  it('returns error for 1001 characters', () => {
    expect(validateArchitectureContext('a'.repeat(1001))).toBe(
      'Architecture context must be at most 1000 characters'
    )
  })
})

describe('validateMaxConcurrentSessions', () => {
  it('returns error for 0', () => {
    expect(validateMaxConcurrentSessions(0)).toBe('Max concurrent sessions must be between 1 and 5')
  })

  it('returns null for 1', () => {
    expect(validateMaxConcurrentSessions(1)).toBeNull()
  })

  it('returns null for 5', () => {
    expect(validateMaxConcurrentSessions(5)).toBeNull()
  })

  it('returns error for 6', () => {
    expect(validateMaxConcurrentSessions(6)).toBe('Max concurrent sessions must be between 1 and 5')
  })

  it('returns error for non-integer', () => {
    expect(validateMaxConcurrentSessions(2.5)).toBe('Max concurrent sessions must be an integer')
  })
})

describe('validateSettings — new FT-14A fields', () => {
  it('returns no new errors with valid new fields', () => {
    const errors = validateSettings(validSettings)
    expect(errors.architectureContext).toBeNull()
    expect(errors.maxConcurrentSessions).toBeNull()
    expect(errors.agentApiKey).toBeNull()
  })

  it('returns error for invalid architectureContext', () => {
    const errors = validateSettings({
      ...validSettings,
      architectureContext: 'a'.repeat(1001)
    })
    expect(errors.architectureContext).toBe('Architecture context must be at most 1000 characters')
  })

  it('does NOT require agent API key when agentProvider is copilot-sdk (subscription mode)', () => {
    const errors = validateSettings({
      ...validSettings,
      llmProvider: 'gemini',
      agentProvider: 'copilot-sdk',
      agentApiKey: ''
    })
    expect(errors.agentApiKey).toBeNull()
  })

  it('does NOT require agent API key when agentProvider is claude-sdk (uses local config)', () => {
    const errors = validateSettings({
      ...validSettings,
      llmProvider: 'gemini',
      agentProvider: 'claude-sdk',
      agentApiKey: ''
    })
    expect(errors.agentApiKey).toBeNull()
  })

  it('requires copilotByokApiKey when copilot-sdk with BYOK enabled', () => {
    const errors = validateSettings({
      ...validSettings,
      llmProvider: 'gemini',
      agentProvider: 'copilot-sdk',
      copilotByokEnabled: true,
      copilotByokProvider: 'openai',
      copilotByokApiKey: ''
    })
    expect(errors.copilotByokApiKey).toBe('BYOK API Key is required')
  })

  it('requires BYOK base URL for generic Copilot providers', () => {
    const errors = validateSettings({
      ...validSettings,
      llmProvider: 'gemini',
      agentProvider: 'copilot-sdk',
      copilotByokEnabled: true,
      copilotByokProvider: 'generic',
      copilotByokApiKey: 'test-key',
      copilotByokBaseUrl: ''
    })

    expect(errors.copilotByokBaseUrl).toBe('BYOK Base URL is required for this provider')
  })

  it('does NOT require BYOK base URL for OpenAI Copilot providers', () => {
    const errors = validateSettings({
      ...validSettings,
      llmProvider: 'gemini',
      agentProvider: 'copilot-sdk',
      copilotByokEnabled: true,
      copilotByokProvider: 'openai',
      copilotByokApiKey: 'test-key',
      copilotByokBaseUrl: ''
    })

    expect(errors.copilotByokBaseUrl).toBeNull()
  })

  it('does NOT require copilotByokApiKey when BYOK is disabled', () => {
    const errors = validateSettings({
      ...validSettings,
      llmProvider: 'gemini',
      agentProvider: 'copilot-sdk',
      copilotByokEnabled: false,
      copilotByokApiKey: ''
    })
    expect(errors.copilotByokApiKey).toBeNull()
  })
})

describe('validateProjectEntry — codeSource mcp-repos', () => {
  const validProject: ProjectEntry = {
    id: 'p1',
    name: 'MyProject',
    path: '/home/user/project',
    type: 'backend',
    description: 'A project',
    keywords: ['api']
  }

  it('returns no path error when codeSource is mcp-repos', () => {
    const errors = validateProjectEntry({ ...validProject, path: '' }, 'mcp-repos')
    expect(errors.path).toBeNull()
  })

  it('returns no path error when path is undefined in mcp-repos mode', () => {
    const errors = validateProjectEntry({ ...validProject, path: undefined }, 'mcp-repos')
    expect(errors.path).toBeNull()
  })

  it('still validates name in mcp-repos mode', () => {
    const errors = validateProjectEntry({ ...validProject, name: '', path: undefined }, 'mcp-repos')
    expect(errors.name).toBe('Name is required')
  })

  it('requires path when codeSource is local', () => {
    const errors = validateProjectEntry({ ...validProject, path: '' }, 'local')
    expect(errors.path).toBe('Path is required')
  })

  it('requires path when codeSource is undefined (default)', () => {
    const errors = validateProjectEntry({ ...validProject, path: '' })
    expect(errors.path).toBe('Path is required')
  })
})

describe('validateSettings — codeSource mcp-repos skips project paths', () => {
  it('returns no project path error when codeSource is mcp-repos', () => {
    const errors = validateSettings({
      ...validSettings,
      codeSource: 'mcp-repos',
      projects: [{ id: 'p1', name: 'MyRepo', type: 'backend', description: '', keywords: [] }]
    })
    expect(errors['project-0-path']).toBeNull()
  })

  it('returns project path error when codeSource is local', () => {
    const errors = validateSettings({
      ...validSettings,
      codeSource: 'local',
      projects: [
        { id: 'p1', name: 'MyRepo', path: '', type: 'backend', description: '', keywords: [] }
      ]
    })
    expect(errors['project-0-path']).toBe('Path is required')
  })
})
