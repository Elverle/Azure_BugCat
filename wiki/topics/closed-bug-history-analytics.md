---
title: 'Closed Bug History Analytics'
type: topic
created: 2026-05-13
updated: 2026-05-13
sources:
  ['[[wiki/sources/ft-12-incremental-session-cache]]', '[[wiki/sources/ft-13-closed-bugs-history]]']
tags: [catalog, history, renderer, kpi, routing, ipc]
lang: en
---

## Overview

Closed bug history analytics is the FT-13 renderer surface built on top of FT-12's historical catalog. It gives operators a dedicated page for understanding how many bugs have dropped out of the active query, how those historical bugs distribute across macro-categories, what the current historical baseline is since the last explicit cleanup, and how much of that historical backlog has participated in similarity groups.

## End-to-End Flow

```text
Topbar
  -> /closed-bugs
  -> [[wiki/entities/closed-bugs-page]]
     -> [[wiki/entities/use-closed-bug-kpis-hook]]
        -> [[wiki/entities/preload-bridge]].getCatalogClosed()
           -> [[wiki/entities/ipc-handlers]] `catalog:get-closed`
              -> filter `bugCatalog` to `closedAt !== null`
              -> return { closedBugs, fetchedAt, lastClearedAt }
        -> [[wiki/entities/closed-bug-kpis-utility]].computeClosedBugKpis()
           -> render loading / error / empty / KPI state with grouped bug detail
```

## KPI Semantics

- `totalClosed` is the number of catalog entries whose lifecycle currently marks them as absent from the latest query.
- `totalClosed` is interpreted against `lastClearedAt`, which acts as the explicit baseline of the current persisted historical view.
- `recentlyClosedCount` is not time-window based; it is the count of closed bugs whose `closedAt` exactly equals the latest `fetchedAt` timestamp.
- `similarityGroupPercentage` is derived from `everInSimilarityGroup`, so it answers whether a bug ever participated in any historical similarity group, not whether it belongs to one now.
- `categoryDistribution` groups by `macroCategory`, falls back to `Non categorizzato` for uncategorized historical entries, and now carries grouped bug-level rows with `id` and `title`.
- `lastUpdateAt` is the latest session fetch timestamp, surfaced as `N/D` when no session exists.

## UX States

- Loading shows a single centered spinner while the IPC roundtrip completes.
- Error shows a dedicated warning state with the forwarded IPC message.
- Empty shows a historical placeholder instead of collapsing back to the dashboard.
- Data shows four KPI cards, a proportional category bar chart, a local detail filter, grouped bug rows under each category, and a footer note clarifying the query-relative meaning of "closed".

## Boundaries

- The page is read-only and does not expose mutation or external-link actions, even though it now exposes grouped bug-level rows.
- The page does not share state with [[wiki/entities/use-dashboard-hook]]; it is a separate route with a separate hydration path.
- FT-13 exposes only historical closure analytics. Open-bug triage, fetch, categorization, and similarity execution remain on [[wiki/entities/dashboard-page]].
- Historical similarity detail is intentionally coarse: the catalog stores whether a bug ever appeared in similarity and the last analysis timestamp, but not the peer IDs it matched against.
- The local detail filter is renderer-only state: it narrows visible rows by bug ID/title but does not alter the IPC payload or KPI totals.

## Why This Topic Matters

- It documents the first intentional renderer projection over the historical catalog.
- It clarifies that FT-13 is an analytics surface, not a generic historical browser.
- It connects FT-12's persistence model with a concrete operator-facing use case.

## See also

- [[wiki/entities/closed-bugs-page]]
- [[wiki/entities/use-closed-bug-kpis-hook]]
- [[wiki/entities/closed-bug-kpis-utility]]
- [[wiki/entities/topbar]]
- [[wiki/concepts/renderer-safe-closed-catalog-projection]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
