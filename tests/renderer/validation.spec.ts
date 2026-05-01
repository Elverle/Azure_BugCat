// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import type { AppSettings } from '@shared/types'
import {
  isSettingsValid,
  validateApiKey,
  validateIntRange,
  validateOrgUrl,
  validateSettings,
  validateUUID
} from '@renderer/lib/validation'

const validSettings: AppSettings = {
  orgUrl: 'https://dev.azure.com/alpitour',
  projectName: 'BugCat',
  queryId: '123e4567-e89b-12d3-a456-426614174000',
  topN: 20,
  chunkSize: 15,
  llmProvider: 'openai',
  apiKey: 'sk-test',
  pat: 'pat-token',
  categories: ['UI']
}

describe('validation utils', () => {
  it('accepts valid ADO organization urls and rejects invalid ones', () => {
    expect(validateOrgUrl(validSettings.orgUrl)).toBeNull()
    expect(validateOrgUrl('http://dev.azure.com/alpitour')).toBe(
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
