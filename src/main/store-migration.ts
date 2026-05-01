export const CURRENT_SCHEMA_VERSION = 2

export type Migration = {
  version: number
  up: (data: Record<string, unknown>) => Record<string, unknown>
}

export const migrations: Migration[] = [
  {
    version: 1,
    up: (data) => data
  },
  {
    version: 2,
    up: (data) => {
      if (data.settings && typeof data.settings === 'object') {
        const settings = data.settings as Record<string, unknown>
        if (settings.llmProvider === 'github-copilot') {
          settings.llmProvider = 'openai'
        }
        delete settings.copilotAuthStatus
      }
      return data
    }
  }
]

export interface StoreAccess {
  get: (key: string) => unknown
  set: (key: string, value: unknown) => void
  has?: (key: string) => boolean
}

export function migrateStore(store: StoreAccess): void {
  // Detect legacy stores: if schemaVersion key was never set, treat as version 0.
  // We cannot rely on defaults because electron-store returns defaults for missing keys.
  const hasSchemaVersion = store.has
    ? store.has('schemaVersion')
    : store.get('schemaVersion') !== undefined
  const schemaVersion = hasSchemaVersion ? (store.get('schemaVersion') as number) : 0

  if (schemaVersion >= CURRENT_SCHEMA_VERSION) {
    return
  }

  try {
    const pending = migrations.filter((m) => m.version > schemaVersion)
    let data: Record<string, unknown> = {
      settings: store.get('settings'),
      session: store.get('session')
    }
    for (const migration of pending) {
      data = migration.up(data)
    }
    // Persist migrated data before bumping schema version (atomic ordering)
    if (data.settings !== undefined) store.set('settings', data.settings)
    if (data.session !== undefined) store.set('session', data.session)
    store.set('schemaVersion', CURRENT_SCHEMA_VERSION)
  } catch (error) {
    console.error('Store migration failed:', error)
    store.set('session', null)
    store.set('schemaVersion', CURRENT_SCHEMA_VERSION)
  }
}
