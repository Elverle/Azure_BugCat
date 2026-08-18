import { describe, it, expect, vi, beforeEach } from 'vitest'
import { migrateStore, CURRENT_SCHEMA_VERSION, migrations } from '@main/store-migration'

describe('store-migration', () => {
  let store: {
    get: ReturnType<typeof vi.fn>
    set: ReturnType<typeof vi.fn>
    has: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    store = { get: vi.fn(), set: vi.fn(), has: vi.fn() }
  })

  describe('exports', () => {
    it('should export CURRENT_SCHEMA_VERSION as 4', () => {
      expect(CURRENT_SCHEMA_VERSION).toBe(4)
    })

    it('should export migrations array with four entries', () => {
      expect(migrations).toHaveLength(4)
      expect(migrations[0].version).toBe(1)
      expect(migrations[1].version).toBe(2)
      expect(migrations[2].version).toBe(3)
      expect(migrations[3].version).toBe(4)
    })
  })

  describe('migrateStore', () => {
    it('should run migration when schemaVersion key does not exist (legacy store)', () => {
      store.has.mockReturnValue(false)
      store.get.mockReturnValue(undefined)

      migrateStore(store)

      expect(store.has).toHaveBeenCalledWith('schemaVersion')
      expect(store.set).toHaveBeenCalledWith('schemaVersion', CURRENT_SCHEMA_VERSION)
    })

    it('should not run migration when already at current version', () => {
      store.has.mockReturnValue(true)
      store.get.mockImplementation((key: string) => {
        if (key === 'schemaVersion') return CURRENT_SCHEMA_VERSION
        return undefined
      })

      migrateStore(store)

      expect(store.set).not.toHaveBeenCalled()
    })

    it('should not run migration when version is ahead of current (forward-compat)', () => {
      store.has.mockReturnValue(true)
      store.get.mockImplementation((key: string) => {
        if (key === 'schemaVersion') return 5
        return undefined
      })

      migrateStore(store)

      expect(store.set).not.toHaveBeenCalled()
    })

    it('should pass store data through migration and persist results', () => {
      const mockSession = { bugs: [], fetchedAt: '2026-01-01' }
      const mockSettings = { orgUrl: 'test' }
      store.has.mockReturnValue(false)
      store.get.mockImplementation((key: string) => {
        if (key === 'settings') return mockSettings
        if (key === 'session') return mockSession
        return undefined
      })

      migrateStore(store)

      // Data persisted before schema version bump
      expect(store.set).toHaveBeenCalledWith('settings', mockSettings)
      expect(store.set).toHaveBeenCalledWith('session', mockSession)
      expect(store.set).toHaveBeenCalledWith('schemaVersion', CURRENT_SCHEMA_VERSION)
    })

    it('migration v2 converts github-copilot to openai and removes copilotAuthStatus', () => {
      const mockSettings = {
        llmProvider: 'github-copilot',
        copilotAuthStatus: 'authenticated',
        apiKey: ''
      }
      store.has.mockReturnValue(true)
      store.get.mockImplementation((key: string) => {
        if (key === 'schemaVersion') return 1
        if (key === 'settings') return mockSettings
        if (key === 'session') return null
        return undefined
      })

      migrateStore(store)

      expect(store.set).toHaveBeenCalledWith(
        'settings',
        expect.objectContaining({
          llmProvider: 'openai'
        })
      )
      const settingsCall = (store.set as any).mock.calls.find((c: unknown[]) => c[0] === 'settings')
      expect(settingsCall[1]).not.toHaveProperty('copilotAuthStatus')
    })

    it('migration v2 leaves non-copilot providers unchanged', () => {
      const mockSettings = { llmProvider: 'anthropic', apiKey: 'key' }
      store.has.mockReturnValue(true)
      store.get.mockImplementation((key: string) => {
        if (key === 'schemaVersion') return 1
        if (key === 'settings') return mockSettings
        if (key === 'session') return null
        return undefined
      })

      migrateStore(store)

      expect(store.set).toHaveBeenCalledWith(
        'settings',
        expect.objectContaining({
          llmProvider: 'anthropic'
        })
      )
    })

    it('migration v3 creates bugCatalog from v2 session with categorized bugs', () => {
      const mockSession = {
        bugs: [
          {
            id: 1,
            title: 'Bug One',
            state: 'Active',
            assignee: null,
            areaPath: 'Project\\Area',
            description: 'First bug',
            priority: 2,
            createdDate: '2024-01-01T00:00:00Z',
            updatedDate: '2024-01-01T00:00:00Z',
            tags: ['ui'],
            macroCategory: 'UI',
            subCategory: 'Layout',
            categoryReason: 'reason',
            categorizedAt: '2024-06-01T00:00:00Z'
          }
        ],
        fetchedAt: '2024-06-01T00:00:00Z',
        categorizedAt: '2024-06-01T00:00:00Z'
      }
      store.has.mockReturnValue(true)
      store.get.mockImplementation((key: string) => {
        if (key === 'schemaVersion') return 2
        if (key === 'settings') return { llmProvider: 'openai' }
        if (key === 'session') return mockSession
        if (key === 'bugCatalog') return undefined
        return undefined
      })

      migrateStore(store)

      const catalogCall = (store.set as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === 'bugCatalog'
      )
      expect(catalogCall).toBeDefined()
      const catalog = catalogCall![1] as Record<number, Record<string, unknown>>
      expect(catalog[1]).toBeDefined()
      expect(catalog[1].firstSeenAt).toBe('2024-06-01T00:00:00Z')
      expect(catalog[1].lastSeenAt).toBe('2024-06-01T00:00:00Z')
      expect(catalog[1].closedAt).toBeNull()
      expect(catalog[1].inputSignature).toEqual(expect.any(String))
      expect((catalog[1].inputSignature as string).length).toBe(16)
      expect(catalog[1].everInSimilarityGroup).toBe(false)
      expect(catalog[1].lastSimilarityGroupAt).toBeNull()
      expect(catalog[1].macroCategory).toBe('UI')
    })

    it('migration v3 sets bugCatalog to null when session is null', () => {
      store.has.mockReturnValue(true)
      store.get.mockImplementation((key: string) => {
        if (key === 'schemaVersion') return 2
        if (key === 'settings') return { llmProvider: 'openai' }
        if (key === 'session') return null
        if (key === 'bugCatalog') return undefined
        return undefined
      })

      migrateStore(store)

      expect(store.set).toHaveBeenCalledWith('bugCatalog', null)
    })

    it('migration v3 sets bugCatalog to null when session has empty bugs', () => {
      store.has.mockReturnValue(true)
      store.get.mockImplementation((key: string) => {
        if (key === 'schemaVersion') return 2
        if (key === 'settings') return { llmProvider: 'openai' }
        if (key === 'session') return { bugs: [], fetchedAt: '2024-01-01' }
        if (key === 'bugCatalog') return undefined
        return undefined
      })

      migrateStore(store)

      expect(store.set).toHaveBeenCalledWith('bugCatalog', null)
    })

    it('migration v3 marks similarity bugs when session has similarityResults', () => {
      const mockSession = {
        bugs: [
          {
            id: 10,
            title: 'Bug Ten',
            state: 'Active',
            assignee: null,
            areaPath: 'Project\\Area',
            description: 'Tenth bug',
            priority: 1,
            createdDate: '2024-01-01T00:00:00Z',
            updatedDate: '2024-01-01T00:00:00Z',
            tags: [],
            macroCategory: 'Performance',
            subCategory: 'Memory',
            categoryReason: 'reason',
            categorizedAt: '2024-06-01T00:00:00Z'
          },
          {
            id: 20,
            title: 'Bug Twenty',
            state: 'Active',
            assignee: null,
            areaPath: 'Project\\Area',
            description: 'Twentieth bug',
            priority: 2,
            createdDate: '2024-01-01T00:00:00Z',
            updatedDate: '2024-01-01T00:00:00Z',
            tags: [],
            macroCategory: 'Performance',
            subCategory: 'CPU',
            categoryReason: 'reason',
            categorizedAt: '2024-06-01T00:00:00Z'
          }
        ],
        fetchedAt: '2024-06-01T00:00:00Z',
        categorizedAt: '2024-06-01T00:00:00Z',
        similarityResults: {
          categories: [
            {
              macroCategory: 'Performance',
              groups: [{ similarityScore: 0.8, reason: 'similar', bugIds: [10] }]
            }
          ],
          analyzedAt: '2024-06-15T00:00:00Z'
        }
      }
      store.has.mockReturnValue(true)
      store.get.mockImplementation((key: string) => {
        if (key === 'schemaVersion') return 2
        if (key === 'settings') return { llmProvider: 'openai' }
        if (key === 'session') return mockSession
        if (key === 'bugCatalog') return undefined
        return undefined
      })

      migrateStore(store)

      const catalogCall = (store.set as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === 'bugCatalog'
      )
      const catalog = catalogCall![1] as Record<number, Record<string, unknown>>
      expect(catalog[10].everInSimilarityGroup).toBe(true)
      expect(catalog[10].lastSimilarityGroupAt).toBe('2024-06-15T00:00:00Z')
      expect(catalog[20].everInSimilarityGroup).toBe(false)
      expect(catalog[20].lastSimilarityGroupAt).toBeNull()
    })

    it('migration v4 renames subCategory to technicalLayer in session and catalog', () => {
      store.has.mockReturnValue(true)
      store.get.mockImplementation((key: string) => {
        if (key === 'schemaVersion') return 3
        if (key === 'settings') return { llmProvider: 'openai' }
        if (key === 'session')
          return {
            bugs: [{ id: 1, subCategory: 'FE', macroCategory: 'Costi' }],
            fetchedAt: '2024-06-01T00:00:00Z'
          }
        if (key === 'bugCatalog') return { 1: { id: 1, subCategory: 'BE', macroCategory: 'Costi' } }
        return undefined
      })

      migrateStore(store)

      const sessionCall = (store.set as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === 'session'
      )
      const session = sessionCall![1] as { bugs: Record<string, unknown>[] }
      expect(session.bugs[0].technicalLayer).toBe('FE')
      expect(session.bugs[0]).not.toHaveProperty('subCategory')
      expect(session.bugs[0].macroCategory).toBe('Costi')

      const catalogCall = (store.set as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === 'bugCatalog'
      )
      const catalog = catalogCall![1] as Record<number, Record<string, unknown>>
      expect(catalog[1].technicalLayer).toBe('BE')
      expect(catalog[1]).not.toHaveProperty('subCategory')
      expect(store.set).toHaveBeenCalledWith('schemaVersion', 4)
    })

    it('migration v4 leaves bugs without subCategory untouched', () => {
      store.has.mockReturnValue(true)
      store.get.mockImplementation((key: string) => {
        if (key === 'schemaVersion') return 3
        if (key === 'settings') return { llmProvider: 'openai' }
        if (key === 'session')
          return {
            bugs: [{ id: 1, technicalLayer: 'FE', macroCategory: 'Costi' }],
            fetchedAt: '2024-06-01T00:00:00Z'
          }
        if (key === 'bugCatalog') return null
        return undefined
      })

      migrateStore(store)

      const sessionCall = (store.set as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === 'session'
      )
      const session = sessionCall![1] as { bugs: Record<string, unknown>[] }
      expect(session.bugs[0].technicalLayer).toBe('FE')
      expect(session.bugs[0]).not.toHaveProperty('subCategory')
    })

    it('migration v4 tolerates a null session and a null catalog', () => {
      store.has.mockReturnValue(true)
      store.get.mockImplementation((key: string) => {
        if (key === 'schemaVersion') return 3
        if (key === 'settings') return { llmProvider: 'openai' }
        if (key === 'session') return null
        if (key === 'bugCatalog') return null
        return undefined
      })

      expect(() => migrateStore(store)).not.toThrow()
      expect(store.set).toHaveBeenCalledWith('schemaVersion', 4)
    })

    it('migration v3 + v4 chain renames the subCategory carried into the fresh catalog', () => {
      store.has.mockReturnValue(true)
      store.get.mockImplementation((key: string) => {
        if (key === 'schemaVersion') return 2
        if (key === 'settings') return { llmProvider: 'openai' }
        if (key === 'session')
          return {
            bugs: [
              {
                id: 7,
                title: 'Bug Seven',
                state: 'Active',
                assignee: null,
                areaPath: 'Project\\Area',
                description: 'Seventh bug',
                priority: 2,
                createdDate: '2024-01-01T00:00:00Z',
                updatedDate: '2024-01-01T00:00:00Z',
                tags: [],
                macroCategory: 'UI',
                subCategory: 'FE',
                categoryReason: 'reason',
                categorizedAt: '2024-06-01T00:00:00Z'
              }
            ],
            fetchedAt: '2024-06-01T00:00:00Z'
          }
        if (key === 'bugCatalog') return undefined
        return undefined
      })

      migrateStore(store)

      const catalogCall = (store.set as ReturnType<typeof vi.fn>).mock.calls.find(
        (c: unknown[]) => c[0] === 'bugCatalog'
      )
      const catalog = catalogCall![1] as Record<number, Record<string, unknown>>
      expect(catalog[7].technicalLayer).toBe('FE')
      expect(catalog[7]).not.toHaveProperty('subCategory')
      expect(catalog[7].inputSignature).toEqual(expect.any(String))
    })

    it('runs all migrations from v0 to v4 cleanly', () => {
      store.has.mockReturnValue(false)
      store.get.mockImplementation((key: string) => {
        if (key === 'settings')
          return { llmProvider: 'github-copilot', copilotAuthStatus: 'authenticated' }
        if (key === 'session') return null
        if (key === 'bugCatalog') return undefined
        return undefined
      })

      migrateStore(store)

      expect(store.set).toHaveBeenCalledWith(
        'settings',
        expect.objectContaining({ llmProvider: 'openai' })
      )
      expect(store.set).toHaveBeenCalledWith('bugCatalog', null)
      expect(store.set).toHaveBeenCalledWith('schemaVersion', 4)
    })

    it('migrateStore persists bugCatalog key during migration', () => {
      store.has.mockReturnValue(true)
      store.get.mockImplementation((key: string) => {
        if (key === 'schemaVersion') return 2
        if (key === 'settings') return {}
        if (key === 'session')
          return {
            bugs: [
              {
                id: 1,
                title: 'T',
                state: 'Active',
                assignee: null,
                areaPath: 'A',
                description: 'D',
                priority: 1,
                createdDate: '2024-01-01',
                updatedDate: '2024-01-01',
                tags: [],
                macroCategory: '',
                subCategory: '',
                categoryReason: '',
                categorizedAt: ''
              }
            ],
            fetchedAt: '2024-01-01'
          }
        if (key === 'bugCatalog') return undefined
        return undefined
      })

      migrateStore(store)

      const bugCatalogCalls = (store.set as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c: unknown[]) => c[0] === 'bugCatalog'
      )
      expect(bugCatalogCalls.length).toBeGreaterThan(0)
    })

    it('should reset session and set schemaVersion when migration throws', () => {
      store.has.mockReturnValue(false)
      store.get.mockReturnValue(undefined)

      const originalMigrations = [...migrations]
      const errorMigration = {
        version: 1,
        up: (): Record<string, unknown> => {
          throw new Error('migration broke')
        }
      }
      migrations.splice(0, migrations.length, errorMigration)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      migrateStore(store)

      expect(consoleSpy).toHaveBeenCalledWith('Store migration failed:', expect.any(Error))
      expect(store.set).toHaveBeenCalledWith('session', null)
      expect(store.set).toHaveBeenCalledWith('schemaVersion', CURRENT_SCHEMA_VERSION)

      // Restore original migrations
      migrations.splice(0, migrations.length, ...originalMigrations)
    })
  })
})
