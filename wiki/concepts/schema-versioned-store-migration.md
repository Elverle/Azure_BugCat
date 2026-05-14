---
title: 'Schema-Versioned Store Migration'
type: concept
created: 2026-05-01
updated: 2026-05-13
sources:
  [
    '[[wiki/sources/ft-07-session-persistence]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-12-incremental-session-cache]]'
  ]
tags: [electron-store, persistence, migration, schema-versioning, catalog]
lang: en
---

## Definition

Persistence schema changes are managed through an explicit `schemaVersion` key and an ordered migration pipeline that runs during application bootstrap. Instead of silently reshaping data at read time, the project upgrades the stored payload once before any runtime feature depends on it.

## How It Works in This Project

- [[wiki/entities/store-migration]] exports `CURRENT_SCHEMA_VERSION`, a `migrations` array, and `migrateStore(store)`.
- Startup code in `src/main/index.ts` runs `migrateStore(store)` before `registerIPCHandlers()` or `createWindow()`.
- Legacy stores are identified by checking whether `schemaVersion` actually exists, not by reading a defaulted value.
- The migration layer reads existing `settings` and `session` payloads, applies pending migration steps in ascending version order, and writes the final data back.
- FT-08 demonstrates a compatibility migration that rewrites deprecated provider state (`github-copilot` → `openai`) and drops removed keys (`copilotAuthStatus`).
- FT-12 extends the pipeline with schema v3, which derives `bugCatalog` from legacy `session.bugs`, normalizes old bug fields before hashing, and preserves similarity-history metadata where possible.
- The final payload is persisted before the schema version bump is written, so version metadata cannot get ahead of actual migrated data.
- If a migration throws, the app prefers recoverability over perfect session retention by clearing `session` and forcing the current schema version.

## Why It Matters Here

- Cached session data is a convenience layer, so boot failures caused by stale or malformed session payloads would be a disproportionate cost.
- The same reasoning now applies to the historical catalog: migration centralizes the one-time transformation instead of forcing fetch/categorize handlers to understand every past persistence shape.
- A versioned pipeline scales better than scattering compatibility checks across `ipc-handlers.ts`, renderer hooks, or individual store reads.
- Keeping `schemaVersion` out of defaults preserves the ability to distinguish truly legacy stores from fresh installs.

## Trade-offs

- **Pro:** Startup compatibility logic is centralized and unit-testable.
- **Pro:** Future schema bumps can add discrete migrations instead of rewriting handlers.
- **Con:** A failed migration currently discards session state rather than attempting partial recovery.
- **Con:** The migration interface is intentionally generic (`Record<string, unknown>`), so type guarantees inside each migration remain manual.
- **Con:** FT-12's v3 backfill cannot distinguish a bug that disappeared because it was closed from one that merely left the saved query scope; both begin with `closedAt = null` until future fetches resolve the state.

## See also

- [[wiki/entities/store-migration]]
- [[wiki/entities/electron-store]]
- [[wiki/concepts/settings-persistence-flow]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
