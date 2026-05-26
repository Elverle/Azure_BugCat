---
title: 'Dashboard Page'
type: entity
subtype: component
created: 2026-04-30
updated: 2026-05-26
sources:
	[
		'[[wiki/sources/ft-05-dashboard]]',
		'[[wiki/sources/ft-06-bug-detail-drawer]]',
		'[[wiki/sources/ft-14b-agent-sessions]]',
		'[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]',
		'[[wiki/sources/ft-14d-cross-repo-project-suggestions]]',
		'[[wiki/sources/ft-14e-multi-session-agent-workspace]]',
		'[[wiki/sources/ft-14f-provider-auth-parity-analysis]]',
		'[[wiki/sources/ft-11-openrouter-provider]]',
		'[[wiki/analyses/cancel-categorization-flow]]',
		'[[wiki/analyses/dashboard-categorization-state-recovery]]'
	]
tags: [react, page, dashboard, triage, ui]
lang: en
---

## Description

Top-level home page for browsing fetched and categorized bugs. Composes the dashboard header, KPI strip, filter controls, four result views (`Lista Completa`, `AI Clusters`, `Similarità`, `Sessioni`), and the FT-06 detail drawer. Owns view-local UI state while delegating categorization, similarity, and FT-14E workspace state to dedicated hooks and child components.

## Location

`src/renderer/src/pages/DashboardPage.tsx`

## Local State

| State                   | Type                                              | Purpose                                                          |
| ----------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| `filterState`           | `FilterState`                                     | Active status/assignee/category filters                          |
| `sortState`             | `SortState`                                       | Active table sort key + direction                                |
| `groupBy`               | `GroupBy`                                         | Active grouping mode                                             |
| `viewMode`              | `'table' \| 'card' \| 'similarity' \| 'sessions'` | Flat list, grouped cards, similarity analysis, or agent sessions |
| `expandedGroups`        | `Set<string>`                                     | Which accordion sections are open                                |
| `searchText`            | `string`                                          | Debounced free-text filter term                                  |
| `drawerWidth`           | `number`                                          | Current width of the resizable FT-06 drawer                      |
| `adoSettings`           | `{ orgUrl, projectName }`                         | Cached ADO settings for the external work item link              |
| `projects`              | `ProjectEntry[]`                                  | Cached FT-14A project registry entries for analysis              |
| `maxConcurrentSessions` | `number`                                          | Cached FT-14A/FT-14E session cap forwarded to the workspace      |
| `agentRunningCount`     | `number`                                          | Current running-session count for the `Sessioni` tab badge       |
| `startingAgentSession`  | `boolean`                                         | Temporary disable state while a drawer-launched session starts   |
| `agentAvailability`     | `{ available: boolean; reason?: string }`         | FT-14F precomputed launch blocker derived from settings          |
| `agentHint`             | `string \| null`                                  | FT-14F non-blocking guidance for local-auth providers            |

## Key Behaviors

