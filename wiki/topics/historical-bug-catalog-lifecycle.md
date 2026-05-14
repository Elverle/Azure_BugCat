---
title: 'Historical Bug Catalog Lifecycle'
type: topic
created: 2026-05-13
updated: 2026-05-13
sources:
  [
    '[[wiki/sources/ft-07-session-persistence]]',
    '[[wiki/sources/ft-10-ai-cluster-similarity]]',
    '[[wiki/sources/ft-12-incremental-session-cache]]',
    '[[wiki/sources/ft-13-closed-bugs-history]]'
  ]
tags: [catalog, lifecycle, session, fetch, llm, settings, migration]
lang: en
---

## Overview

The historical bug catalog is the new long-lived persistence layer introduced in FT-12. Unlike `session`, which contains only the current open-bug snapshot rendered by the UI, `bugCatalog` is a main-process data structure that accumulates every bug ever seen and tracks enough lifecycle metadata to support incremental fetch merge, selective categorization reuse, similarity-history bookkeeping, and the FT-13 closed-history analytics view.

## End-to-End Flow

```text
Bootstrap
  -> [[wiki/entities/store-migration]]
     -> migrate legacy session data into bugCatalog when needed

ADO fetch
  -> [[wiki/entities/ipc-handlers]]
     -> [[wiki/entities/catalog-merge-utility]].mergeFetchIntoCatalog()
     -> store.set('bugCatalog', updatedCatalog)
     -> store.set('session', { bugs: openSnapshot, fetchedAt })

LLM categorize
  -> session.bugs.filter(!categorizedAt)
  -> [[wiki/entities/llm-service]]
  -> [[wiki/entities/catalog-merge-utility]].mergeCategorization()
  -> store.set('session', updatedSession)
  -> store.set('bugCatalog', updatedCatalog)

Similarity
  -> [[wiki/entities/similarity-service]](session.bugs)
  -> store.set('session', { ...session, similarityResults })
  -> [[wiki/entities/catalog-merge-utility]].updateCatalogSimilarityMetadata()

Closed-history analytics
  -> [[wiki/entities/closed-bugs-page]]
     -> [[wiki/entities/use-closed-bug-kpis-hook]]
     -> getCatalogClosed()
     -> [[wiki/entities/ipc-handlers]] filters `bugCatalog` to `closedAt !== null`
  -> renderer computes derived KPIs from the returned slice, `session.fetchedAt`, and `catalogMetadata.lastClearedAt`

Cleanup
  -> [[wiki/entities/settings-page]]
     -> clearSession() or clearCatalog()
```

## Catalog State Model

### First Seen

- New bugs enter the catalog with `firstSeenAt = lastSeenAt = now`.
- They start uncategorized and have `closedAt = null`.

### Reused Open Bug

- If a fetched bug reappears with the same categorization signature, its historical categorization is copied into the new session snapshot.
- `lastSeenAt` advances, `closedAt` is reset to `null`, and no LLM roundtrip is needed.

### Changed Open Bug

- If the fetched inputs no longer match `inputSignature`, the catalog entry stays but the new session snapshot clears category fields.
- The next categorization run updates both the session bug and the historical catalog entry.

### Absent / Closed

- If a previously open catalog entry is missing from the latest fetch, `closedAt` is set to the fetch timestamp.
- The bug remains in the catalog and drops out of the open session snapshot.

### Similarity-Marked

- Bugs that appear in any similarity group are marked with `everInSimilarityGroup = true`.
- `lastSimilarityGroupAt` records the latest analysis timestamp that included that bug.

## Boundaries

- The renderer never receives the full catalog by default.
- FT-13 introduces a closed-only analytical slice through `catalog:get-closed`, not a general catalog browser or mutation API.
- `clearCatalog()` now also defines the historical baseline by persisting `catalogMetadata.lastClearedAt`; FT-13 uses that value only for read-only KPI explanation.
- The main process owns all catalog writes.
- Settings exposes explicit cleanup for snapshot-only reset versus history reset, and the renderer now has a read-only closed-history page instead of a generic historical explorer.

## Why This Topic Matters

- It explains why repeated fetches are now cheaper and less destructive than the original full-reset model.
- It ties together migration, fetch, categorization, similarity, and cleanup behavior into one persistence story.
- It documents the current limits of the feature, especially the absence of a renderer-facing full catalog browser even after FT-13's closed-history page.

## See also

- [[wiki/entities/electron-store]]
- [[wiki/entities/catalog-merge-utility]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/topics/closed-bug-history-analytics]]
- [[wiki/concepts/catalog-backed-selective-re-categorization]]
- [[wiki/topics/session-persistence-lifecycle]]
