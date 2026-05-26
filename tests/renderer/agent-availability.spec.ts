// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { checkAgentAvailability, getAgentAvailabilityHint } from '@renderer/lib/agent-availability'
import type { AppSettings } from '@shared/types'

const baseSettings: AppSettings = {
  orgUrl: 'https://dev.azure.com/org',
  projectName: 'Project',
  queryId: '123',
  topN: 20,
  chunkSize: 15,
  llmProvider: 'gemini',
  apiKey: 'key',
  pat: 'pat',
  categories: [],
  agentProvider: 'codex-sdk',
  agentApiKey: 'agent-key',
  projects: [
    { id: 'p1', name: 'Backend', path: '/path', type: 'backend', description: '', keywords: [] }
  ],
  architectureContext: '',
  maxConcurrentSessions: 5
}

describe('checkAgentAvailability', () => {
  it('should return available when llmProvider is anthropic', () => {
    const result = checkAgentAvailability({
      ...baseSettings,
      llmProvider: 'anthropic',
      agentProvider: 'none',
      agentApiKey: ''
    })
    expect(result).toEqual({ available: true })
  })

  it('should return available when llmProvider is openai', () => {
    const result = checkAgentAvailability({
      ...baseSettings,
      llmProvider: 'openai',
      agentProvider: 'none',
      agentApiKey: ''
    })
    expect(result).toEqual({ available: true })
  })

  it('should return unavailable when llmProvider is anthropic but no projects', () => {
    const result = checkAgentAvailability({
      ...baseSettings,
      llmProvider: 'anthropic',
      agentProvider: 'none',
      agentApiKey: '',
      projects: []
    })
    expect(result).toEqual({
      available: false,
      reason: 'Nessun progetto configurato. Aggiungi almeno un progetto in Settings.'
    })
  })

  it('should return unavailable when llmProvider is openai but no projects', () => {
    const result = checkAgentAvailability({
      ...baseSettings,
      llmProvider: 'openai',
      agentProvider: 'none',
      agentApiKey: '',
      projects: []
    })
    expect(result).toEqual({
      available: false,
      reason: 'Nessun progetto configurato. Aggiungi almeno un progetto in Settings.'
    })
  })

  it('should return unavailable when agentProvider is none', () => {
    const result = checkAgentAvailability({ ...baseSettings, agentProvider: 'none' })
    expect(result).toEqual({
      available: false,
      reason: 'Agent Sessions disabilitato. Configura un provider agente in Settings.'
    })
  })

  it('should return unavailable when codex-sdk without agentApiKey', () => {
    const result = checkAgentAvailability({
      ...baseSettings,
      agentProvider: 'codex-sdk',
      agentApiKey: ''
    })
    expect(result).toEqual({
      available: false,
      reason: 'API Key agente richiesta per Codex. Configurala in Settings.'
    })
  })

  it('should return unavailable when copilot-sdk BYOK is incomplete', () => {
    const result = checkAgentAvailability({
      ...baseSettings,
      agentProvider: 'copilot-sdk',
      copilotByokEnabled: true,
      copilotByokProvider: undefined,
      copilotByokApiKey: ''
    })
    expect(result).toEqual({
      available: false,
      reason: 'Configurazione BYOK Copilot incompleta. Verifica in Settings.'
    })
  })

  it('should return available when copilot-sdk subscription mode', () => {
    const result = checkAgentAvailability({
      ...baseSettings,
      agentProvider: 'copilot-sdk',
      copilotByokEnabled: false
    })
    expect(result).toEqual({ available: true })
  })

  it('should return unavailable when no projects configured', () => {
    const result = checkAgentAvailability({ ...baseSettings, projects: [] })
    expect(result).toEqual({
      available: false,
      reason: 'Nessun progetto configurato. Aggiungi almeno un progetto in Settings.'
    })
  })

  it('should return available when claude-sdk without apiKey', () => {
    const result = checkAgentAvailability({
      ...baseSettings,
      agentProvider: 'claude-sdk',
      agentApiKey: ''
    })
    expect(result).toEqual({ available: true })
  })

  it('should return available with valid codex-sdk settings', () => {
    const result = checkAgentAvailability(baseSettings)
    expect(result).toEqual({ available: true })
  })
})

describe('getAgentAvailabilityHint', () => {
  it('should return null for anthropic llmProvider', () => {
    expect(getAgentAvailabilityHint({ ...baseSettings, llmProvider: 'anthropic' })).toBeNull()
  })

  it('should return null for openai llmProvider', () => {
    expect(getAgentAvailabilityHint({ ...baseSettings, llmProvider: 'openai' })).toBeNull()
  })

  it('should return Claude hint when claude-sdk without apiKey', () => {
    const result = getAgentAvailabilityHint({
      ...baseSettings,
      agentProvider: 'claude-sdk',
      agentApiKey: ''
    })
    expect(result).toBe('Assicurati che Claude Code sia configurato localmente.')
  })

  it('should return null when claude-sdk with apiKey', () => {
    const result = getAgentAvailabilityHint({
      ...baseSettings,
      agentProvider: 'claude-sdk',
      agentApiKey: 'key'
    })
    expect(result).toBeNull()
  })

  it('should return null for codex-sdk', () => {
    expect(getAgentAvailabilityHint(baseSettings)).toBeNull()
  })
})
