---
title: 'FT-05 — Dashboard Principale: Tabella, Filtri e Raggruppamenti'
type: source
created: 2026-04-30
updated: 2026-04-30
sources: []
tags: [dashboard, renderer, react, filters, grouping, accessibility]
lang: en
---

## Summary

Full implementation of the renderer home page for exploring fetched and categorized Azure DevOps bugs. Introduces a session-backed `DashboardPage`, a `useDashboard` orchestration hook, pure derivation utilities for filtering/sorting/grouping/KPI computation, a custom searchable multi-select, two presentation modes (flat table and grouped cards), and collapsible grouped sections with keyboard/ARIA support.

## Files Created

| File                                                        | Purpose                                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/renderer/src/hooks/useDashboard.ts`                    | Loads `SessionData`, exposes fetch/categorize actions, tracks progress |
| `src/renderer/src/lib/dashboard-utils.ts`                   | Pure filter, sort, group, KPI, and option-derivation functions         |
| `src/renderer/src/lib/badge-colors.ts`                      | Deterministic status/category color helpers                            |
| `src/renderer/src/components/ui/multi-select.tsx`           | Custom multi-select dropdown with optional search                      |
| `src/renderer/src/components/dashboard/KpiCards.tsx`        | KPI summary strip                                                      |
| `src/renderer/src/components/dashboard/FilterBar.tsx`       | Search, filters, grouping, reset, collapse-all controls                |
| `src/renderer/src/components/dashboard/BugTable.tsx`        | Sortable 8-column flat table view                                      |
| `src/renderer/src/components/dashboard/BugCard.tsx`         | Card renderer for grouped exploration                                  |
| `src/renderer/src/components/dashboard/GroupAccordion.tsx`  | Collapsible wrapper for grouped results                                |
| `src/renderer/src/components/dashboard/DashboardHeader.tsx` | Title, timestamps, and actions                                         |
| `src/renderer/src/pages/DashboardPage.tsx`                  | Top-level page composing the dashboard surface                         |
| `tests/renderer/dashboard-utils.spec.ts`                    | Unit tests for pure derivation and color helpers                       |
| `tests/renderer/useDashboard.spec.ts`                       | Hook tests for session loading, actions, progress, cleanup             |
| `tests/renderer/DashboardComponents.spec.tsx`               | Component tests for KPIs, filters, table, and custom multi-select      |

## Files Modified

| File                       | Change                                                  |
| -------------------------- | ------------------------------------------------------- |
| `src/renderer/src/App.tsx` | Replaced dashboard placeholder route with the real page |

## Key Takeaways

1. **Session-first rendering** — The dashboard renders whatever is already cached in `SessionData`, so the home page can reopen immediately after previous fetch/categorize runs.
2. **Pure derivation pipeline** — Filtering, sorting, grouping, KPI aggregation, and option derivation are all pure functions reused by the page and unit tests.
3. **Accessible custom controls** — The feature avoids new dependencies by implementing a semantic `listbox` multi-select, sortable table headers with `aria-sort`, and accordion sections with `aria-controls`.
4. **Two exploration modes** — The same derived bug set can be shown as a flat table or grouped card/table sections without duplicating business logic.
5. **Deterministic visual encoding** — Category badges and card background tints are derived from string hashes, so identical categories always reuse the same palette slot.
6. **Renderer integration point** — `DashboardHeader` is the renderer surface that triggers existing FT-03 fetch and FT-04 categorize flows via the preload bridge.

## Architecture

```
DashboardPage
  ├─ useDashboard()
  │    ├─ window.electronAPI.getSession()
  │    ├─ window.electronAPI.fetchBugs()
  │    └─ window.electronAPI.categorizeBugs() + onCategorizeProgress()
  ├─ filterBugs(bugs, filters)
  ├─ sortBugs(filteredBugs, sortState)
  ├─ computeKpis(filteredBugs)
  └─ groupBugs(sortedBugs, groupBy)
       ├─ BugTable (flat or grouped)
       └─ BugCard inside GroupAccordion
```

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/entities/use-dashboard-hook]]
- [[wiki/entities/dashboard-utils]]
- [[wiki/concepts/dashboard-derivation-pipeline]]
- [[wiki/concepts/accessible-collection-controls]]
- [[wiki/topics/dashboard-bug-exploration]]
