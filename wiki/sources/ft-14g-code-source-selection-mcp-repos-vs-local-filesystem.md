---
title: 'FT-14G - Code Source Selection: MCP Repos vs Local Filesystem'
type: source
created: 2026-05-26
updated: 2026-05-26
sources: []
tags: [feature, agent, settings, mcp, azure-devops, filesystem, prompt, migration]
lang: en
---

## Summary

FT-14G adds a deterministic `codeSource` setting to the agent-analysis pipeline so operators can choose whether code should be read from the local filesystem or from Azure DevOps repositories through MCP repo tools. In `local` mode, BugCat preserves the existing local-path workflow with optional MCP bug fetching. In `mcp-repos` mode, local paths are no longer required, the agent must rely on MCP Azure DevOps for both bug context and code navigation, and Claude receives only the `mcp__azure-devops` tool instead of local filesystem readers.

## Feature Scope

- **ID:** FT-14G
- **Primary workflow:** explicit code-source routing for FT-14 analysis starts
- **Modes:** `local` and `mcp-repos`
- **Persistence impact:** schema v6 backfills `settings.codeSource = 'local'`
- **Prompt impact:** adds `buildMcpReposPrompt()` for MCP-only code navigation

## Files Updated

| File                                                              | Purpose                                                                                       |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/shared/types.ts`                                             | Added `CodeSource`, made `ProjectEntry.path` optional, and persisted `AppSettings.codeSource` |
| `src/main/store.ts`                                               | Added default `codeSource: 'local'`                                                           |
| `src/main/store-migration.ts`                                     | Added schema v6 migration that backfills `codeSource`                                         |
| `src/main/agent/types.ts`                                         | Added `codeSource` to runner params                                                           |
| `src/main/agent/prompt-builder.ts`                                | Added `buildMcpReposPrompt()` and MCP-repo secondary-project guidance                         |
| `src/main/agent/index.ts`                                         | Re-exported the MCP-repo prompt builder                                                       |
| `src/main/agent/runners/claude-sdk-runner.ts`                     | Filters Claude tools by `codeSource`, removing local readers in `mcp-repos` mode              |
| `src/main/ipc-handlers.ts`                                        | Routes session start by `codeSource`, validates paths only in local mode, and uses a temp cwd |
| `src/renderer/src/components/settings/AgentProviderSection.tsx`   | Added the code-source radio selector and explanatory copy                                     |
| `src/renderer/src/components/settings/ProjectRegistrySection.tsx` | Shows local path inputs only in `local` mode and repo-name guidance in `mcp-repos` mode       |
| `src/renderer/src/lib/validation.ts`                              | Skips project-path validation when `codeSource === 'mcp-repos'`                               |
| `src/renderer/src/hooks/useSettings.ts`                           | Skips path-validation IPC in `mcp-repos` mode and persists the new setting                    |
| `src/renderer/src/pages/SettingsPage.tsx`                         | Passes `codeSource` into the project-registry section                                         |
| `tests/main/agent-prompt-builder.spec.ts`                         | Covers the new MCP-repo prompt variant                                                        |
| `tests/main/store-migration.spec.ts`                              | Covers schema v6 migration behavior                                                           |
| `tests/main/store-migration-v4.spec.ts`                           | Updated version assertions after the schema bump                                              |
| `tests/main/ipc-handlers.spec.ts`                                 | Covers the new `agent:start` routing behavior and guard fixes                                 |
| `tests/renderer/validation.spec.ts`                               | Covers code-source-aware project validation                                                   |
| `tests/renderer/ProjectRegistrySection.spec.tsx`                  | Covers `codeSource`-driven Settings rendering                                                 |

## Tests

| File                                             | Coverage                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `tests/main/agent-prompt-builder.spec.ts`        | MCP-repo prompt content and secondary-repo instructions             |
| `tests/main/store-migration.spec.ts`             | Schema v6 defaulting for persisted settings                         |
| `tests/main/ipc-handlers.spec.ts`                | Local-path guards, MCP-repo mandatory probe, and start-flow routing |
| `tests/renderer/validation.spec.ts`              | Local vs MCP-repo project-entry validation rules                    |
| `tests/renderer/ProjectRegistrySection.spec.tsx` | Conditional path field and MCP-repo helper copy                     |

The development pipeline reports that the full Vitest suite still passes after the FT-14G fixes, with 582 tests green.

## Key Design Decisions

- **Code source is explicit and persisted**: the operator chooses one stable mode in Settings instead of relying on implicit MCP availability or ad-hoc runner behavior.
- **MCP repos mode is MCP-only, not fallback-first**: when `codeSource === 'mcp-repos'`, MCP availability is required and session start fails instead of silently switching back to local assumptions.
- **Prompt and tool access stay aligned**: `buildMcpReposPrompt()` instructs the model to use repo tools only, and the Claude runner removes `Read`, `Glob`, and `Grep` from the allowed tool list in the same mode.
- **Project registry semantics depend on the selected source**: local mode treats `ProjectEntry.path` as required executable context, while MCP-repos mode treats `ProjectEntry.name` as the Azure DevOps repository identifier and keeps `path` optional.
- **A temp working directory replaces the local repo root in MCP-repos mode**: file-based runners still need a `cwd` for startup and `.mcp.json` discovery, but FT-14G no longer requires that directory to be the real project checkout.

## Concepts Created

- [[wiki/concepts/code-source-selection-for-agent-analysis]]

## See also

- [[wiki/sources/ft-14a-agent-configuration-project-registry]]
- [[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]
- [[wiki/entities/agent-prompt-builder]]
- [[wiki/entities/claude-sdk-runner]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/mcp-backed-agent-analysis]]
