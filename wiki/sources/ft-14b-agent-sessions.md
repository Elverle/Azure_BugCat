---
title: 'FT-14B - Agent Sessions'
type: source
created: 2026-05-18
updated: 2026-05-18
sources: []
tags: [feature, agent, sessions, ipc, dashboard, claude, codex, copilot, markdown]
lang: en
---

## Summary

FT-14B turns the FT-14A configuration foundation into a real end-to-end agent-analysis workflow. Operators can start an AI coding-agent session from the bug detail drawer, stream normalized log chunks into a dedicated Dashboard `Sessioni` tab, reconnect to the in-flight session after renderer remounts, abort active work, and read a final Markdown report once the provider finishes.

## Feature Scope

- **ID:** FT-14B
- **Primary workflow:** single-bug `analyze` sessions against one selected local project
- **Providers added:** Claude Code SDK, Codex SDK, Copilot SDK
- **Persistence model:** main-process owned live session with renderer reconnect through IPC

## Files Added

| File                                                      | Purpose                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/main/agent/types.ts`                                 | Shared main-process runner contract                                      |
| `src/main/agent/runner-factory.ts`                        | Provider-to-runner resolution                                            |
| `src/main/agent/prompt-builder.ts`                        | Bug + project + architecture prompt assembly                             |
| `src/main/agent/session-manager.ts`                       | Single active session lifecycle, chunk retention, abort handling         |
| `src/main/agent/runners/claude-sdk-runner.ts`             | Claude SDK streaming adapter with read-only tools                        |
| `src/main/agent/runners/codex-sdk-runner.ts`              | Codex SDK streaming adapter in read-only sandbox                         |
| `src/main/agent/runners/copilot-sdk-runner.ts`            | Copilot SDK streaming adapter with explicit client/session bootstrapping |
| `src/main/agent/index.ts`                                 | Agent-module export surface                                              |
| `src/renderer/src/hooks/useAgentSession.ts`               | Renderer state/reconnect hook for agent sessions                         |
| `src/renderer/src/components/dashboard/SessionsPanel.tsx` | Sessions tab UI with logs, abort action, and Markdown report             |

## Files Updated

| File                                                            | Purpose                                                                                      |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/shared/types.ts`                                           | Added agent session domain types, payloads, statuses, and error codes                        |
| `src/shared/ipc-channels.ts`                                    | Added start/abort/get plus streamed chunk/completed/error channels                           |
| `src/preload/index.ts`                                          | Exposed agent session commands and subscriptions to the renderer                             |
| `src/main/ipc-handlers.ts`                                      | Resolved bug/project/settings, created runners, started sessions, and surfaced reconnect IPC |
| `src/renderer/src/pages/DashboardPage.tsx`                      | Added `Sessioni` tab, auto-switch-on-analyze, and project loading                            |
| `src/renderer/src/components/dashboard/BugDetailDrawer.tsx`     | Added project selector + `Analizza` action in the drawer footer                              |
| `src/renderer/src/components/settings/AgentProviderSection.tsx` | Marked Claude SDK API key as optional                                                        |
| `src/renderer/src/lib/validation.ts`                            | Made Claude SDK agent API key optional when selected manually                                |
| `package.json`                                                  | Added SDK/runtime dependencies plus Markdown/typography rendering                            |
| `electron.vite.config.ts`                                       | Externalized SDK packages for Electron bundling                                              |
| `tailwind.config.js`                                            | Added `@tailwindcss/typography` for rendered reports                                         |

## Tests

| File                                       | Coverage                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `tests/main/agent-runner-factory.spec.ts`  | Provider-resolution precedence and `AgentNotConfiguredError` behavior    |
| `tests/main/agent-session-manager.spec.ts` | Single-session lifecycle, abort, stale-callback protection, chunk flow   |
| `tests/main/agent-prompt-builder.spec.ts`  | Prompt composition and scope guards                                      |
| `tests/renderer/useAgentSession.spec.ts`   | Reconnect-on-mount, IPC streaming, abort, clear, and error-code fidelity |
| `tests/renderer/SessionsPanel.spec.tsx`    | Empty/running/completed/error states, chunk rendering, and abort action  |

## Key Design Decisions

- **Main process owns the live session** - the renderer can reconnect via `agent:get-session`, but it never owns the actual runner lifecycle.
- **Only one session can run at a time** - `SessionManager` rejects concurrent starts, auto-clears finished sessions before the next run, and ignores stale callbacks from aborted/replaced runs.
- **Providers stream into one normalized chunk model** - all SDK-specific events are mapped to `AgentChunk` records so the renderer stays provider-agnostic.
- **FT-14B is analyze-only** - `fix` mode exists in shared types for future work, but the handler currently blocks anything other than `analyze`.
- **Claude is the most locked-down provider today** - it exposes only `Read`, `Glob`, and `Grep`, accepts an optional API key, and falls back to local Claude Code settings when no key is provided.
- **Final output is operator-readable Markdown** - the renderer renders the completed report with `react-markdown`, `remark-gfm`, and Tailwind Typography styles.

## Entities Created

- [[wiki/entities/agent-session-manager]]
- [[wiki/entities/agent-runner-factory]]
- [[wiki/entities/agent-prompt-builder]]
- [[wiki/entities/claude-sdk-runner]]
- [[wiki/entities/codex-sdk-runner]]
- [[wiki/entities/copilot-sdk-runner]]
- [[wiki/entities/use-agent-session-hook]]
- [[wiki/entities/sessions-panel]]

## Concepts Created

- [[wiki/concepts/single-active-agent-session-lifecycle]]
- [[wiki/concepts/streaming-agent-session-ipc]]
- [[wiki/concepts/read-only-agent-analysis-sandboxing]]

## Topics Created

- [[wiki/topics/agent-analysis-sessions]]

## See also

- [[wiki/sources/ft-14a-agent-configuration-project-registry]]
- [[wiki/topics/agent-session-configuration-foundation]]
- [[wiki/topics/dashboard-bug-exploration]]
