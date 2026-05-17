---
title: 'Settings Sanitization Before Save'
type: concept
created: 2026-05-17
updated: 2026-05-17
sources: ['[[wiki/sources/ft-14a-agent-configuration-project-registry]]']
tags: [settings, persistence, sanitization, pattern, security]
lang: en
---

## Definition

Before FT-14A settings are validated and persisted, the renderer clears dependent fields that are no longer relevant to the currently selected agent mode. This prevents hidden or stale values from being saved when the UI no longer exposes those inputs.

## Rules

| Condition                                                | Cleared fields                                                                                |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `agentProvider === 'none'`                               | `agentApiKey`, `agentModel`, `copilotByokEnabled`, `copilotByokProvider`, `copilotByokApiKey` |
| `agentProvider !== 'copilot-sdk'`                        | `copilotByokEnabled`, `copilotByokProvider`, `copilotByokApiKey`                              |
| `agentProvider === 'copilot-sdk' && !copilotByokEnabled` | `copilotByokProvider`, `copilotByokApiKey`                                                    |

## How It Works in This Project

- [[wiki/entities/use-settings-hook]] calls `sanitizeSettingsBeforeSave(settings)` inside `save()`.
- Sanitization happens before aggregate validation and before `settings:set` IPC.
- The sanitized object is also pushed back into React state, so the UI reflects the same payload that will be persisted.
- Save-time project-path validation runs against the sanitized object, not against stale pre-sanitization state.

## Why It Matters Here

- Hidden fields should not silently survive provider-mode changes and confuse future FT-14B execution logic.
- Sanitization keeps persistence consistent with what the user can currently see and reason about in the Settings UI.
- Clearing dormant secrets reduces accidental retention of no-longer-relevant API keys.

## See also

- [[wiki/entities/use-settings-hook]]
- [[wiki/entities/agent-provider-section]]
- [[wiki/concepts/settings-persistence-flow]]
