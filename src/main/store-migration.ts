import { computeInputSignature } from './utils/catalog-merge'

export const CURRENT_SCHEMA_VERSION = 4

export type Migration = {
  version: number
  up: (data: Record<string, unknown>) => Record<string, unknown>
}

/**
 * Italian -> machine-value conversions applied by the v4 migration, keyed by
 * persisted field. Only exact matches are converted: an empty string means
 * "not categorized yet" (see CategorizedBug in shared/types.ts) and a user's
 * own category name must survive untouched.
 *
 * The values are written out as literals rather than imported from the shared
 * constants on purpose: a migration describes a historical state of the data,
 * and has to keep working even if those constants change again later.
 */
const SENTINEL_CONVERSIONS: Record<string, Record<string, string>> = {
  technicalLayer: {
    'Non determinabile': 'Undetermined'
  }
}

function convertSentinels(bug: Record<string, unknown>): Record<string, unknown> {
  for (const [field, mapping] of Object.entries(SENTINEL_CONVERSIONS)) {
    const current = bug[field]
    if (typeof current === 'string' && current in mapping) {
      bug[field] = mapping[current]
    }
  }
  return bug
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
  },
  {
    version: 3,
    up: (data) => {
      const session = data.session as {
        bugs: Record<string, unknown>[]
        fetchedAt: string
        categorizedAt?: string
        similarityResults?: {
          categories: {
            macroCategory: string
            groups: { similarityScore: number; reason: string; bugIds: number[] }[]
            error?: string
          }[]
          analyzedAt: string
        }
      } | null

      if (!session || !session.bugs || session.bugs.length === 0) {
        data.bugCatalog = null
        return data
      }

      const catalog: Record<number, Record<string, unknown>> = {}

      for (const bug of session.bugs) {
        const id = bug.id as number
        // Normalize legacy bug fields for safe signature computation
        const safeBug = {
          id,
          title: typeof bug.title === 'string' ? bug.title : '',
          state: typeof bug.state === 'string' ? bug.state : '',
          assignee: typeof bug.assignee === 'string' ? bug.assignee : null,
          areaPath: typeof bug.areaPath === 'string' ? bug.areaPath : '',
          description: typeof bug.description === 'string' ? bug.description : '',
          priority: typeof bug.priority === 'number' ? bug.priority : 0,
          createdDate: typeof bug.createdDate === 'string' ? bug.createdDate : '',
          updatedDate: typeof bug.updatedDate === 'string' ? bug.updatedDate : '',
          tags: Array.isArray(bug.tags) ? (bug.tags as string[]) : []
        }
        catalog[id] = {
          ...bug,
          firstSeenAt: session.fetchedAt,
          lastSeenAt: session.fetchedAt,
          closedAt: null,
          inputSignature: computeInputSignature(safeBug),
          everInSimilarityGroup: false,
          lastSimilarityGroupAt: null
        }
      }

      if (session.similarityResults) {
        const analyzedAt = session.similarityResults.analyzedAt
        for (const category of session.similarityResults.categories) {
          for (const group of category.groups) {
            for (const bugId of group.bugIds) {
              if (catalog[bugId]) {
                catalog[bugId].everInSimilarityGroup = true
                catalog[bugId].lastSimilarityGroupAt = analyzedAt
              }
            }
          }
        }
      }

      data.bugCatalog = catalog
      return data
    }
  },
  {
    version: 4,
    up: (data) => {
      // Rename subCategory -> technicalLayer everywhere the field was persisted.
      //
      // NOTE (Fase 2): this same `up` will be EXTENDED with the italian -> english
      // sentinel conversion. Confirmed on 2026-08-12 that it stays v4 and does not
      // become a v5. Two consequences follow, neither of them enforced by code:
      //
      //   1. No release between Fase 1 and Fase 2. `migrateStore` returns early on
      //      schemaVersion >= CURRENT_SCHEMA_VERSION, so a store that reached 4
      //      under the rename-only `up` never runs the extended one.
      //
      //   2. The developer's own machine is not exempt. Any store that opened the
      //      app between this commit and Fase 2 has to have its schemaVersion
      //      lowered, or its config reset, once the sentinel conversion lands —
      //      otherwise it keeps the italian sentinels forever.
      // The rename runs first, so convertSentinels already sees `technicalLayer`.
      const migrateBug = (bug: Record<string, unknown>): Record<string, unknown> => {
        if ('subCategory' in bug) {
          bug.technicalLayer = bug.subCategory
          delete bug.subCategory
        }
        return convertSentinels(bug)
      }

      const session = data.session as { bugs?: Record<string, unknown>[] } | null
      if (session?.bugs) session.bugs = session.bugs.map(migrateBug)

      const catalog = data.bugCatalog as Record<string, Record<string, unknown>> | null
      if (catalog) {
        for (const key of Object.keys(catalog)) catalog[key] = migrateBug(catalog[key])
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
      session: store.get('session'),
      bugCatalog: store.get('bugCatalog')
    }
    for (const migration of pending) {
      data = migration.up(data)
    }
    // Persist migrated data before bumping schema version (atomic ordering)
    if (data.settings !== undefined) store.set('settings', data.settings)
    if (data.session !== undefined) store.set('session', data.session)
    if (data.bugCatalog !== undefined) store.set('bugCatalog', data.bugCatalog)
    store.set('schemaVersion', CURRENT_SCHEMA_VERSION)
  } catch (error) {
    console.error('Store migration failed:', error)
    store.set('session', null)
    store.set('schemaVersion', CURRENT_SCHEMA_VERSION)
  }
}
