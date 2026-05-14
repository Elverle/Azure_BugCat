---
title: 'FT-13 - Storico Chiusi'
type: source
created: 2026-05-13
updated: 2026-05-13
sources: []
tags: [catalog, renderer, kpi, ipc, routing, testing]
lang: en
---

## Summary

FT-13 is the first renderer-facing historical catalog feature built on top of FT-12. It adds a dedicated `Storico Chiusi` page that reads only catalog entries marked with `closedAt !== null`, derives KPI summaries in a pure renderer helper, persists the last explicit history cleanup timestamp as the current baseline, and presents loading, error, empty, and data states without changing the existing dashboard workflow. The latest refinement adds a local detail filter and collapsible macro-category sections so the historical rows stay manageable even when the catalog grows.

## Files Created

| File                                         | Purpose                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| `src/renderer/src/lib/closed-bug-kpis.ts`    | Pure KPI aggregation for closed historical bugs                          |
| `src/renderer/src/hooks/useClosedBugKpis.ts` | Renderer hook that loads the closed-only catalog slice and computes KPIs |
| `src/renderer/src/pages/ClosedBugsPage.tsx`  | Top-level historical KPI page with loading, error, empty, and data UI    |
| `tests/renderer/closed-bug-kpis.spec.ts`     | Unit coverage for KPI aggregation semantics                              |
| `tests/renderer/useClosedBugKpis.spec.ts`    | Hook coverage for load success, empty state, and IPC failure             |
| `tests/renderer/ClosedBugsPage.spec.tsx`     | Page coverage for empty, error, and rendered KPI states                  |

## Files Modified

| File                                            | Change                                                                                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/shared/ipc-channels.ts`                    | Added `catalog:get-closed` as the dedicated closed-history read channel                                                       |
| `src/main/ipc-handlers.ts`                      | Added a handler that filters `bugCatalog` to closed entries and returns `session.fetchedAt`                                   |
| `src/preload/index.ts`                          | Exposed `getCatalogClosed()` to the renderer bridge                                                                           |
| `src/renderer/src/global.d.ts`                  | Declared `getCatalogClosed()` on `window.electronAPI`                                                                         |
| `src/renderer/src/App.tsx`                      | Added the `/closed-bugs` route                                                                                                |
| `src/renderer/src/components/layout/Topbar.tsx` | Added the `Storico Chiusi` nav link with `Archive` icon                                                                       |
| `tests/main/ipc-handlers.spec.ts`               | Added handler coverage for null catalog, filtered closed results, and null-session fallback                                   |
| `src/shared/types.ts`                           | Added `CatalogMetadata` and `ClosedCatalogSnapshot` for the cleanup-aware closed-history read model                           |
| `src/main/store.ts`                             | Added `catalogMetadata.lastClearedAt` default persistence                                                                     |
| `src/renderer/src/lib/closed-bug-kpis.ts`       | Extended KPI aggregation with cleanup baseline passthrough and bug-level category detail                                      |
| `src/renderer/src/hooks/useClosedBugKpis.ts`    | Hydrates the richer closed-history snapshot including the cleanup baseline                                                    |
| `src/renderer/src/pages/ClosedBugsPage.tsx`     | Shows the last cleanup date under the total KPI, adds a local detail filter, and renders collapsible grouped bug detail lists |
| `tests/renderer/closed-bug-kpis.spec.ts`        | Covers cleanup-baseline passthrough and grouped bug detail aggregation                                                        |
| `tests/renderer/useClosedBugKpis.spec.ts`       | Covers hydration of `lastClearedAt` through the closed-history hook                                                           |
| `tests/renderer/ClosedBugsPage.spec.tsx`        | Covers the cleanup baseline text, bug-level detail rendering, local filtering, and collapse behavior                          |

## Key Takeaways

1. **Historical catalog gets its first renderer consumer** - FT-13 exposes a closed-only slice, not the full `bugCatalog`.
2. **Aggregation stays pure** - KPI semantics and bug-level grouping live in a testable helper instead of the page component.
3. **Cleanup baseline is now explicit** - the total KPI can explain "da quando" by reading the last persisted history cleanup timestamp.
4. **Failure states are part of the contract** - the hook and page both surface readable IPC failures instead of silently falling back.
5. **Recently closed is fetch-relative** - the page treats `closedAt === fetchedAt` as bugs closed since the latest fetch snapshot.
6. **Historical closure is query-relative** - a bug is considered closed because it disappeared from the active ADO query, not because FT-13 re-queries ADO state directly.
7. **Similarity history is still coarse-grained** - FT-13 can say whether a historical bug was ever in similarity and when that last happened, but not which peer bug IDs were involved.
8. **Detail exploration is now local and non-destructive** - operators can filter rows by bug ID/title and collapse categories without changing the KPI totals.

## Architecture Delta

```text
Topbar
  -> /closed-bugs route
  -> [[wiki/entities/closed-bugs-page]]
     -> [[wiki/entities/use-closed-bug-kpis-hook]]
        -> getCatalogClosed()
           -> `catalog:get-closed`
              -> main filters `bugCatalog` to `closedAt !== null`
              -> reads `catalogMetadata.lastClearedAt`
              -> returns { closedBugs, fetchedAt, lastClearedAt }
        -> [[wiki/entities/closed-bug-kpis-utility]].computeClosedBugKpis()
   -> renders KPI cards + category distribution + local filter + collapsible grouped bug detail + explanatory note
```

## Validation Surface

- `tests/main/ipc-handlers.spec.ts` covers the closed-history IPC contract for null catalog, filtered results, cleanup-baseline passthrough, and null-session fallback.
- `tests/renderer/closed-bug-kpis.spec.ts` covers totals, recent closures, grouped bug detail ordering, uncategorized fallback, similarity percentages, and cleanup-baseline passthrough.
- `tests/renderer/useClosedBugKpis.spec.ts` covers loading, successful hydration, cleanup baseline hydration, empty catalog handling, and IPC error propagation.
- `tests/renderer/ClosedBugsPage.spec.tsx` covers empty, error, cleanup baseline text, rendered bug-detail states, local filtering, and category collapse.

## See also

- [[wiki/entities/closed-bugs-page]]
- [[wiki/entities/use-closed-bug-kpis-hook]]
- [[wiki/entities/closed-bug-kpis-utility]]
- [[wiki/concepts/renderer-safe-closed-catalog-projection]]
- [[wiki/topics/closed-bug-history-analytics]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
