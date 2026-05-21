---
title: 'useAgentSession Hook'
type: entity
subtype: hook
created: 2026-05-18
updated: 2026-05-21
sources:
	[
		'[[wiki/sources/ft-14b-agent-sessions]]',
		'[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]',
		'[[wiki/sources/ft-14d-cross-repo-project-suggestions]]',
		'[[wiki/sources/ft-14e-multi-session-agent-workspace]]'
	]
tags: [react, hook, agent, ipc, reconnect, deprecated, removed]
lang: en
---

## Description

Historical FT-14B single-session hook. It was kept briefly during the FT-14E rollout as a compatibility layer for the drawer launch flow, then removed in `fix-06` once `DashboardPage` switched to the shared multi-session contract.

## Location

Removed from the codebase in `fix-06` after the drawer launch path stopped depending on a dedicated single-session renderer model.

## Former API

| Field / Method                                                | Purpose                                                |
| ------------------------------------------------------------- | ------------------------------------------------------ |
| `session`                                                     | Current `AgentSession` or `null`                       |
| `mcpStatus`                                                   | Current session MCP availability/fallback metadata     |
| `startSession(bugId, primaryProjectId, secondaryProjectIds?)` | Starts an FT-14B/FT-14D analyze session                |
| `abortSession()`                                              | Aborts the current running session                     |
| `clearSession()`                                              | Clears renderer-local state and forgets the session ID |

## Historical Behaviors

- Calls `window.electronAPI.agentGetSession()` without an ID on mount so legacy callers can still recover the first running session.
- Stores the authoritative session ID in a ref and filters incoming chunk/completed/error events against that ID.
- Stored the per-session `McpStatus` alongside the live session snapshot before FT-14E moved that state into persisted session summaries.
- Appends chunks only while the local session is still `running`.
- Mirrors the main-process 500-chunk cap locally so reconnect state and streamed UI state stay aligned.
- Copies `usage` from `agent:completed` into the local `AgentSession`, making token statistics available to the Sessions workspace immediately after completion.
- Creates a local optimistic `running` session immediately after `agentStart()` returns `{ sessionId, agentProvider, mcpStatus }`.
- Persists the selected `secondaryProjectIds` into that optimistic session so the renderer model matches the main-process snapshot shape.
- Applies the returned `mcpStatus` immediately before waiting for the separate IPC event so the renderer does not race the badge state against `agent:start` resolution.
- Preserves `err.code` from rejected IPC invocations when available; only falls back to heuristic mapping when the invoke error does not carry a structured code.
- Marks completed, aborted, and error transitions locally so the UI reacts immediately.
- `clearSession()` resets both the local session and the last observed MCP status.
- Did not manage session summaries, status filters, or session-selection state; FT-14E moved that responsibility into the dedicated workspace hook.

## Dependencies

- [[wiki/entities/preload-bridge]]
- [[wiki/entities/shared-types]]

## See also

- [[wiki/entities/use-agent-sessions-hook]]
- [[wiki/entities/session-workspace]]
- [[wiki/entities/dashboard-page]]
- [[wiki/concepts/streaming-agent-session-ipc]]
- [[wiki/topics/cross-repo-agent-analysis]]
- [[wiki/topics/mcp-backed-agent-analysis]]
- [[wiki/topics/agent-analysis-sessions]]
