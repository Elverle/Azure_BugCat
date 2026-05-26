---
title: 'FT-14F - Provider/Auth Parity for Analysis'
type: source
created: 2026-05-26
updated: 2026-05-26
sources: []
tags: [feature, agent, dashboard, settings, copilot, codex, claude, validation, ipc]
lang: en
---

## Summary

FT-14F closes the gap between agent providers and authentication modes before an analysis session starts. The renderer now computes a pure `checkAgentAvailability()` result from persisted settings and blocks the Analyze entry points with a readable banner when configuration is incomplete. The main process adds a Codex CLI preflight inside `agent:start`, and Settings gains a `Verifica connessione Copilot` action that distinguishes subscription mode from provider-aware BYOK probing. Claude without an explicit API key remains allowed, but the UI now surfaces a non-blocking local-configuration hint.

## Feature Scope

- **ID:** FT-14F
- **Primary workflow:** prevent invalid FT-14 analysis starts before the operator clicks `Analizza`
- **Blocking rules:** missing projects, `agentProvider === 'none'`, missing Codex manual key, incomplete Copilot BYOK
- **Preflight rules:** `agent:start` rejects missing Codex CLI early; Copilot connection testing accepts draft payloads from Settings

## Files Added

| File                                         | Purpose                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| `src/renderer/src/lib/agent-availability.ts` | Pure availability gate + Claude informational hint helpers               |
| `tests/renderer/agent-availability.spec.ts`  | Renderer-side coverage for blocking and hint rules across provider modes |

## Files Updated

| File                                                            | Purpose                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/shared/ipc-channels.ts`                                    | Added `agent:test-copilot` channel                                                    |
| `src/preload/index.ts`                                          | Exposed `agentTestCopilot(settings?)` to the renderer                                 |
| `src/main/ipc-handlers.ts`                                      | Added Codex binary preflight inside `agent:start` and new Copilot config test handler |
| `src/renderer/src/pages/DashboardPage.tsx`                      | Computes agent availability/hint from settings and propagates them to launch surfaces |
| `src/renderer/src/components/dashboard/AnalyzeStartPanel.tsx`   | Shows an amber blocking banner before any project suggestion or launch attempt        |
| `src/renderer/src/components/dashboard/BugDetailDrawer.tsx`     | Passes availability state through the drawer launcher surface                         |
| `src/renderer/src/components/dashboard/SessionWorkspace.tsx`    | Reuses the same availability gate in the FT-14E new-session modal                     |
| `src/renderer/src/components/settings/AgentProviderSection.tsx` | Added `Verifica connessione Copilot` button with subscription/BYOK branching          |
| `tests/main/ipc-handlers.spec.ts`                               | Added Copilot test-handler coverage and Codex preflight expectations                  |

## Tests

| File                                        | Coverage                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `tests/renderer/agent-availability.spec.ts` | 16 provider/auth-mode cases for availability and informational hints      |
| `tests/main/ipc-handlers.spec.ts`           | `agent:test-copilot` success/failure branches and `agent:start` preflight |

## Key Design Decisions

- **Renderer gating is pure and pre-click** - launch surfaces can decide availability without invoking IPC or waiting for a failure response.
- **Main-process preflight still exists** - FT-14F treats renderer checks as UX, not as the trust boundary; `agent:start` still rejects missing Codex CLI and invalid BYOK state.
- **Blocking and informational states are separate** - missing Claude API key is not fatal because local Claude Code auth may satisfy the runner, so the UI shows a hint instead of disabling analysis.
- **Copilot testing respects auth mode** - subscription mode only confirms that Settings are coherent, while BYOK mode performs a provider-specific `/models` probe with the correct headers/query shape.
- **Draft settings can be tested before save** - the new Copilot test IPC accepts an optional payload so the Settings card can verify in-memory edits without mutating persisted configuration.

## Entities Created

- [[wiki/entities/agent-availability]]

## Concepts Created

- [[wiki/concepts/proactive-agent-configuration-blocking]]

## See also

- [[wiki/entities/analyze-start-panel]]
- [[wiki/entities/agent-provider-section]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/agent-session-configuration-foundation]]
