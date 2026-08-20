---
title: 'IPC Channel Constants'
type: entity
subtype: config
created: 2026-04-29
updated: 2026-08-20
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

## FT-14 Notes

- No channel was added or renamed for OS keychain secret protection, but the payload contract of `SETTINGS_GET` / `SETTINGS_SET` changed: `pat`/`apiKey` now cross the bridge as either an empty string or the [[wiki/entities/secret-storage|`SECRET_PLACEHOLDER`]] sentinel, never as the decrypted secret. See [[wiki/entities/secret-storage]] for the sentinel exchange and why the plaintext never leaves the main process.
- `ADO_TEST_CONNECTION` and `LLM_TEST_CONNECTION` now accept an optional `settingsOverride` argument (the renderer's live, unsaved form) so a connection test can use a freshly-typed secret before it is saved; a placeholder inside that override is resolved back to the stored plaintext in the main process.

## See also

- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/open-external-ipc]]
- [[wiki/entities/secret-storage]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
