---
title: 'Closed Bugs Page'
type: entity
subtype: component
created: 2026-05-13
updated: 2026-08-19
sources: ['[[wiki/sources/ft-13-closed-bugs-history]]']
tags: [react, page, catalog, kpi, history]
lang: en
---

## Description

Top-level renderer page for FT-13 historical analytics. It renders a compact KPI dashboard over closed historical bugs, shows the current history baseline from the last explicit catalog cleanup, and intentionally stays outside the main triage dashboard.

## Location

`src/renderer/src/pages/ClosedBugsPage.tsx`

## States

| State   | Trigger                      | UI                                                                                                                  |
| ------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Loading | Initial hook hydration       | Centered `Loader2` spinner                                                                                          |
| Error   | `getCatalogClosed()` rejects | Alert icon, generic heading, and forwarded error message                                                            |
| Empty   | No closed bugs found         | Archive icon plus explanatory copy about automatic tracking                                                         |
| Data    | KPI payload available        | Four KPI cards, a local detail filter, collapsible category sections, grouped bug detail rows, and a semantics note |

## Rendered Metrics

- `Total closed bugs` — count of closed catalog bugs.
- `Total closed bugs` also shows `lastClearedAt` so operators can read the baseline of the current historical view.
- `Closed in last update` — bugs whose `closedAt` matches the latest `fetchedAt`.
- `In similarity group` — count and percentage of bugs with `everInSimilarityGroup = true`.
- `Last update` — formatted `fetchedAt`, or `N/A` when no session exists. That fallback is display text for a missing date, not the `NOT_AVAILABLE` sentinel.
- `Distribution by category` — relative bar chart scaled to the max category count.
- Each category now expands into bug-level rows with `id`, `title`, close timestamp, and coarse similarity-history status.
- A local detail filter narrows bug rows by `id` or `title` without changing the KPI cards above.
- Each macro-category can be collapsed independently to keep long historical lists manageable.

## Current Limitation

- The page cannot show the peer bug IDs a historical bug was similar to, because FT-12 persisted only `everInSimilarityGroup` and `lastSimilarityGroupAt`, not the specific related bug IDs.

## Semantics Note

The footer clarifies a critical FT-12/FT-13 rule: a bug is shown here when it is no longer present in the active ADO query. That absence is used as the catalog's practical "closed" signal, but it is not a direct confirmation of an Azure DevOps terminal state.

## Dependencies

- [[wiki/entities/use-closed-bug-kpis-hook]]
- `lucide-react` — `Archive`, `Loader2`, `AlertTriangle`

## See also

- [[wiki/topics/closed-bug-history-analytics]]
- [[wiki/topics/renderer-ui]]
- [[wiki/entities/topbar]]
