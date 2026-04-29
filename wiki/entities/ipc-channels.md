---
title: 'IPC Channel Constants'
type: entity
subtype: config
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-01-scaffold]]']
tags: [electron, ipc, shared]
lang: en
---

## Description

Centralized typed IPC channel definitions shared between main, preload, and renderer. Uses `as const` for literal types.

## Location

`src/shared/ipc-channels.ts`

## Channels

| Constant                  | Value                     | Domain       |
| ------------------------- | ------------------------- | ------------ |
| `PING`                    | `ping`                    | Test         |
| `SETTINGS_GET`            | `settings:get`            | Settings     |
| `SETTINGS_SET`            | `settings:set`            | Settings     |
| `ADO_FETCH_BUGS`          | `ado:fetch-bugs`          | Azure DevOps |
| `ADO_TEST_CONNECTION`     | `ado:test-connection`     | Azure DevOps |
| `LLM_CATEGORIZE`          | `llm:categorize`          | LLM          |
| `LLM_CATEGORIZE_PROGRESS` | `llm:categorize-progress` | LLM          |
| `LLM_TEST_CONNECTION`     | `llm:test-connection`     | LLM          |
| `SESSION_GET`             | `session:get`             | Session      |
| `SESSION_CLEAR`           | `session:clear`           | Session      |

## Type

```typescript
export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
```

## See also

- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
