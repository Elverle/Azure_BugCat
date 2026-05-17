import { describe, it, expect, vi, beforeEach } from 'vitest'
import { migrateStore, CURRENT_SCHEMA_VERSION, migrations } from '@main/store-migration'

describe('store-migration v4', () => {
  let store: {
    get: ReturnType<typeof vi.fn>
    set: ReturnType<typeof vi.fn>
    has: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    store = { get: vi.fn(), set: vi.fn(), has: vi.fn() }
  })

  it('CURRENT_SCHEMA_VERSION equals 4', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(4)
  })

  it('migrations array has 4 entries', () => {
    expect(migrations).toHaveLength(4)
    expect(migrations[0].version).toBe(1)
    expect(migrations[1].version).toBe(2)
    expect(migrations[2].version).toBe(3)
    expect(migrations[3].version).toBe(4)
  })

  it('v3 store with only legacy settings gets v4 defaults added', () => {
    const legacySettings = {
      orgUrl: 'https://dev.azure.com/test',
      projectName: 'TestProject',
      queryId: '123e4567-e89b-12d3-a456-426614174000',
      topN: 20,
      chunkSize: 15,
      llmProvider: 'openai',
      apiKey: 'sk-test',
      pat: 'pat-token',
      categories: []
    }

    store.has.mockReturnValue(true)
    store.get.mockImplementation((key: string) => {
      if (key === 'schemaVersion') return 3
      if (key === 'settings') return { ...legacySettings }
      if (key === 'session') return null
      if (key === 'bugCatalog') return null
      return undefined
    })

    migrateStore(store)

    const settingsCall = store.set.mock.calls.find((c: unknown[]) => c[0] === 'settings')
    expect(settingsCall).toBeDefined()
    const migratedSettings = settingsCall![1]
    expect(migratedSettings.agentProvider).toBe('none')
    expect(migratedSettings.agentApiKey).toBe('')
    expect(migratedSettings.agentModel).toBe('')
    expect(migratedSettings.copilotByokEnabled).toBe(false)
    expect(migratedSettings.copilotByokProvider).toBeUndefined()
    expect(migratedSettings.copilotByokApiKey).toBe('')
    expect(migratedSettings.projects).toEqual([])
    expect(migratedSettings.architectureContext).toBe('')
    expect(migratedSettings.maxConcurrentSessions).toBe(1)
  })

  it('v3 store with existing fields preserves them after migration', () => {
    const legacySettings = {
      orgUrl: 'https://dev.azure.com/test',
      projectName: 'TestProject',
      queryId: '123e4567-e89b-12d3-a456-426614174000',
      topN: 20,
      chunkSize: 15,
      llmProvider: 'openai',
      apiKey: 'sk-existing-key',
      pat: 'pat-existing',
      categories: ['UI', 'Performance']
    }

    store.has.mockReturnValue(true)
    store.get.mockImplementation((key: string) => {
      if (key === 'schemaVersion') return 3
      if (key === 'settings') return { ...legacySettings }
      if (key === 'session') return null
      if (key === 'bugCatalog') return null
      return undefined
    })

    migrateStore(store)

    const settingsCall = store.set.mock.calls.find((c: unknown[]) => c[0] === 'settings')
    const migratedSettings = settingsCall![1]
    expect(migratedSettings.apiKey).toBe('sk-existing-key')
    expect(migratedSettings.pat).toBe('pat-existing')
    expect(migratedSettings.categories).toEqual(['UI', 'Performance'])
    expect(migratedSettings.orgUrl).toBe('https://dev.azure.com/test')
  })

  it('v4 store is a no-op (migrateStore does not call set)', () => {
    store.has.mockReturnValue(true)
    store.get.mockImplementation((key: string) => {
      if (key === 'schemaVersion') return 4
      return undefined
    })

    migrateStore(store)

    expect(store.set).not.toHaveBeenCalled()
  })

  it('migration v4 does NOT overwrite existing new fields', () => {
    const settingsWithExisting = {
      orgUrl: 'https://dev.azure.com/test',
      projectName: 'TestProject',
      queryId: '123e4567-e89b-12d3-a456-426614174000',
      topN: 20,
      chunkSize: 15,
      llmProvider: 'openai',
      apiKey: 'sk-test',
      pat: 'pat-token',
      categories: [],
      agentProvider: 'claude-sdk'
    }

    store.has.mockReturnValue(true)
    store.get.mockImplementation((key: string) => {
      if (key === 'schemaVersion') return 3
      if (key === 'settings') return { ...settingsWithExisting }
      if (key === 'session') return null
      if (key === 'bugCatalog') return null
      return undefined
    })

    migrateStore(store)

    const settingsCall = store.set.mock.calls.find((c: unknown[]) => c[0] === 'settings')
    const migratedSettings = settingsCall![1]
    expect(migratedSettings.agentProvider).toBe('claude-sdk')
    expect(migratedSettings.agentApiKey).toBe('')
    expect(migratedSettings.agentModel).toBe('')
    expect(migratedSettings.copilotByokEnabled).toBe(false)
    expect(migratedSettings.copilotByokProvider).toBeUndefined()
    expect(migratedSettings.copilotByokApiKey).toBe('')
    expect(migratedSettings.projects).toEqual([])
    expect(migratedSettings.architectureContext).toBe('')
    expect(migratedSettings.maxConcurrentSessions).toBe(1)
  })
})
