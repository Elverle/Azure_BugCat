---
title: 'IPC Channel Constants'
type: entity
subtype: config
created: 2026-04-29
updated: 2026-05-13
sources:
	[
		'[[wiki/sources/ft-01-scaffold]]',
		'[[wiki/sources/ft-06-bug-detail-drawer]]',
		'[[wiki/sources/ft-10-ai-cluster-similarity]]',
		'[[wiki/sources/ft-12-incremental-session-cache]]',
		'[[wiki/sources/ft-13-closed-bugs-history]]',
		'[[wiki/analyses/cancel-categorization-flow]]',
		'[[wiki/analyses/dashboard-categorization-state-recovery]]'
	]
tags: [electron, ipc, shared, shell, similarity, catalog]
lang: en
---

## Description

Centralized typed IPC channel definitions shared between main, preload, and renderer. Uses `as const` for literal types.

## Location

`src/shared/ipc-channels.ts`

## Channels

| Constant                        | Value                           | Domain       |
| ------------------------------- | ------------------------------- | ------------ |
| `PING`                          | `ping`                          | Test         |
| `SETTINGS_GET`                  | `settings:get`                  | Settings     |
| `SETTINGS_SET`                  | `settings:set`                  | Settings     |
| `ADO_FETCH_BUGS`                | `ado:fetch-bugs`                | Azure DevOps |
| `ADO_TEST_CONNECTION`           | `ado:test-connection`           | Azure DevOps |
| `ADO_FETCH_ATTACHMENT_DATA_URL` | `ado:fetch-attachment-data-url` | Azure DevOps |
| `LLM_CATEGORIZE`                | `llm:categorize`                | LLM          |
| `LLM_CATEGORIZE_CANCEL`         | `llm:categorize-cancel`         | LLM          |
| `LLM_CATEGORIZE_STATUS`         | `llm:categorize-status`         | LLM          |
| `LLM_CATEGORIZE_PROGRESS`       | `llm:categorize-progress`       | LLM          |
| `LLM_TEST_CONNECTION`           | `llm:test-connection`           | LLM          |
| `LLM_FIND_SIMILAR`              | `llm:find-similar`              | LLM          |
| `LLM_FIND_SIMILAR_PROGRESS`     | `llm:find-similar-progress`     | LLM          |
| `SESSION_GET`                   | `session:get`                   | Session      |
| `SESSION_CLEAR`                 | `session:clear`                 | Session      |
| `CATALOG_CLEAR`                 | `catalog:clear`                 | Catalog      |
| `CATALOG_GET_CLOSED`            | `catalog:get-closed`            | Catalog      |
| `OPEN_EXTERNAL`                 | `shell:open-external`           | Shell        |

## Type

```typescript
export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
```

## See also

- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/open-external-ipc]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
