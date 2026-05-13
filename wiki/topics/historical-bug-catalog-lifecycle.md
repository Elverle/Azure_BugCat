---
title: 'Historical Bug Catalog Lifecycle'
type: topic
created: 2026-05-13
updated: 2026-05-13
sources:
  [
    '[[wiki/sources/ft-07-session-persistence]]',
    '[[wiki/sources/ft-10-ai-cluster-similarity]]',
    '[[wiki/sources/ft-12-incremental-session-cache]]'
  ]
tags: [catalog, lifecycle, session, fetch, llm, settings, migration]
lang: en
---

## Overview

The historical bug catalog is the new long-lived persistence layer introduced in FT-12. Unlike `session`, which contains only the current open-bug snapshot rendered by the UI, `bugCatalog` is a main-process data structure that accumulates every bug ever seen and tracks enough lifecycle metadata to support incremental fetch merge, selective categorization reuse, and similarity-history bookkeeping.

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

- The renderer reads only `session` and never receives the full catalog by default.
- The main process owns all catalog writes.
- Settings exposes explicit cleanup for snapshot-only reset versus history reset, but there is still no historical viewer in the renderer.

## Why This Topic Matters

- It explains why repeated fetches are now cheaper and less destructive than the original full-reset model.
- It ties together migration, fetch, categorization, similarity, and cleanup behavior into one persistence story.
- It documents the current limits of the feature, especially the absence of a renderer-facing catalog browser.

## See also

- [[wiki/entities/electron-store]]
- [[wiki/entities/catalog-merge-utility]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/concepts/catalog-backed-selective-re-categorization]]
- [[wiki/topics/session-persistence-lifecycle]]