- Uses `useDashboard()` for session hydration, fetch action, categorize action, and progress state.
- For long-running categorization runs, passes `cancelCategorization()` plus `isCategorizing` into [[wiki/entities/dashboard-header]] so the top action can switch to a cancel affordance.
- Also passes `isCancelling` into [[wiki/entities/dashboard-header]] so the cancel affordance can become a temporary `Cancelling...` state while the abort request is in flight.
- Recovers an active categorization after Dashboard remount because [[wiki/entities/use-dashboard-hook]] rehydrates long-running state from the main-process status IPC instead of relying on page-local state only.
- Uses [[wiki/entities/use-bug-drawer-hook]] with either `sortedBugs` or the full bug session list, depending on the active tab, so drill-down navigation matches the visible slice.
- Loads FT-14A registered projects from settings once so the drawer can offer project-scoped FT-14B analysis starts without requerying on every open.
- Keeps the full `ProjectEntry[]` objects in local state so FT-14D can pass project type, description, and keywords into [[wiki/entities/analyze-start-panel]] without reloading settings.
- Loads `maxConcurrentSessions` from settings and passes it into [[wiki/entities/session-workspace]] so capacity enforcement stays aligned with the main-process cap.
- FT-14F also computes [[wiki/entities/agent-availability]] from the same settings read and propagates both the blocking result and the optional hint into the drawer and session workspace launchers.
- Hydrates the current running-session count from `agent:list-sessions` and refreshes it from `agent:session-updated`, so the tab badge and drawer launch disable state stay aligned even when the sessions workspace is not mounted.
- Builds `filterOptions` from the full bug dataset so users can still see available values even when the current result set is narrower.
- Reconciles stale sub-category selections when macro-category choices change.
- Maintains a tri-state sort cycle (`asc` → `desc` → `none`) while keeping sorting logic in [[wiki/entities/dashboard-utils]].
- Couples view mode to grouping defaults: switching to card mode enables `macroCategory` grouping; the table, similarity, and sessions tabs clear grouping.
- Expands all known groups whenever `groupBy` changes.
- Passes `openDrawer` into both [[wiki/entities/bug-table]] and [[wiki/entities/bug-card]], then shifts the page content with `pr-[400px]` while the drawer is open.
- Embeds the FT-10 similarity workflow directly inside the `Similarità` tab, reusing [[wiki/entities/use-ai-cluster-hook]], [[wiki/entities/ai-cluster-category-section]], and [[wiki/entities/similarity-group-card]].
- Adds a dedicated `Sessioni` tab that renders [[wiki/entities/session-workspace]] and shows a numeric badge with the current FT-14E running-session count.
- Starts FT-14 sessions from the drawer by invoking `agent:start` directly through the preload bridge, now including optional min-09 operator notes when present, then auto-switches the page into the `Sessioni` tab as soon as the invoke resolves.
- Receives running-count changes back from [[wiki/entities/session-workspace]] so the tab badge can stay correct even when sessions are started from inside the workspace itself.
- Loads `orgUrl` and `projectName` once from the preload bridge and composes the Azure DevOps work item URL for [[wiki/entities/open-external-ipc]].
- Shows two empty states: no session data loaded at all, or no bugs matching the current filters.
- Shows a modal error popup through [[wiki/entities/confirm-dialog]] when `useDashboard()` reports a blocking categorization failure, so provider/model incompatibility is visible to the user immediately.
- The modal now receives the real categorization message forwarded by the main process instead of Electron's generic `[object Object]` invoke wrapper.
- Does not show the modal for intentional cancellation; cancel returns the page to its normal dashboard state and leaves the previous persisted categorization intact.

## Dependencies

- [[wiki/entities/use-dashboard-hook]]
- [[wiki/entities/use-ai-cluster-hook]]
- [[wiki/entities/session-workspace]]
- [[wiki/entities/dashboard-header]]
- [[wiki/entities/confirm-dialog]]
- [[wiki/entities/kpi-cards]]
- [[wiki/entities/filter-bar]]
- [[wiki/entities/bug-table]]
- [[wiki/entities/bug-card]]
- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/analyze-start-panel]]
- [[wiki/entities/agent-availability]]
- [[wiki/entities/group-accordion]]
- [[wiki/entities/use-bug-drawer-hook]]
- [[wiki/entities/ai-cluster-category-section]]
- [[wiki/entities/similarity-group-card]]
- [[wiki/entities/dashboard-utils]]
- [[wiki/entities/open-external-ipc]]

## See also

- [[wiki/topics/dashboard-bug-exploration]]
- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/agent-session-workspace]]
- [[wiki/topics/cross-repo-agent-analysis]]
- [[wiki/topics/mcp-backed-agent-analysis]]
- [[wiki/concepts/proactive-agent-configuration-blocking]]
- [[wiki/concepts/dashboard-derivation-pipeline]]
- [[wiki/topics/renderer-ui]]
