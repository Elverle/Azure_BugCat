---
title: 'Dashboard Page'
type: entity
subtype: component
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-05-dashboard]]']
tags: [react, page, dashboard, triage, ui]
lang: en
---

## Description

Top-level home page for browsing fetched and categorized bugs. Composes the dashboard header, KPI strip, filter controls, and the current result view (flat table or grouped cards/tables). Owns view-local UI state while delegating session and action orchestration to [[wiki/entities/use-dashboard-hook]].

## Location

`src/renderer/src/pages/DashboardPage.tsx`

## Local State

| State            | Type                | Purpose                                 |
| ---------------- | ------------------- | --------------------------------------- |
| `filterState`    | `FilterState`       | Active status/assignee/category filters |
| `sortState`      | `SortState`         | Active table sort key + direction       |
| `groupBy`        | `GroupBy`           | Active grouping mode                    |
| `viewMode`       | `'table' \| 'card'` | Flat list vs. grouped card workflow     |
| `expandedGroups` | `Set<string>`       | Which accordion sections are open       |
| `searchText`     | `string`            | Debounced free-text filter term         |

## Key Behaviors

- Uses `useDashboard()` for session hydration, fetch action, categorize action, and progress state.
- Builds `filterOptions` from the full bug dataset so users can still see available values even when the current result set is narrower.
- Reconciles stale sub-category selections when macro-category choices change.
- Maintains a tri-state sort cycle (`asc` → `desc` → `none`) while keeping sorting logic in [[wiki/entities/dashboard-utils]].
- Couples view mode to grouping defaults: switching to card mode enables `macroCategory` grouping; switching back to table clears grouping.
- Expands all known groups whenever `groupBy` changes.
- Shows two empty states: no session data loaded at all, or no bugs matching the current filters.

## Dependencies

- [[wiki/entities/use-dashboard-hook]]
- [[wiki/entities/dashboard-header]]
- [[wiki/entities/kpi-cards]]
- [[wiki/entities/filter-bar]]
- [[wiki/entities/bug-table]]
- [[wiki/entities/bug-card]]
- [[wiki/entities/group-accordion]]
- [[wiki/entities/dashboard-utils]]

## See also

- [[wiki/topics/dashboard-bug-exploration]]
- [[wiki/concepts/dashboard-derivation-pipeline]]
- [[wiki/topics/renderer-ui]]
