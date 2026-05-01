---
title: 'IPC Channel Constants'
type: entity
subtype: config
created: 2026-04-29
updated: 2026-05-01
sources:
	[
		'[[wiki/sources/ft-01-scaffold]]',
		'[[wiki/sources/ft-06-bug-detail-drawer]]',
		'[[wiki/sources/ft-10-ai-cluster-similarity]]'
	]
tags: [electron, ipc, shared, shell, similarity]
lang: en
---

## Description

Centralized typed IPC channel definitions shared between main, preload, and renderer. Uses `as const` for literal types.

## Location

`src/shared/ipc-channels.ts`

## Channels

| Constant                    | Value                       | Domain       |
| --------------------------- | --------------------------- | ------------ |
| `PING`                      | `ping`                      | Test         |
| `SETTINGS_GET`              | `settings:get`              | Settings     |
| `SETTINGS_SET`              | `settings:set`              | Settings     |
| `ADO_FETCH_BUGS`            | `ado:fetch-bugs`            | Azure DevOps |
| `ADO_TEST_CONNECTION`       | `ado:test-connection`       | Azure DevOps |
| `LLM_CATEGORIZE`            | `llm:categorize`            | LLM          |
| `LLM_CATEGORIZE_PROGRESS`   | `llm:categorize-progress`   | LLM          |
| `LLM_TEST_CONNECTION`       | `llm:test-connection`       | LLM          |
| `LLM_FIND_SIMILAR`          | `llm:find-similar`          | LLM          |
| `LLM_FIND_SIMILAR_PROGRESS` | `llm:find-similar-progress` | LLM          |
| `SESSION_GET`               | `session:get`               | Session      |
| `SESSION_CLEAR`             | `session:clear`             | Session      |
| `OPEN_EXTERNAL`             | `shell:open-external`       | Shell        |

## Type

```typescript
export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
```

## See also

- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/open-external-ipc]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
