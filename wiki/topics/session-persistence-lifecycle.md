---
title: 'Session Persistence Lifecycle'
type: topic
created: 2026-05-01
updated: 2026-05-01
sources:
  [
    '[[wiki/sources/ft-03-ado-fetch]]',
    '[[wiki/sources/ft-04-llm-provider]]',
    '[[wiki/sources/ft-05-dashboard]]',
    '[[wiki/sources/ft-07-session-persistence]]'
  ]
tags: [session, persistence, dashboard, settings, migration]
lang: en
---

## Overview

Session data in Bug Categorizer is a cross-cutting concern: it is populated by fetch/categorize flows in the main process, consumed by the dashboard in the renderer, upgraded at startup through schema migration, and can now be cleared intentionally from Settings. FT-07 turns this into a complete lifecycle instead of a write-only cache.

## End-to-End Flow

```
Application startup
  → [[wiki/entities/store-migration]]
    → encrypted [[wiki/entities/electron-store]]

Fetch / categorize
  → [[wiki/entities/ipc-handlers]]
    → store.set('session', SessionData)

Dashboard load
  → [[wiki/entities/use-dashboard-hook]]
    → getSession()
    → [[wiki/entities/dashboard-header]]
      → [[wiki/entities/date-format-utility]]

Manual reset
  → [[wiki/entities/settings-page]]
    → [[wiki/entities/confirm-dialog]]
    → clearSession()
    → store.set('session', null)
```

## Lifecycle Stages

### Bootstrap

- [[wiki/entities/store-migration]] upgrades persisted payloads before any IPC surface is active.
- [[wiki/concepts/schema-versioned-store-migration]] keeps compatibility logic centralized.

### Populate

- FT-03 fetch writes a fresh session payload with fetched bugs and `fetchedAt`.
- FT-04 categorize updates the same session payload with category fields and `categorizedAt`.

### Consume

- [[wiki/entities/use-dashboard-hook]] hydrates renderer state from the stored session.
- [[wiki/entities/dashboard-header]] renders human-readable freshness timestamps.
- The rest of [[wiki/topics/dashboard-bug-exploration]] derives filters, KPIs, and views from the hydrated session bugs.

### Reset

- [[wiki/entities/settings-page]] exposes a danger zone instead of auto-clearing data.
- [[wiki/concepts/accessible-confirmation-dialog]] ensures the destructive action is guarded and keyboard-accessible.
- Clearing the session removes cached bug data but preserves saved ADO/LLM settings.

## Why This Topic Matters

- Session data is the bridge between background integrations and the interactive dashboard UX.
- Boot-time migration and user-triggered reset both affect whether the dashboard has meaningful state to render.
- The same persistence layer now supports both convenience (cached work) and recovery (safe clearing of stale or incompatible session data).

## See also

- [[wiki/entities/store-migration]]
- [[wiki/entities/settings-page]]
- [[wiki/entities/dashboard-header]]
- [[wiki/concepts/settings-persistence-flow]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/topics/dashboard-bug-exploration]]
