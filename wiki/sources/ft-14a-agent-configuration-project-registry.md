---
title: 'FT-14A - Agent Configuration & Project Registry'
type: source
created: 2026-05-17
updated: 2026-05-17
sources: []
tags: [feature, settings, agent, project-registry, migration, validation, ipc]
lang: en
---

## Summary

FT-14A extends the Settings surface so the app can prepare agent-session execution without running any agents yet. The feature adds agent-provider selection with auto-derivation from the active LLM provider, Copilot BYOK mode, a Codex CLI binary check, a persisted project registry with directory picking and save-time path validation, an architecture-context textarea, and a max-concurrent-sessions limit. It also introduces schema v4 to backfill the new settings fields safely for existing installations.

## Feature Scope

- **ID:** FT-14A
- **Requirements:** 12 functional, 5 non-functional
- **Edge cases covered:** 10
- **Foundation for:** FT-14B agent session execution

## Files Modified

| File                                                                  | Purpose                                                                 |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/shared/types.ts`                                                 | Added agent-provider, project-registry, BYOK, and binary-check types    |
| `src/shared/ipc-channels.ts`                                          | Added agent/project channels                                            |
| `src/main/store.ts`                                                   | Added defaults for 9 new FT-14A settings fields                         |
| `src/main/store-migration.ts`                                         | Added schema v4 backfill migration                                      |
| `src/main/ipc-handlers.ts`                                            | Added binary check, directory picker, project CRUD, and path validation |
| `src/preload/index.ts`                                                | Exposed the new agent/project bridge methods                            |
| `src/renderer/src/lib/validation.ts`                                  | Added validators for project entries, context length, and concurrency   |
| `src/renderer/src/hooks/useSettings.ts`                               | Added auto-derivation, sanitization, project CRUD, and save-time checks |
| `src/renderer/src/pages/SettingsPage.tsx`                             | Integrated the new Settings sections                                    |
| `src/renderer/src/components/settings/AgentProviderSection.tsx`       | Agent-provider UI with auto/manual modes, BYOK, and Codex check         |
| `src/renderer/src/components/settings/ProjectRegistrySection.tsx`     | Project registry CRUD UI with per-field errors                          |
| `src/renderer/src/components/settings/ArchitectureContextSection.tsx` | Architecture context and concurrency controls                           |

## Tests

| File                                                 | Coverage                                                                |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| `tests/main/store-migration-v4.spec.ts`              | Schema v4 defaults, preservation of existing values, and no-op behavior |
| `tests/main/ipc-handlers.spec.ts`                    | Agent/project IPC handlers                                              |
| `tests/renderer/AgentSettingsSection.spec.tsx`       | Auto/manual provider rendering, BYOK visibility, Codex check action     |
| `tests/renderer/ArchitectureContextSection.spec.tsx` | Concurrency input behavior and touched-gated errors                     |
| `tests/renderer/ProjectRegistrySection.spec.tsx`     | Per-field touched behavior for new project rows                         |
| `tests/renderer/validation.spec.ts`                  | FT-14A validators and aggregate Settings validation                     |

## Key Design Decisions

- **Agent provider is partly derived, not fully free-form** - `anthropic` maps to `claude-sdk` and `openai` maps to `codex-sdk`; only the other LLM providers expose a manual dropdown.
- **Hidden dependent fields are sanitized before persistence** - switching away from Copilot or disabling BYOK clears stale BYOK values before save.
- **Project validation is split across renderer and main** - shape and length constraints are local, while filesystem existence and directory checks stay behind IPC.
- **Dynamic collection errors stay field-scoped** - project-row errors are keyed as `project-{index}-{field}` so blank new rows do not show every error immediately.
- **Migration v4 backfills only missing keys** - persisted settings from earlier schema versions keep their existing values while gaining safe defaults for the new FT-14A fields.

## Entities Created

- [[wiki/entities/agent-provider-section]]
- [[wiki/entities/project-registry-section]]
- [[wiki/entities/architecture-context-section]]
- [[wiki/entities/project-registry]]

## Concepts Created

- [[wiki/concepts/agent-provider-auto-derivation]]
- [[wiki/concepts/settings-sanitization-before-save]]
- [[wiki/concepts/dynamic-collection-touched-state]]

## Topics Created

- [[wiki/topics/agent-session-configuration-foundation]]

## See also

- [[wiki/sources/ft-02-settings]]
- [[wiki/entities/settings-page]]
- [[wiki/entities/use-settings-hook]]
- [[wiki/concepts/settings-persistence-flow]]
