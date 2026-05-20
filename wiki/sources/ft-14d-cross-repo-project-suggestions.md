---
title: 'FT-14D - Cross-Repo Analysis & Project Suggestions'
type: source
created: 2026-05-20
updated: 2026-05-20
sources: []
tags: [feature, agent, cross-repo, projects, dashboard, ipc, prompt]
lang: en
---

## Summary

FT-14D extends the FT-14B and FT-14C agent-analysis workflow from a single manually chosen repository into a guided cross-repo launch flow. BugCat now suggests a primary project from bug metadata, proposes secondary repositories for read-only context, lets the operator override those choices in the drawer, injects a conditional `Secondary Projects` section into both prompt variants, and tags streamed tool results that came from secondary paths.

## Feature Scope

- **ID:** FT-14D
- **Primary workflow:** smart `analyze` preflight for one primary repo plus optional secondary read-only repos
- **Selection model:** pure heuristics in the main process with renderer override support
- **Prompt model:** same FT-14B/FT-14C analyze flow, but with conditional multi-repo context

## Files Added

| File                                                          | Purpose                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/main/agent/project-matcher.ts`                           | Pure scoring and suggestion helpers for primary/secondary projects |
| `src/renderer/src/components/dashboard/AnalyzeStartPanel.tsx` | Drawer launch panel with suggested primary and secondary toggles   |
| `tests/main/project-matcher.spec.ts`                          | Coverage for scoring threshold and secondary-project rules         |

## Files Updated

| File                                                        | Purpose                                                                                            |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/shared/types.ts`                                       | Added project-suggestion payloads plus secondary-project session/start fields                      |
| `src/shared/ipc-channels.ts`                                | Added `agent:suggest-projects` preflight channel                                                   |
| `src/main/agent/types.ts`                                   | Added `secondaryPaths` so runners can read extra repositories                                      |
| `src/main/agent/prompt-builder.ts`                          | Added markdown-escaped `Secondary Projects` section for analyze and MCP prompts                    |
| `src/main/agent/session-manager.ts`                         | Stores secondary metadata and tags tool results that originate from secondary paths                |
| `src/main/ipc-handlers.ts`                                  | Added suggestion IPC, primary override handling, payload validation, and secondary-path resolution |
| `src/preload/index.ts`                                      | Exposed `agentSuggestProjects()` to the renderer                                                   |
| `src/renderer/src/hooks/useAgentSession.ts`                 | Extended session start to accept secondary project IDs and mirrored the 500-chunk cap              |
| `src/renderer/src/components/dashboard/BugDetailDrawer.tsx` | Replaced the old analyze launcher with `AnalyzeStartPanel`                                         |
| `src/renderer/src/pages/DashboardPage.tsx`                  | Carries full `ProjectEntry[]` state and forwards secondary selections                              |

## Tests

| File                                      | Coverage                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `tests/main/project-matcher.spec.ts`      | Score weights, threshold behavior, case-insensitive matching, type rules |
| `tests/main/agent-prompt-builder.spec.ts` | Conditional secondary-project section and markdown table coverage        |
| `tests/main/ipc-handlers.spec.ts`         | Suggest-projects payload handling and FT-14D start-path validation       |

## Key Design Decisions

- **Project matching stays pure** - `selectPrimaryProject()` and `suggestSecondaryProjects()` have no filesystem or store dependencies, so they stay easy to test and reason about.
- **The primary recommendation is advisory, not mandatory** - the renderer can override it, and the main process recomputes secondaries against that override.
- **Single-project installs skip the preflight** - when only one project is registered, the drawer starts analysis directly and does not spend an IPC roundtrip on suggestions.
- **Cross-repo prompt context is conditional** - the `Secondary Projects` table is omitted entirely when no secondaries are selected.
- **Secondary repositories remain read-only** - prompts frame them as reference-only context, and chunk tags make secondary reads visible in the session log.
- **Invalid secondary IDs never reach the runner** - the main process resolves only existing directory paths before populating `secondaryPaths`.

## Entities Created

- [[wiki/entities/project-matcher]]
- [[wiki/entities/analyze-start-panel]]

## Concepts Created

- [[wiki/concepts/cross-repo-project-suggestion-heuristics]]

## Topics Created

- [[wiki/topics/cross-repo-agent-analysis]]

## See also

- [[wiki/sources/ft-14a-agent-configuration-project-registry]]
- [[wiki/sources/ft-14b-agent-sessions]]
- [[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]
- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/mcp-backed-agent-analysis]]
