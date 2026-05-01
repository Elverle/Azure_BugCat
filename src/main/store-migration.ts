export const CURRENT_SCHEMA_VERSION = 1

export type Migration = {
  version: number
  up: (data: Record<string, unknown>) => Record<string, unknown>
}

export const migrations: Migration[] = [
  {
    version: 1,
    up: (data) => data
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
      store.set('schemaVersion', migration.version)
    }
    // Persist migrated data back
    if (data.settings !== undefined) store.set('settings', data.settings)
    if (data.session !== undefined) store.set('session', data.session)
  } catch (error) {
    console.error('Store migration failed:', error)
    store.set('session', null)
    store.set('schemaVersion', CURRENT_SCHEMA_VERSION)
  }
}
