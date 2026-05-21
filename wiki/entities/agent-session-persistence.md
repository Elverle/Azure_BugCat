---
title: 'Agent Session Persistence'
type: entity
subtype: service
created: 2026-05-21
updated: 2026-05-21
sources: ['[[wiki/sources/ft-14e-multi-session-agent-workspace]]']
tags: [agent, session, persistence, electron-store, recovery]
lang: en
---

## Description

Main-process helper that persists FT-14E agent-session snapshots into `electron-store`, trims stored logs, reloads recent sessions on boot, prunes expired entries, and converts stale `running` sessions into `aborted` recovery records.

## Location

`src/main/agent/session-persistence.ts`

## Public API

| Function                  | Purpose                                                                         |
| ------------------------- | ------------------------------------------------------------------------------- |
| `persistSession()`        | Upserts one session into `store.agentSessions` and adds `persistedAt`           |
| `loadPersistedSessions()` | Returns only sessions whose `completedAt ?? startedAt` is still within 24 hours |
| `pruneExpiredSessions()`  | Removes expired persisted sessions from the store                               |
| `markStaleRunning()`      | Converts restored `running` sessions into `aborted` with a fresh `completedAt`  |

## Key Behaviors

- Persists sessions under the dedicated top-level store key `agentSessions`.
- Trims persisted logs to the latest 200 chunks per session while leaving the in-memory session manager cap at 500.
- Uses `persistedAt` only as store metadata; the renderer-facing session shape remains `AgentSession`.
- Keeps retention based on the session's business timestamps (`completedAt` or `startedAt`), not on the persistence timestamp alone.
- Handles store write failures defensively with `console.error()` instead of crashing the app during session completion or recovery.

## Dependencies

- [[wiki/entities/electron-store]]
- [[wiki/entities/shared-types]]

## See also

- [[wiki/entities/agent-session-manager]]
- [[wiki/entities/store-migration]]
- [[wiki/concepts/bounded-concurrent-agent-session-lifecycle]]
- [[wiki/topics/agent-session-workspace]]
- [[wiki/topics/session-persistence-lifecycle]]
