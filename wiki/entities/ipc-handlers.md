---
title: 'IPC Handlers'
type: entity
subtype: service
created: 2026-04-29
updated: 2026-04-30
sources:
  [
    '[[wiki/sources/ft-01-scaffold]]',
    '[[wiki/sources/ft-02-settings]]',
    '[[wiki/sources/ft-03-ado-fetch]]',
    '[[wiki/sources/ft-04-llm-provider]]'
  ]
tags: [electron, ipc, main-process]
lang: en
---

## Description

Registers all `ipcMain.handle()` listeners. Each handler maps a typed IPC channel to a main-process operation. Called once from `app.whenReady()`.

## Location

`src/main/ipc-handlers.ts`

## Registered Handlers

| Channel               | Status         | Action                                                                                                                           |
| --------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `ping`                | ✅ Implemented | Returns `'pong'`                                                                                                                 |
| `settings:get`        | ✅ Implemented | Returns `store.get('settings')`                                                                                                  |
| `settings:set`        | ✅ Implemented | Calls `store.set('settings', payload)`                                                                                           |
| `session:get`         | ✅ Implemented | Returns `store.get('session')`                                                                                                   |
| `session:clear`       | ✅ Implemented | Sets `session` to `null`                                                                                                         |
| `ado:fetch-bugs`      | ✅ Implemented | Validates settings, calls `fetchBugsFromQuery()`, returns `BugItem[]`                                                            |
| `ado:test-connection` | ✅ Implemented | Calls `testAdoConnection()`, returns `TestConnectionResult`                                                                      |
| `llm:categorize`      | ✅ Implemented | Loads settings+session, calls `categorizeBugs()`, sends progressive `ChunkProgress` via `event.sender`, persists updated session |
| `llm:test-connection` | ✅ Implemented | Validates apiKey/copilotAuth, calls `testLLMConnection()`, returns `TestConnectionResult`                                        |

## Security Notes

- Only whitelisted channels are exposed — no generic `store:get`/`store:set`.
- `settings:set` accepts `unknown` — **no runtime validation** (technical debt).

## Dependencies

- [[wiki/entities/electron-store]] — `store` instance
- `src/shared/ipc-channels.ts` — `IPC_CHANNELS` constant map
- [[wiki/entities/ado-service]] — `fetchBugsFromQuery`, `testAdoConnection`
- [[wiki/entities/llm-service]] — `categorizeBugs`, `testLLMConnection`

## See also

- [[wiki/entities/preload-bridge]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/topics/electron-architecture]]
- [[wiki/topics/llm-categorization-pipeline]]
