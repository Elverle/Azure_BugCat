---
title: 'useAgentSession Hook'
type: entity
subtype: hook
created: 2026-05-18
updated: 2026-05-20
sources:
	[
		'[[wiki/sources/ft-14b-agent-sessions]]',
		'[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]'
	]
tags: [react, hook, agent, ipc, reconnect]
lang: en
---

## Description

Renderer hook that manages the FT-14B agent session view-model. It reconnects to an existing main-process session on mount, subscribes to streamed IPC events, exposes start/abort/clear actions, and preserves structured IPC error codes instead of flattening every failure into a generic message.

## Location

`src/renderer/src/hooks/useAgentSession.ts`

## Returned API

| Field / Method                          | Purpose                                                |
| --------------------------------------- | ------------------------------------------------------ |
| `session`                               | Current `AgentSession` or `null`                       |
| `mcpStatus`                             | Current session MCP availability/fallback metadata     |
| `startSession(bugId, primaryProjectId)` | Starts an FT-14B analyze session                       |
| `abortSession()`                        | Aborts the current running session                     |
| `clearSession()`                        | Clears renderer-local state and forgets the session ID |

## Key Behaviors

- Calls `window.electronAPI.agentGetSession()` on mount so the Dashboard can recover an already-running session after tab switches or remounts.
- Stores the authoritative session ID in a ref and filters incoming chunk/completed/error events against that ID.
- Subscribes to `onAgentMcpStatus()` and stores the per-session `McpStatus` alongside the live session snapshot.
- Appends chunks only while the local session is still `running`.
- Creates a local optimistic `running` session immediately after `agentStart()` returns `{ sessionId, agentProvider, mcpStatus }`.
- Applies the returned `mcpStatus` immediately before waiting for the separate IPC event so the renderer does not race the badge state against `agent:start` resolution.
- Preserves `err.code` from rejected IPC invocations when available; only falls back to heuristic mapping when the invoke error does not carry a structured code.
- Marks completed, aborted, and error transitions locally so the UI reacts immediately.
- `clearSession()` resets both the local session and the last observed MCP status.

## Dependencies

- [[wiki/entities/preload-bridge]]
- [[wiki/entities/shared-types]]

## See also

- [[wiki/entities/sessions-panel]]
- [[wiki/entities/dashboard-page]]
- [[wiki/concepts/streaming-agent-session-ipc]]
- [[wiki/topics/mcp-backed-agent-analysis]]
- [[wiki/topics/agent-analysis-sessions]]
