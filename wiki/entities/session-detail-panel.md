---
title: 'Session Detail Panel'
type: entity
subtype: component
created: 2026-05-21
updated: 2026-05-21
sources: ['[[wiki/sources/ft-14e-multi-session-agent-workspace]]']
tags: [react, component, dashboard, agent, markdown, logs, reports]
lang: en
---

## Description

Right-hand detail surface for one selected FT-14E session. It renders lifecycle status, a progress bar for running sessions, an error banner when present, collapsible log/report/stats sections, and post-run actions for copying, saving, and opening the related bug in Azure DevOps.

## Location

`src/renderer/src/components/dashboard/SessionDetailPanel.tsx`

## Props

| Prop                  | Type                                         | Purpose                             |
| --------------------- | -------------------------------------------- | ----------------------------------- |
| `session`             | `AgentSession \| null`                       | Full session to visualize           |
| `onAbort(sessionId)`  | `(sessionId: string) => void`                | Stops a running session             |
| `onCopyReport(id)`    | `(sessionId: string) => void`                | Copies the final report             |
| `onSaveReport(id,id)` | `(sessionId: string, bugId: number) => void` | Saves the report as Markdown        |
| `onOpenBug(bugId)`    | `(bugId: number) => void`                    | Opens the work item in Azure DevOps |

## Key Behaviors

- Shows a neutral empty state until the operator selects a session from the list.
- Auto-scrolls the log viewport while the log accordion is open and new chunks arrive.
- Approximates running progress from the observed chunk count, capped at 95% until the final terminal state arrives.
- Renders completed reports with `react-markdown` and `remark-gfm`, preserving tables and list formatting from the agent output.
- Shows usage metrics for any non-running terminal state and falls back to `Metriche token non disponibili` when the provider did not expose usage data.
- Keeps copy/save/open actions close to the rendered report so the workspace doubles as a lightweight operator handoff surface.

## Dependencies

- [[wiki/entities/shared-types]]
- [[wiki/entities/open-external-ipc]]

## See also

- [[wiki/entities/session-workspace]]
- [[wiki/entities/session-list-panel]]
- [[wiki/entities/use-agent-sessions-hook]]
- [[wiki/topics/agent-session-workspace]]
