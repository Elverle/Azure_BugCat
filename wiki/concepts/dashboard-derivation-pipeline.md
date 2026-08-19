---
title: 'Dashboard Derivation Pipeline'
type: concept
created: 2026-04-30
updated: 2026-08-19
sources: ['[[wiki/sources/ft-05-dashboard]]']
tags: [dashboard, react, pattern, pure-functions]
lang: en
---

## Definition

The dashboard uses a staged derivation pipeline that keeps raw bug data immutable and derives every UI slice from it: filtering, sorting, KPI aggregation, grouping, and filter-option reconciliation. The page owns only transient UI state; the expensive and testable business rules live in pure utilities.

## How It Works in This Project

```
SessionData.bugs
  → filterBugs(bugs, { ...filterState, searchText })
  → sortBugs(filteredBugs, sortState.key, sortState.direction)
  → computeKpis(filteredBugs)
  → groupBugs(sortedBugs, groupBy)
```

- `useDashboard()` supplies the raw `bugs` array and action state.
- `DashboardPage` wraps each derivation stage in `useMemo()` so recalculation is scoped to the relevant dependencies.
- Filter options are derived from the full `bugs` array, not the filtered subset, which preserves discoverability of available values.
- When macro-category filters change, a `useEffect()` reconciles stale technical-layer selections against the newly valid option set.
- Changing `groupBy` resets accordion expansion to all known groups.

## Trade-offs

- **Pro:** Pure functions are trivial to unit test and can be reused by multiple views.
- **Pro:** The page stays declarative because render branches consume already-derived collections.
- **Pro:** Grouped and flat views share the same filtered/sorted source of truth.
- **Con:** Every derivation still runs client-side, so the pattern assumes datasets remain within the project’s small in-memory bounds.
- **Con:** Filter state is view-local and not persisted across app restarts.

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/entities/dashboard-utils]]
- [[wiki/entities/use-dashboard-hook]]
- [[wiki/topics/dashboard-bug-exploration]]
