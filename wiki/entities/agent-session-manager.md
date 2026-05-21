---
title: 'Agent Session Manager'
type: entity
subtype: service
created: 2026-05-18
updated: 2026-05-21
sources:
	[
		'[[wiki/sources/ft-14b-agent-sessions]]',
		'[[wiki/sources/ft-14d-cross-repo-project-suggestions]]',
		'[[wiki/sources/ft-14e-multi-session-agent-workspace]]'
	]
tags: [agent, session, main-process, orchestration, abort, concurrency]
lang: en
---

## Description

Main-process lifecycle coordinator for FT-14B through FT-14E agent sessions. It owns the in-memory session map, per-session abort controllers, optional secondary-project metadata, chunk retention, and the compatibility layer that still lets legacy consumers ask for the first running session when they do not provide an explicit ID.

## Location

`src/main/agent/session-manager.ts`

## Public API

| Method                  | Purpose                                                                      |
| ----------------------- | ---------------------------------------------------------------------------- |
| `setMaxConcurrent(n)`   | Updates the allowed number of simultaneous running sessions                  |
| `getSession(id?)`       | Returns the requested session by ID, or the first running session for compat |
| `getAllSessions()`      | Returns every tracked session                                                |
| `getRunningCount()`     | Returns how many sessions are currently `running`                            |
| `isRunning()`           | Convenience wrapper over `getRunningCount() > 0`                             |
| `start(...)`            | Creates a new session, starts the runner, and returns the generated ID       |
| `abort(sessionId)`      | Aborts one running session by ID                                             |
| `clearCompleted()`      | Removes all non-running sessions from memory                                 |
| `removeSession(id)`     | Removes a session entirely, aborting first if it is still running            |
| `restoreSessions(list)` | Rehydrates sessions restored from persistence                                |
| `markStaleAsAborted()`  | Converts any in-memory `running` session to `aborted`                        |

## Key Behaviors

- Stores sessions in a `Map<string, AgentSession>` instead of a single active slot.
- Enforces the FT-14E bounded-concurrency limit and throws when the limit has been reached.
- Keeps `secondaryProjectIds` and provider `usage` inside the session snapshot so the renderer can reconnect or inspect history without recomputing context.
- Enriches every streamed chunk with the owning `sessionId` before storing or forwarding it.
- When a `tool_result` chunk mentions a resolved secondary path, prefixes it with `[secondary:{projectName}]` so cross-repo provenance remains visible.
- Caps retained chunks at 500 entries per session with FIFO eviction.
- Allows one session to be aborted without affecting unrelated running sessions.
- Preserves backwards compatibility for legacy callers by returning the first running session when `getSession()` is called without an ID.
- Ignores stale completion and error callbacks when the originating session is no longer the matching running target.

## Dependencies

- [[wiki/entities/shared-types]]
- [[wiki/entities/agent-runner-factory]]

## See also

- [[wiki/entities/agent-session-persistence]]
- [[wiki/concepts/bounded-concurrent-agent-session-lifecycle]]
- [[wiki/concepts/streaming-agent-session-ipc]]
- [[wiki/topics/cross-repo-agent-analysis]]
- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/agent-session-workspace]]
