---
title: 'Agent Session Manager'
type: entity
subtype: service
created: 2026-05-18
updated: 2026-05-20
sources:
	['[[wiki/sources/ft-14b-agent-sessions]]', '[[wiki/sources/ft-14d-cross-repo-project-suggestions]]']
tags: [agent, session, main-process, orchestration, abort]
lang: en
---

## Description

Main-process lifecycle coordinator for FT-14B and FT-14D agent sessions. It owns the single in-memory `AgentSession`, the active `AbortController`, chunk retention, optional secondary-project metadata, provider usage statistics, and the guardrails that prevent stale provider callbacks from mutating a newer session.

## Location

`src/main/agent/session-manager.ts`

## Public API

| Method         | Purpose                                                                |
| -------------- | ---------------------------------------------------------------------- |
| `getSession()` | Returns the current `AgentSession` or `null`                           |
| `isRunning()`  | Returns `true` only when the current session status is `running`       |
| `start(...)`   | Creates a new session, starts the runner, and returns the generated ID |
| `abort(id)`    | Aborts the active session when the ID matches and it is still running  |
| `clear()`      | Aborts an active run if needed, then resets all state                  |

## Key Behaviors

- Keeps exactly one `currentSession` in memory.
- Auto-clears previously finished sessions before accepting a new start request.
- Rejects overlapping runs with `Sessione già in corso`.
- Stores `secondaryProjectIds` in the session snapshot so reconnecting renderers can show the same project context that started the run.
- Stores optional provider `usage` metrics in the completed session snapshot so the renderer can show token statistics without re-querying the SDK.
- Enriches every streamed chunk with the generated `sessionId` before storing or forwarding it.
- When a `tool_result` chunk mentions one of the resolved secondary paths, prefixes the chunk with `[secondary:{projectName}]` so the log keeps repository provenance visible.
- Caps retained chunks at 500 entries with FIFO eviction to avoid unbounded renderer/main memory growth.
- Marks aborted, completed, and error sessions with `completedAt` timestamps.
- Ignores stale completion/error callbacks when the originating session has already been replaced or aborted.

## Dependencies

- [[wiki/entities/shared-types]]
- [[wiki/entities/agent-runner-factory]]

## See also

- [[wiki/concepts/single-active-agent-session-lifecycle]]
- [[wiki/concepts/streaming-agent-session-ipc]]
- [[wiki/topics/cross-repo-agent-analysis]]
- [[wiki/topics/agent-analysis-sessions]]
