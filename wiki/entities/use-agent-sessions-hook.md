---
title: 'useAgentSessions Hook'
type: entity
subtype: hook
created: 2026-05-21
updated: 2026-05-21
sources: ['[[wiki/sources/ft-14e-multi-session-agent-workspace]]']
tags: [react, hook, agent, ipc, workspace, sessions]
lang: en
---

## Description

Renderer hook that powers the FT-14E session workspace. It hydrates session summaries, tracks the selected session detail, subscribes to streamed updates, exposes list filters plus session actions, and keeps list-level state cheap by fetching the full `AgentSession` only for the currently selected row.

## Location

`src/renderer/src/hooks/useAgentSessions.ts`

## Returned API

| Field / Method                                         | Purpose                                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| `sessions`                                             | Filtered `AgentSessionSummary[]` for the current status tab                |
| `allSessions`                                          | Full summary list regardless of filter                                     |
| `selectedSession`                                      | Full `AgentSession` for the selected list row                              |
| `selectedSessionId`                                    | Active detail target or `null`                                             |
| `runningCount`                                         | Count of sessions whose status is `running`                                |
| `statusFilter`                                         | Current summary filter (`all`, `running`, `completed`, `error`, `aborted`) |
| `selectSession(id)`                                    | Selects a row and fetches full detail through `agent:get-session`          |
| `setStatusFilter(filter)`                              | Updates the summary tab filter                                             |
| `startSession(bugId, primaryProjectId, secondaryIds?)` | Starts a new analyze session and refreshes the summary list                |
| `abortSession(sessionId)`                              | Aborts the target session through IPC                                      |
| `copyReport(sessionId)`                                | Copies the summary's cached report to the system clipboard                 |
| `saveReport(sessionId, bugId)`                         | Opens the main-process save dialog for the session report                  |
| `openBugInAdo(bugId)`                                  | Builds and opens the Azure DevOps work item URL from persisted settings    |

## Key Behaviors

- Hydrates the workspace by calling `agentListSessions()` once on mount.
- Updates `chunkCount` from streamed `agent:chunk` events without re-fetching the whole list.
- Routes chunk, completion, error, and `agent:session-updated` events only into the selected session detail when the IDs match.
- Guards against stale async detail responses by comparing the resolved session ID against a ref that tracks the latest selection.
- Keeps the selected detail session capped at 500 chunks to mirror the main-process session manager.
- Refreshes the full summary list after `agent:start` instead of trying to synthesize a complete optimistic summary locally.
- Reads ADO settings lazily only when `openBugInAdo()` is invoked, keeping most workspace interactions independent from the broader Dashboard state.

## Dependencies

- [[wiki/entities/preload-bridge]]
- [[wiki/entities/shared-types]]

## See also

- [[wiki/entities/session-workspace]]
- [[wiki/entities/session-list-panel]]
- [[wiki/entities/session-detail-panel]]
- [[wiki/concepts/streaming-agent-session-ipc]]
- [[wiki/topics/agent-session-workspace]]
- [[wiki/topics/agent-analysis-sessions]]
