---
title: 'Agent Runner Factory'
type: entity
subtype: service
created: 2026-05-18
updated: 2026-05-18
sources: ['[[wiki/sources/ft-14b-agent-sessions]]']
tags: [agent, factory, settings, provider-resolution]
lang: en
---

## Description

Factory that resolves `AppSettings` into the concrete agent runner implementation used by FT-14B. It preserves the FT-14A auto-derivation rule by letting `llmProvider` take precedence over the manual `agentProvider` field for Anthropic and OpenAI.

## Location

`src/main/agent/runner-factory.ts`

## Resolution Rules

| Settings state                               | Runner returned                      |
| -------------------------------------------- | ------------------------------------ |
| `llmProvider === 'anthropic'`                | [[wiki/entities/claude-sdk-runner]]  |
| `llmProvider === 'openai'`                   | [[wiki/entities/codex-sdk-runner]]   |
| Manual `agentProvider === 'claude-sdk'`      | [[wiki/entities/claude-sdk-runner]]  |
| Manual `agentProvider === 'codex-sdk'`       | [[wiki/entities/codex-sdk-runner]]   |
| Manual `agentProvider === 'copilot-sdk'`     | [[wiki/entities/copilot-sdk-runner]] |
| Manual `agentProvider === 'none'` or unknown | Throws `AgentNotConfiguredError`     |

## Notes

- FT-14B does not yet branch on `SessionMode`; every current runner reports `supportsFixMode = false`.
- `AgentNotConfiguredError` is intentionally specialized so IPC can map it to `AGENT_NOT_CONFIGURED` instead of a generic failure.

## Dependencies

- [[wiki/entities/shared-types]]
- [[wiki/entities/claude-sdk-runner]]
- [[wiki/entities/codex-sdk-runner]]
- [[wiki/entities/copilot-sdk-runner]]

## See also

- [[wiki/concepts/single-active-agent-session-lifecycle]]
- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/agent-session-configuration-foundation]]
