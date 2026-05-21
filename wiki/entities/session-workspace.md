---
title: 'Session Workspace'
type: entity
subtype: component
created: 2026-05-21
updated: 2026-05-21
sources: ['[[wiki/sources/ft-14e-multi-session-agent-workspace]]']
tags: [react, component, dashboard, agent, workspace]
lang: en
---

## Description

Composite Dashboard surface that replaces the old FT-14B single-session tab. It combines the FT-14E session list, session detail panel, and a modal new-session launcher into one dedicated workspace, while reporting the running count back to `DashboardPage` for the tab badge.

## Location

`src/renderer/src/components/dashboard/SessionWorkspace.tsx`

## Props

| Prop                    | Type                         | Purpose                                                         |
| ----------------------- | ---------------------------- | --------------------------------------------------------------- |
| `maxConcurrentSessions` | `number`                     | Capacity limit forwarded to the list panel                      |
| `projects`              | `ProjectEntry[]`             | Registered projects available to new-session launch             |
| `bugs`                  | `CategorizedBug[]`           | Current bug slice available for session creation                |
| `onRunningCountChange`  | `((count: number) => void)?` | Notifies the parent when the number of running sessions changes |

## Key Behaviors

- Uses [[wiki/entities/use-agent-sessions-hook]] as the single source of truth for workspace state.
- Auto-selects the newest session when the summary list grows, which keeps freshly started work immediately visible.
- Opens a modal overlay for new-session creation instead of overloading the list surface with launch controls.
- Reuses [[wiki/entities/analyze-start-panel]] inside that modal so FT-14D project suggestion logic stays consistent between the drawer and the workspace launcher.
- Initializes the new-session dialog with the first available bug when the current Dashboard slice is non-empty.

## Dependencies

- [[wiki/entities/use-agent-sessions-hook]]
- [[wiki/entities/session-list-panel]]
- [[wiki/entities/session-detail-panel]]
- [[wiki/entities/analyze-start-panel]]

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/topics/agent-session-workspace]]
- [[wiki/topics/agent-analysis-sessions]]
