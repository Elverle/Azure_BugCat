---
title: 'Store Migration'
type: entity
subtype: service
created: 2026-05-01
updated: 2026-08-18
sources:
  [
    '[[wiki/sources/ft-07-session-persistence]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-12-incremental-session-cache]]'
  ]
tags: [electron-store, persistence, migration, typescript, catalog]
lang: en
---

## Description

Main-process utility that upgrades persisted `electron-store` payloads to the current schema version before the rest of the application starts. It keeps migration logic explicit and testable instead of spreading one-off compatibility checks across IPC handlers.

## Location

`src/main/store-migration.ts`

## Public API

```typescript
export const CURRENT_SCHEMA_VERSION = 4

export type Migration = {
  version: number
  up: (data: Record<string, unknown>) => Record<string, unknown>
}

export interface StoreAccess {
  get: (key: string) => unknown
  set: (key: string, value: unknown) => void
  has?: (key: string) => boolean
}

export function migrateStore(store: StoreAccess): void
```

## Behavior

- Detects legacy stores by checking whether `schemaVersion` actually exists, using `store.has('schemaVersion')` when available.
- Treats a missing `schemaVersion` key as version `0`, which allows pre-FT-07 stores to enter the migration pipeline.
- Loads real persisted `settings` and `session` data before applying pending migrations, instead of migrating empty placeholders.
- Applies pending migrations in ascending version order, including FT-08's `github-copilot` → `openai` settings rewrite and `copilotAuthStatus` removal.
- FT-12 adds migration v3, which back-populates `bugCatalog` from legacy v2 `session.bugs`, normalizes legacy bug fields before signature computation, and preserves similarity-history metadata when `session.similarityResults` already exists.
- Migration v4 renames the persisted `subCategory` field to `technicalLayer` on every bug (session, catalog, and their fallback default), then runs `convertSentinels()` against a per-field table (`SENTINEL_CONVERSIONS`, keyed by `macroCategory` / `technicalLayer` / `categoryReason`) that rewrites previously-persisted Italian sentinel text to the machine-value sentinels from [[wiki/entities/categorization-sentinels]] — see [[wiki/concepts/sentinel-value-label-separation]] for the full mapping and its one known gap. The same conversion also runs against the `macroCategory` recorded inside `session.similarityResults.categories`, since a stale Italian category name there would stop matching the bugs the rename+conversion just updated. `SENTINEL_CONVERSIONS` deliberately hardcodes its Italian keys as literals rather than importing the current sentinel constants, because a migration describes a historical state of the data and has to keep working even if those constants change again later.
- Writes migrated `settings`, `session`, and `bugCatalog` back to the store before bumping `schemaVersion`, so a partial write cannot advertise a schema that has not actually been persisted yet.
- Falls back to `session = null` plus `schemaVersion = CURRENT_SCHEMA_VERSION` if a migration throws, keeping the app bootable even if cached session data is invalid.

## Known Risk: v4 Shipped in Two States

Migration v4's `up()` first landed rename-only (`subCategory` → `technicalLayer`), and was later extended in place with the sentinel conversion — deliberately staying v4 instead of becoming v5. Since `migrateStore()` returns early once `schemaVersion >= CURRENT_SCHEMA_VERSION`, a store that already reached schema 4 under the rename-only build will never run the extended conversion and keeps Italian sentinels forever. The realistic case is a developer machine that opened the app between the two states, since no release shipped the rename-only version; recovering such a store needs its `schemaVersion` lowered or its config reset.

## Dependencies

- [[wiki/entities/electron-store]] — persistence backend consumed through the narrow `StoreAccess` interface
- [[wiki/entities/categorization-sentinels]] — target values for the v4 sentinel conversion (referenced as literals, not imports)
- `src/main/index.ts` — calls `migrateStore(store)` during `app.whenReady()`

## See also

- [[wiki/entities/electron-store]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/concepts/settings-persistence-flow]]
- [[wiki/concepts/sentinel-value-label-separation]]
- [[wiki/entities/categorization-sentinels]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
