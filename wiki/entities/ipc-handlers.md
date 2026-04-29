---
title: 'IPC Handlers'
type: entity
subtype: service
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-01-scaffold]]']
tags: [electron, ipc, main-process]
lang: en
---

## Description

Registers all `ipcMain.handle()` listeners. Each handler maps a typed IPC channel to a main-process operation. Called once from `app.whenReady()`.

## Location

`src/main/ipc-handlers.ts`

## Registered Handlers

| Channel               | Status         | Action                                 |
| --------------------- | -------------- | -------------------------------------- |
| `ping`                | ✅ Implemented | Returns `'pong'`                       |
| `settings:get`        | ✅ Implemented | Returns `store.get('settings')`        |
| `settings:set`        | ✅ Implemented | Calls `store.set('settings', payload)` |
| `session:get`         | ✅ Implemented | Returns `store.get('session')`         |
| `session:clear`       | ✅ Implemented | Sets `session` to `null`               |
| `ado:fetch-bugs`      | ⏳ Placeholder | Throws `Not implemented — FT-03`       |
| `ado:test-connection` | ⏳ Placeholder | Throws `Not implemented — FT-03`       |
| `llm:categorize`      | ⏳ Placeholder | Throws `Not implemented — FT-04`       |
| `llm:test-connection` | ⏳ Placeholder | Throws `Not implemented — FT-04`       |

## Security Notes

- Only whitelisted channels are exposed — no generic `store:get`/`store:set`.
- `settings:set` accepts `unknown` — **no runtime validation** (technical debt).

## Dependencies

- [[wiki/entities/electron-store]] — `store` instance
- `src/shared/ipc-channels.ts` — `IPC_CHANNELS` constant map

## See also

- [[wiki/entities/preload-bridge]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/topics/electron-architecture]]
