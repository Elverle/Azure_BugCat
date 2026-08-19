---
title: 'Dashboard Page'
type: entity
subtype: component
created: 2026-04-30
updated: 2026-08-19
sources:
	[
		'[[wiki/sources/ft-05-dashboard]]',
		'[[wiki/sources/ft-06-bug-detail-drawer]]',
		'[[wiki/sources/ft-11-openrouter-provider]]',
		'[[wiki/analyses/cancel-categorization-flow]]',
		'[[wiki/analyses/dashboard-categorization-state-recovery]]'
	]
tags: [react, page, dashboard, triage, ui]
lang: en
---

## Description

Top-level home page for browsing fetched and categorized bugs. Composes the dashboard header, KPI strip, filter controls, three result views (`Lista Completa`, `AI Clusters`, `Similarità`), and the FT-06 detail drawer. Owns view-local UI state while delegating session orchestration to [[wiki/entities/use-dashboard-hook]] and similarity orchestration to [[wiki/entities/use-ai-cluster-hook]].

## Location

`src/renderer/src/pages/DashboardPage.tsx`

## Local State

| State            | Type                                | Purpose                                             |
| ---------------- | ----------------------------------- | --------------------------------------------------- |
| `filterState`    | `FilterState`                       | Active status/assignee/category filters             |
| `sortState`      | `SortState`                         | Active table sort key + direction                   |
| `groupBy`        | `GroupBy`                           | Active grouping mode                                |
| `viewMode`       | `'table' \| 'card' \| 'similarity'` | Flat list, grouped cards, or similarity analysis    |
| `expandedGroups` | `Set<string>`                       | Which accordion sections are open                   |
| `searchText`     | `string`                            | Debounced free-text filter term                     |
| `adoSettings`    | `{ orgUrl, projectName }`           | Cached ADO settings for the external work item link |

## Key Behaviors

- Uses `useDashboard()` for session hydration, fetch action, categorize action, and progress state.
- For long-running categorization runs, passes `cancelCategorization()` plus `isCategorizing` into [[wiki/entities/dashboard-header]] so the top action can switch to a cancel affordance.
- Also passes `isCancelling` into [[wiki/entities/dashboard-header]] so the cancel affordance can become a temporary `Cancelling...` state while the abort request is in flight.
- Recovers an active categorization after Dashboard remount because [[wiki/entities/use-dashboard-hook]] rehydrates long-running state from the main-process status IPC instead of relying on page-local state only.
- Uses [[wiki/entities/use-bug-drawer-hook]] with either `sortedBugs` or the full bug session list, depending on the active tab, so drill-down navigation matches the visible slice.
- Builds `filterOptions` from the full bug dataset so users can still see available values even when the current result set is narrower.
- Reconciles stale technical-layer selections when macro-category choices change.
- Maintains a tri-state sort cycle (`asc` → `desc` → `none`) while keeping sorting logic in [[wiki/entities/dashboard-utils]].
- Couples view mode to grouping defaults: switching to card mode enables `macroCategory` grouping; the table and similarity tabs clear grouping.
- Expands all known groups whenever `groupBy` changes.
- Passes `openDrawer` into both [[wiki/entities/bug-table]] and [[wiki/entities/bug-card]], then shifts the page content with `pr-[400px]` while the drawer is open.
- Embeds the FT-10 similarity workflow directly inside the `Similarità` tab, reusing [[wiki/entities/use-ai-cluster-hook]], [[wiki/entities/ai-cluster-category-section]], and [[wiki/entities/similarity-group-card]].
- Loads `orgUrl` and `projectName` once from the preload bridge and composes the Azure DevOps work item URL for [[wiki/entities/open-external-ipc]].
- Shows two empty states: no session data loaded at all, or no bugs matching the current filters.
- Shows a modal error popup through [[wiki/entities/confirm-dialog]] when `useDashboard()` reports a blocking categorization failure, so provider/model incompatibility is visible to the user immediately.
- The modal now receives the real categorization message forwarded by the main process instead of Electron's generic `[object Object]` invoke wrapper.
- Does not show the modal for intentional cancellation; cancel returns the page to its normal dashboard state and leaves the previous persisted categorization intact.

## Dependencies

- [[wiki/entities/use-dashboard-hook]]
- [[wiki/entities/use-ai-cluster-hook]]
- [[wiki/entities/dashboard-header]]
- [[wiki/entities/confirm-dialog]]
- [[wiki/entities/kpi-cards]]
- [[wiki/entities/filter-bar]]
- [[wiki/entities/bug-table]]
- [[wiki/entities/bug-card]]
- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/group-accordion]]
- [[wiki/entities/use-bug-drawer-hook]]
- [[wiki/entities/ai-cluster-category-section]]
- [[wiki/entities/similarity-group-card]]
- [[wiki/entities/dashboard-utils]]
- [[wiki/entities/open-external-ipc]]

## See also

- [[wiki/topics/dashboard-bug-exploration]]
- [[wiki/concepts/dashboard-derivation-pipeline]]
- [[wiki/topics/renderer-ui]]
