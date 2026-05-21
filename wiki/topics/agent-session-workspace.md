---
title: 'Agent Session Workspace'
type: topic
created: 2026-05-21
updated: 2026-05-21
sources: ['[[wiki/sources/ft-14e-multi-session-agent-workspace]]']
tags: [agent, dashboard, workspace, sessions, reports]
lang: en
---

## Overview

FT-14E turns the Dashboard `Sessioni` tab into a dedicated workspace for recent and running agent analyses. Instead of rendering one live session inline, the tab now separates session summaries from session detail, supports status filtering, keeps a visible concurrency budget, and exposes post-run report actions without leaving the workspace.

## End-to-End Flow

```text
DashboardPage
  -> SessionWorkspace
    -> useAgentSessions()
      -> preload bridge
        -> agent:list-sessions for summaries
        -> agent:get-session(id) for selected detail
        -> agent:chunk / agent:completed / agent:error / agent:session-updated
          -> SessionListPanel updates summary badges and counts
          -> SessionDetailPanel updates live log/detail state

New session dialog
  -> AnalyzeStartPanel
    -> agent:start
      -> summary list refresh
      -> auto-select newest session
```

## Workspace States

- **Empty workspace**: no sessions yet, list shows `Nessuna sessione`, detail asks the operator to select a session.
- **Running session**: list row shows spinner, chunk count, and optional MCP/secondary badges; detail panel exposes the stop action and live log.
- **Completed session**: detail panel shows the rendered Markdown report plus copy/save/open actions.
- **Errored or aborted session**: detail panel preserves logs and usage stats while surfacing the terminal reason.
- **Capacity reached**: the `Nuova` button disables itself and explains the configured concurrent-session ceiling.

## Main Components

- [[wiki/entities/session-workspace]]
- [[wiki/entities/use-agent-sessions-hook]]
- [[wiki/entities/session-list-panel]]
- [[wiki/entities/session-detail-panel]]
- [[wiki/entities/analyze-start-panel]]
- [[wiki/entities/agent-session-manager]]
- [[wiki/entities/agent-session-persistence]]

## See also

- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/mcp-backed-agent-analysis]]
- [[wiki/concepts/bounded-concurrent-agent-session-lifecycle]]
- [[wiki/concepts/streaming-agent-session-ipc]]
