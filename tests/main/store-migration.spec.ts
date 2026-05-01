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
    it('should export CURRENT_SCHEMA_VERSION as 1', () => {
      expect(CURRENT_SCHEMA_VERSION).toBe(1)
    })

    it('should export migrations array with one entry', () => {
      expect(migrations).toHaveLength(1)
      expect(migrations[0].version).toBe(1)
    })
  })

  describe('migrateStore', () => {
    it('should run migration when schemaVersion key does not exist (legacy store)', () => {
      store.has.mockReturnValue(false)
      store.get.mockReturnValue(undefined)

      migrateStore(store)

      expect(store.has).toHaveBeenCalledWith('schemaVersion')
      expect(store.set).toHaveBeenCalledWith('schemaVersion', 1)
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

      // Version 0→1 is a no-op, so data should be persisted as-is
      expect(store.set).toHaveBeenCalledWith('schemaVersion', 1)
      expect(store.set).toHaveBeenCalledWith('settings', mockSettings)
      expect(store.set).toHaveBeenCalledWith('session', mockSession)
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
