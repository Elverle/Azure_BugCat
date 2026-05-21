---
title: 'FT-14E - Multi-Session Agent Workspace'
type: source
created: 2026-05-21
updated: 2026-05-21
sources: []
tags: [feature, agent, sessions, persistence, dashboard, ipc, crash-recovery]
lang: en
---

## Summary

FT-14E upgrades the FT-14B through FT-14D agent-analysis flow from a single live session into a bounded concurrent workspace. The main process now keeps multiple sessions in memory, persists them for 24 hours with crash recovery, restores stale `running` sessions as `aborted` after restart, and exposes a summary/detail workspace UI with filtering, MCP badges, a numeric tab badge, and report actions for copy, save, and Azure DevOps deep-linking.

## Feature Scope

- **ID:** FT-14E
- **Primary workflow:** concurrent `analyze` sessions with Dashboard list/detail browsing
- **Persistence model:** `electron-store` backed `agentSessions` snapshots with 24-hour retention and 200 persisted chunks per session
- **Recovery model:** persist-on-start plus persist-on-terminal-state, restore recent sessions on boot, convert stale `running` sessions to `aborted`

## Files Added

| File                                                           | Purpose                                                                 |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/main/agent/session-persistence.ts`                        | Persist/load/prune/recover helpers for `agentSessions`                  |
| `src/renderer/src/hooks/useAgentSessions.ts`                   | Multi-session list/detail hook for the Dashboard workspace              |
| `src/renderer/src/components/dashboard/SessionListPanel.tsx`   | Left-hand session list with filters, capacity state, and summary badges |
| `src/renderer/src/components/dashboard/SessionDetailPanel.tsx` | Right-hand detail surface for logs, report, stats, and actions          |
| `src/renderer/src/components/dashboard/SessionWorkspace.tsx`   | Composes the workspace shell plus new-session dialog                    |
| `tests/main/agent-session-persistence.spec.ts`                 | Coverage for retention, trimming, and stale-running recovery            |
| `tests/renderer/useAgentSessions.spec.ts`                      | Coverage for list hydration, filtering, and per-session event handling  |
| `tests/renderer/SessionListPanel.spec.tsx`                     | Coverage for filter tabs, capacity state, and empty-state rendering     |

## Files Updated

| File                                       | Purpose                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `src/shared/types.ts`                      | Added session summary/filter/update/save-report/persisted-session contracts                  |
| `src/shared/ipc-channels.ts`               | Added `agent:list-sessions`, `agent:session-updated`, and `agent:save-report`                |
| `src/main/store-migration.ts`              | Added schema v5 with `agentSessions` bootstrap and `maxConcurrentSessions` backfill to `5`   |
| `src/main/store.ts`                        | Added `agentSessions` store defaults and raised default concurrent sessions to `5`           |
| `src/main/agent/session-manager.ts`        | Refactored the single-slot manager into a Map-based concurrent session coordinator           |
| `src/main/ipc-handlers.ts`                 | Restores persisted sessions at startup and exposes session list/detail/save-report workflows |
| `src/preload/index.ts`                     | Exposed list, save-report, and session-updated bridge methods                                |
| `src/renderer/src/pages/DashboardPage.tsx` | Replaced the old sessions tab body with `SessionWorkspace` and a numeric running-count badge |
| `tests/main/agent-session-manager.spec.ts` | Extended lifecycle coverage for bounded concurrent sessions and restore behavior             |
| `tests/main/ipc-handlers.spec.ts`          | Updated IPC mocks for list/detail/save-report session handling                               |

## Tests

| File                                           | Coverage                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `tests/main/agent-session-manager.spec.ts`     | Concurrent starts, per-session abort, restore, stale-running conversion, and limits   |
| `tests/main/agent-session-persistence.spec.ts` | Persistence upsert, 200-chunk trimming, 24-hour retention, and stale-running recovery |
| `tests/main/ipc-handlers.spec.ts`              | New list/get/save-report handler wiring and updated event expectations                |
| `tests/renderer/useAgentSessions.spec.ts`      | Summary hydration, filtering, chunk routing, and start/abort commands                 |
| `tests/renderer/SessionListPanel.spec.tsx`     | Tab filtering, selection, empty state, and new-session capacity disabling             |

## Key Design Decisions

- **Sessions are bounded, not queued** - `SessionManager` enforces a configurable `maxConcurrentSessions` cap instead of serializing work through one active slot.
- **Running sessions are persisted immediately** - FT-14E writes the session snapshot as soon as `agent:start` succeeds so app crashes do not erase in-flight work.
- **Session recovery is intentionally lossy for active work** - on restart, any restored `running` session becomes `aborted` because the underlying SDK process cannot be resumed safely.
- **Summaries and details are split** - the list view consumes lightweight `AgentSessionSummary` records, while full chunk/report detail is fetched only for the selected session.
- **Renderer state follows the workspace, not the launcher** - the drawer now starts sessions through the same FT-14E contract used by the workspace, so the old single-session compatibility hook is no longer needed.
- **Persisted logs stay bounded** - the live in-memory cap remains 500 chunks, but only the latest 200 are written to disk so crash recovery does not grow the store without bound.

## Entities Created

- [[wiki/entities/agent-session-persistence]]
- [[wiki/entities/use-agent-sessions-hook]]
- [[wiki/entities/session-list-panel]]
- [[wiki/entities/session-detail-panel]]
- [[wiki/entities/session-workspace]]

## Concepts Created

- [[wiki/concepts/bounded-concurrent-agent-session-lifecycle]]

## Topics Created

- [[wiki/topics/agent-session-workspace]]

## See also

- [[wiki/sources/ft-14b-agent-sessions]]
- [[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]
- [[wiki/sources/ft-14d-cross-repo-project-suggestions]]
- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/mcp-backed-agent-analysis]]
