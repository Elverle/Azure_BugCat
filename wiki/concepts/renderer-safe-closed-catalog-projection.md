---
title: 'Renderer-Safe Closed Catalog Projection'
type: concept
created: 2026-05-13
updated: 2026-05-13
sources: ['[[wiki/sources/ft-13-closed-bugs-history]]']
tags: [catalog, renderer, ipc, read-model, kpi]
lang: en
---

## Definition

Renderer-safe closed catalog projection is the FT-13 read-model pattern where the main process keeps full ownership of `bugCatalog`, but exposes only a filtered, closed-only slice together with fetch metadata so the renderer can build historical analytics without receiving the entire catalog.

## How It Works in This Project

- `bugCatalog` remains the source of truth and is still written only in the main process.
- `catalog:get-closed` filters `Object.values(bugCatalog)` to entries with `closedAt !== null`.
- The handler pairs that closed slice with `session?.fetchedAt` so the renderer can derive a "recently closed" metric without reading the full session object.
- The preload bridge exposes the projection as `getCatalogClosed()`.
- The renderer hook converts the payload into `ClosedBugKpiData` through a pure aggregation helper before the page renders anything.

## Benefits

- Keeps historical analytics payloads narrower than a generic catalog browser.
- Preserves the existing security boundary: the renderer still cannot mutate catalog state.
- Lets presentation-specific KPI logic stay in the renderer instead of bloating main-process IPC handlers.

## Trade-offs

- FT-13 still uses the catalog's query-absence model for closure, so the page is not a guaranteed ADO workflow-state report.
- The read model exposes aggregates and a closed-only slice, but no historical search, filtering, or drill-down UI.
- `recentlyClosedCount` depends on exact timestamp equality with `fetchedAt`, which matches the current merge model but is intentionally narrow.

## See also

- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/closed-bug-kpis-utility]]
- [[wiki/topics/closed-bug-history-analytics]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
