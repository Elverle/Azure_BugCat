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
    it('should export CURRENT_SCHEMA_VERSION as 2', () => {
      expect(CURRENT_SCHEMA_VERSION).toBe(2)
    })

    it('should export migrations array with two entries', () => {
      expect(migrations).toHaveLength(2)
      expect(migrations[0].version).toBe(1)
      expect(migrations[1].version).toBe(2)
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
