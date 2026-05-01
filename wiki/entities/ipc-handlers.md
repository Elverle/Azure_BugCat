---
title: 'IPC Handlers'
type: entity
subtype: service
created: 2026-04-29
updated: 2026-05-01
sources:
  [
    '[[wiki/sources/ft-01-scaffold]]',
    '[[wiki/sources/ft-02-settings]]',
    '[[wiki/sources/ft-03-ado-fetch]]',
    '[[wiki/sources/ft-04-llm-provider]]',
    '[[wiki/sources/ft-06-bug-detail-drawer]]',
    '[[wiki/sources/ft-07-session-persistence]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-10-ai-cluster-similarity]]'
  ]
tags: [electron, ipc, main-process, shell]
lang: en
---

## Description

Registers all `ipcMain.handle()` listeners. Each handler maps a typed IPC channel to a main-process operation. Called once from `app.whenReady()`, after store migration has already completed.

## Location

`src/main/ipc-handlers.ts`

## Registered Handlers

| Channel               | Status         | Action                                                                                                                                    |
| --------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `ping`                | ✅ Implemented | Returns `'pong'`                                                                                                                          |
| `settings:get`        | ✅ Implemented | Returns `store.get('settings')`                                                                                                           |
| `settings:set`        | ✅ Implemented | Calls `store.set('settings', payload)`                                                                                                    |
| `session:get`         | ✅ Implemented | Returns `store.get('session')`                                                                                                            |
| `session:clear`       | ✅ Implemented | Sets `session` to `null`                                                                                                                  |
| `ado:fetch-bugs`      | ✅ Implemented | Validates settings, calls `fetchBugsFromQuery()`, returns `BugItem[]`                                                                     |
| `ado:test-connection` | ✅ Implemented | Calls `testAdoConnection()`, returns `TestConnectionResult`                                                                               |
| `llm:categorize`      | ✅ Implemented | Loads settings+session, calls `categorizeBugs()`, sends progressive `ChunkProgress` via `event.sender`, persists updated session          |
| `llm:test-connection` | ✅ Implemented | Validates `apiKey`, calls `testLLMConnection()`, returns `TestConnectionResult`; generic-provider `baseUrl` rules are enforced downstream |
| `llm:find-similar`    | ✅ Implemented | Validates settings plus categorized session state, calls `findSimilarBugs()`, sends `SimilarityProgress`, persists `similarityResults`    |
| `shell:open-external` | ✅ Implemented | Validates that the payload is a well-formed `https://` URL, then delegates to `shell.openExternal()`                                      |

## Security Notes

- Only whitelisted channels are exposed — no generic `store:get`/`store:set`.
- `settings:set` accepts `unknown` — **no runtime validation** (technical debt).
- The shell handler uses `new URL(url)` plus protocol enforcement so the renderer cannot open arbitrary schemes.
- FT-08 removed the old Copilot-specific authentication branch from `llm:test-connection`; all providers now enter the same `testLLMConnection()` path once minimal required fields are present.
- FT-10 keeps similarity analysis behind the same main-process boundary: the renderer cannot pass raw bug payloads or store writes directly, it can only request analysis against the current persisted session.

## Dependencies

- [[wiki/entities/electron-store]] — `store` instance
- `src/shared/ipc-channels.ts` — `IPC_CHANNELS` constant map
- [[wiki/entities/ado-service]] — `fetchBugsFromQuery`, `testAdoConnection`
- [[wiki/entities/llm-service]] — `categorizeBugs`, `testLLMConnection`
- [[wiki/entities/similarity-service]] — `findSimilarBugs`
- [[wiki/entities/open-external-ipc]]

## See also

- [[wiki/entities/preload-bridge]]
- [[wiki/entities/open-external-ipc]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/electron-architecture]]
- [[wiki/topics/llm-categorization-pipeline]]
