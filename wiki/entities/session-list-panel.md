---
title: 'Session List Panel'
type: entity
subtype: component
created: 2026-05-21
updated: 2026-05-21
sources: ['[[wiki/sources/ft-14e-multi-session-agent-workspace]]']
tags: [react, component, dashboard, agent, list, filters]
lang: en
---

## Description

Left-hand list surface for the FT-14E session workspace. It shows session summaries sorted by newest first, a running-count badge, status filter tabs, and a `Nuova` launcher button that disables itself when the configured concurrency limit has been reached.

## Location

`src/renderer/src/components/dashboard/SessionListPanel.tsx`

## Props

| Prop                     | Type                    | Purpose                                               |
| ------------------------ | ----------------------- | ----------------------------------------------------- |
| `sessions`               | `AgentSessionSummary[]` | Summary rows to render                                |
| `selectedId`             | `string \| null`        | Currently selected session row                        |
| `onSelect(id)`           | `(id: string) => void`  | Opens session detail for the clicked row              |
| `statusFilter`           | `AgentSessionFilter`    | Active filter tab                                     |
| `onStatusFilterChange()` | `(filter) => void`      | Changes the active filter tab                         |
| `runningCount`           | `number`                | Current number of running sessions                    |
| `maxConcurrentSessions`  | `number`                | Capacity ceiling used to disable new-session creation |
| `onNewSession()`         | `() => void`            | Opens the new-session dialog                          |

## Key Behaviors

- Sorts summaries by `startedAt` descending so the newest session is always easiest to reach.
- Shows provider badges (`Claude`, `Codex`, `Copilot`) and a `+N repo` badge when FT-14D secondary projects are attached.
- Shows an `MCP` badge directly in the list summary when the session ran with FT-14C MCP availability.
- Displays a live `chunkCount` badge only while the session is still running.
- Uses relative time strings tuned for short operator scans (`ora`, `Xm fa`, `Xh fa`, or local date).

## Dependencies

- [[wiki/entities/shared-types]]

## See also

- [[wiki/entities/session-workspace]]
- [[wiki/entities/session-detail-panel]]
- [[wiki/entities/use-agent-sessions-hook]]
- [[wiki/topics/agent-session-workspace]]
