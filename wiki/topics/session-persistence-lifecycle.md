---
title: 'Session Persistence Lifecycle'
type: topic
created: 2026-05-01
updated: 2026-05-21
sources:
  [
    '[[wiki/sources/ft-03-ado-fetch]]',
    '[[wiki/sources/ft-04-llm-provider]]',
    '[[wiki/sources/ft-05-dashboard]]',
    '[[wiki/sources/ft-07-session-persistence]]',
    '[[wiki/sources/ft-10-ai-cluster-similarity]]',
    '[[wiki/sources/ft-12-incremental-session-cache]]',
    '[[wiki/sources/ft-13-closed-bugs-history]]',
    '[[wiki/sources/ft-14e-multi-session-agent-workspace]]'
  ]
tags: [session, catalog, persistence, dashboard, ai-cluster, settings, migration, agent]
lang: en
---

## Overview

Session persistence in Bug Categorizer is now a three-surface concern. `session` is the renderer-facing snapshot of currently open bugs and their derived analysis state, `bugCatalog` is the historical main-process catalog used for lifecycle tracking and categorization reuse, and FT-14E adds retained `agentSessions` for recent agent-analysis history and crash recovery. Together they are populated by fetch, categorize, similarity-analysis, and agent-session flows, upgraded at startup through schema migration, and selectively cleared or pruned by the main process.

## End-to-End Flow

```text
Application startup
  -> [[wiki/entities/store-migration]]
    -> encrypted [[wiki/entities/electron-store]]
    -> { session, bugCatalog, agentSessions }

Agent-session startup recovery
  -> [[wiki/entities/ipc-handlers]]
    -> [[wiki/entities/agent-session-persistence]]
      -> loadPersistedSessions()
      -> markStaleRunning()
      -> pruneExpiredSessions()
      -> SessionManager.restoreSessions()

Fetch / categorize
  -> [[wiki/entities/ipc-handlers]]
    -> [[wiki/entities/catalog-merge-utility]]
    -> store.set('bugCatalog', BugCatalog)
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
    -> update catalog similarity metadata

Manual reset
  -> [[wiki/entities/settings-page]]
    -> [[wiki/entities/confirm-dialog]]
    -> clearSession() or clearCatalog()
    -> store.set('session', null) or store.set('bugCatalog', null)

Agent-session retention
  -> [[wiki/entities/ipc-handlers]]
    -> agent:start
      -> [[wiki/entities/agent-session-persistence]].persistSession(running)
    -> terminal agent states
      -> persistSession(completed | aborted | error)
```

## Lifecycle Stages

### Bootstrap

- [[wiki/entities/store-migration]] upgrades persisted payloads before any IPC surface is active.
- [[wiki/concepts/schema-versioned-store-migration]] keeps compatibility logic centralized.
- FT-12's v3 migration can reconstruct `bugCatalog` from an older v2 session so the app can start selective reuse immediately after upgrade.

### Populate

- FT-03 fetch still writes a fresh session payload with fetched bugs and `fetchedAt`, but FT-12 now derives that session from a catalog-aware merge instead of treating each fetch as a full reset.
- The fetch path also stores `lastFetchNewCount` in `session`, a renderer-safe summary of how many fetched bugs were truly new compared with the historical `bugCatalog` before the merge.
- FT-12 maintains `bugCatalog` as the long-lived record of every seen bug, including `firstSeenAt`, `lastSeenAt`, `closedAt`, `inputSignature`, and similarity-history metadata.
- FT-04 categorize updates the session payload with category fields and `categorizedAt`, while FT-12 merges those same results back into `bugCatalog` only for the bugs that were actually sent to the LLM.
- FT-10 similarity analysis appends `similarityResults` to the session and now also marks matching historical catalog entries with `everInSimilarityGroup` and `lastSimilarityGroupAt`.

### Consume

- [[wiki/entities/use-dashboard-hook]] hydrates renderer state from the stored session.
- [[wiki/entities/use-ai-cluster-hook]] hydrates the stored bug list plus optional `similarityResults`.
- [[wiki/entities/use-closed-bug-kpis-hook]] reads a filtered closed-only catalog slice plus `session.fetchedAt`, then derives historical KPIs for the dedicated FT-13 route.
- [[wiki/entities/dashboard-header]] renders human-readable freshness timestamps and the latest `lastFetchNewCount` summary under the fetch action.
- The rest of [[wiki/topics/dashboard-bug-exploration]] derives filters, KPIs, and views from the hydrated session bugs.
- The renderer still does not receive the full `bugCatalog` by default, so a large historical catalog does not expand dashboard payload size; FT-13 only adds a filtered closed-history read model.

### Refresh and Staleness

- Similarity results are intentionally persistent and survive navigation.
- FT-10 adds a stale check: when `categorizedAt` becomes newer than `similarityResults.analyzedAt`, the dashboard `Similarità` tab warns that the analysis may need to be rerun.
- FT-12 preserves the existing stale rule by avoiding unnecessary rewrites of `categorizedAt` when a categorize request finds nothing new to process.

### Reset

- [[wiki/entities/settings-page]] exposes two danger zones instead of auto-clearing data.
- [[wiki/concepts/accessible-confirmation-dialog]] ensures the destructive action is guarded and keyboard-accessible.
- Clearing the session removes the open snapshot but preserves the historical bug catalog and saved ADO/LLM settings.
- Clearing the catalog removes historical lifecycle and categorization reuse data but leaves the current session snapshot untouched.

### Agent Session Retention and Recovery

- FT-14E stores retained agent sessions separately from both the bug `session` snapshot and the `bugCatalog`.
- Persisted agent sessions are kept for 24 hours and trimmed to 200 stored chunks per session.
- Startup recovery restores recent sessions for inspection, but any stale `running` session is rewritten as `aborted` because the underlying SDK work cannot be resumed safely.
- The Dashboard workspace then fetches summaries first and full session detail on demand, which keeps retained history useful without loading every stored log eagerly.

## Why This Topic Matters

- Session data is the bridge between background integrations and the interactive renderer UX.
- Boot-time migration and user-triggered reset both affect whether the dashboard has meaningful fetched, categorized, and similarity state to render.
- Splitting `session` from `bugCatalog` keeps renderer hydration cheap while still retaining enough history to avoid redundant LLM work on unchanged bugs.
- The same persistence layer now supports both convenience (cached work and categorization reuse) and recovery (safe clearing of stale snapshot or historical data).

## See also

- [[wiki/entities/store-migration]]
- [[wiki/entities/settings-page]]
- [[wiki/entities/dashboard-header]]
- [[wiki/entities/catalog-merge-utility]]
- [[wiki/entities/agent-session-persistence]]
- [[wiki/concepts/settings-persistence-flow]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/concepts/catalog-backed-selective-re-categorization]]
- [[wiki/topics/agent-session-workspace]]
- [[wiki/topics/dashboard-bug-exploration]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
