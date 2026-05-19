---
title: 'Agent Session Manager'
type: entity
subtype: service
created: 2026-05-18
updated: 2026-05-18
sources: ['[[wiki/sources/ft-14b-agent-sessions]]']
tags: [agent, session, main-process, orchestration, abort]
lang: en
---

## Description

Main-process lifecycle coordinator for FT-14B agent sessions. It owns the single in-memory `AgentSession`, the active `AbortController`, chunk retention, and the guardrails that prevent stale provider callbacks from mutating a newer session.

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
- Enriches every streamed chunk with the generated `sessionId` before storing or forwarding it.
- Caps retained chunks at 500 entries with FIFO eviction to avoid unbounded renderer/main memory growth.
- Marks aborted, completed, and error sessions with `completedAt` timestamps.
- Ignores stale completion/error callbacks when the originating session has already been replaced or aborted.

## Dependencies

- [[wiki/entities/shared-types]]
- [[wiki/entities/agent-runner-factory]]

## See also

- [[wiki/concepts/single-active-agent-session-lifecycle]]
- [[wiki/concepts/streaming-agent-session-ipc]]
- [[wiki/topics/agent-analysis-sessions]]
