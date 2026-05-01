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
    '[[wiki/sources/ft-07-session-persistence]]',
    '[[wiki/sources/ft-10-ai-cluster-similarity]]'
  ]
tags: [session, persistence, dashboard, ai-cluster, settings, migration]
lang: en
---

## Overview

Session data in Bug Categorizer is a cross-cutting concern: it is populated by fetch, categorize, and similarity-analysis flows in the main process, consumed by the dashboard and settings surfaces in the renderer, upgraded at startup through schema migration, and can be cleared intentionally from Settings. FT-07 made the lifecycle explicit; FT-10 extends it with a second derived analysis artifact.

## End-to-End Flow

```text
Application startup
  -> [[wiki/entities/store-migration]]
    -> encrypted [[wiki/entities/electron-store]]

Fetch / categorize
  -> [[wiki/entities/ipc-handlers]]
    -> store.set('session', SessionData)

Dashboard load
  -> [[wiki/entities/use-dashboard-hook]]
    -> getSession()
    -> [[wiki/entities/dashboard-header]]
      -> [[wiki/entities/date-format-utility]]

Similarity load / analyze
  -> [[wiki/entities/use-ai-cluster-hook]]
    -> getSession()
    -> findSimilarBugs()
    -> store.set('session', { ...session, similarityResults })

Manual reset
  -> [[wiki/entities/settings-page]]
    -> [[wiki/entities/confirm-dialog]]
    -> clearSession()
    -> store.set('session', null)
```

## Lifecycle Stages

### Bootstrap

- [[wiki/entities/store-migration]] upgrades persisted payloads before any IPC surface is active.
- [[wiki/concepts/schema-versioned-store-migration]] keeps compatibility logic centralized.

### Populate

- FT-03 fetch writes a fresh session payload with fetched bugs and `fetchedAt`.
- FT-04 categorize updates the same session payload with category fields and `categorizedAt`.
- FT-10 similarity analysis appends `similarityResults` without replacing the categorized bug list.

### Consume

- [[wiki/entities/use-dashboard-hook]] hydrates renderer state from the stored session.
- [[wiki/entities/use-ai-cluster-hook]] hydrates the stored bug list plus optional `similarityResults`.
- [[wiki/entities/dashboard-header]] renders human-readable freshness timestamps.
- The rest of [[wiki/topics/dashboard-bug-exploration]] derives filters, KPIs, and views from the hydrated session bugs.

### Refresh and Staleness

- Similarity results are intentionally persistent and survive navigation.
- FT-10 adds a stale check: when `categorizedAt` becomes newer than `similarityResults.analyzedAt`, the dashboard `Similarità` tab warns that the analysis may need to be rerun.

### Reset

- [[wiki/entities/settings-page]] exposes a danger zone instead of auto-clearing data.
- [[wiki/concepts/accessible-confirmation-dialog]] ensures the destructive action is guarded and keyboard-accessible.
- Clearing the session removes cached bug data but preserves saved ADO/LLM settings.

## Why This Topic Matters

- Session data is the bridge between background integrations and the interactive renderer UX.
- Boot-time migration and user-triggered reset both affect whether the dashboard has meaningful fetched, categorized, and similarity state to render.
- The same persistence layer now supports both convenience (cached work) and recovery (safe clearing of stale or incompatible session data).

## See also

- [[wiki/entities/store-migration]]
- [[wiki/entities/settings-page]]
- [[wiki/entities/dashboard-header]]
- [[wiki/concepts/settings-persistence-flow]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/topics/dashboard-bug-exploration]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
