---
title: 'Store Migration'
type: entity
subtype: service
created: 2026-05-01
updated: 2026-05-17
sources:
  [
    '[[wiki/sources/ft-07-session-persistence]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-12-incremental-session-cache]]',
    '[[wiki/sources/ft-14a-agent-configuration-project-registry]]'
  ]
tags: [electron-store, persistence, migration, typescript, catalog, settings]
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
- FT-14A adds migration v4, which backfills only missing settings keys for agent-provider selection, Copilot BYOK, project registry, architecture context, and max concurrent sessions.
- Writes migrated `settings`, `session`, and `bugCatalog` back to the store before bumping `schemaVersion`, so a partial write cannot advertise a schema that has not actually been persisted yet.
- Falls back to `session = null` plus `schemaVersion = CURRENT_SCHEMA_VERSION` if a migration throws, keeping the app bootable even if cached session data is invalid.

## Dependencies

- [[wiki/entities/electron-store]] — persistence backend consumed through the narrow `StoreAccess` interface
- `src/main/index.ts` — calls `migrateStore(store)` during `app.whenReady()`

## See also

- [[wiki/entities/electron-store]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/concepts/settings-persistence-flow]]
- [[wiki/topics/agent-session-configuration-foundation]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
