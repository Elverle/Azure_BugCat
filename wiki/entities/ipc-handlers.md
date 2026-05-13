---
title: 'IPC Handlers'
type: entity
subtype: service
created: 2026-04-29
updated: 2026-05-13
sources:
  [
    '[[wiki/sources/ft-01-scaffold]]',
    '[[wiki/sources/ft-02-settings]]',
    '[[wiki/sources/ft-03-ado-fetch]]',
    '[[wiki/sources/ft-04-llm-provider]]',
    '[[wiki/sources/ft-06-bug-detail-drawer]]',
    '[[wiki/sources/ft-07-session-persistence]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-10-ai-cluster-similarity]]',
    '[[wiki/sources/ft-12-incremental-session-cache]]',
    '[[wiki/analyses/cancel-categorization-flow]]',
    '[[wiki/analyses/dashboard-categorization-state-recovery]]'
  ]
tags: [electron, ipc, main-process, shell, catalog]
lang: en
---

## Description

Registers all `ipcMain.handle()` listeners. Each handler maps a typed IPC channel to a main-process operation. Called once from `app.whenReady()`, after store migration has already completed.

## Location

`src/main/ipc-handlers.ts`

## Registered Handlers

| Channel                         | Status         | Action                                                                                                                                                                                                          |
| ------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ping`                          | ✅ Implemented | Returns `'pong'`                                                                                                                                                                                                |
| `settings:get`                  | ✅ Implemented | Returns `store.get('settings')`                                                                                                                                                                                 |
| `settings:set`                  | ✅ Implemented | Calls `store.set('settings', payload)`                                                                                                                                                                          |
| `session:get`                   | ✅ Implemented | Returns `store.get('session')`                                                                                                                                                                                  |
| `session:clear`                 | ✅ Implemented | Sets `session` to `null`                                                                                                                                                                                        |
| `catalog:clear`                 | ✅ Implemented | Sets `bugCatalog` to `null` without touching the current `session`                                                                                                                                              |
| `ado:fetch-bugs`                | ✅ Implemented | Validates settings, calls `fetchBugsFromQuery()`, merges results into `bugCatalog`, persists a fresh open-bug `session` plus `lastFetchNewCount`, and reuses categorization when signatures still match         |
| `ado:test-connection`           | ✅ Implemented | Calls `testAdoConnection()`, returns `TestConnectionResult`                                                                                                                                                     |
| `ado:fetch-attachment-data-url` | ✅ Implemented | Loads persisted settings and returns a renderer-safe attachment data URL for Azure DevOps-hosted images                                                                                                         |
| `llm:categorize`                | ✅ Implemented | Loads settings+session, filters to uncategorized open bugs, creates a per-window `AbortController`, calls `categorizeBugs()`, merges results back into `session` and `bugCatalog`, and persists only on success |
| `llm:categorize-cancel`         | ✅ Implemented | Aborts the active categorization controller for the current renderer window and returns `{ cancelled }`                                                                                                         |
| `llm:categorize-status`         | ✅ Implemented | Returns `{ active }` for the current renderer window so a remounted Dashboard can recover an in-flight categorization                                                                                           |
| `llm:test-connection`           | ✅ Implemented | Validates `apiKey`, calls `testLLMConnection()`, returns `TestConnectionResult`; generic-provider `baseUrl` rules are enforced downstream                                                                       |
| `llm:find-similar`              | ✅ Implemented | Validates settings plus categorized session state, calls `findSimilarBugs()`, sends `SimilarityProgress`, persists `similarityResults`, and updates catalog similarity metadata                                 |
| `shell:open-external`           | ✅ Implemented | Validates that the payload is a well-formed `https://` URL, then delegates to `shell.openExternal()`                                                                                                            |

## Security Notes

- Only whitelisted channels are exposed — no generic `store:get`/`store:set`.
- `settings:set` accepts `unknown` — **no runtime validation** (technical debt).
- The shell handler uses `new URL(url)` plus protocol enforcement so the renderer cannot open arbitrary schemes.
- FT-08 removed the old Copilot-specific authentication branch from `llm:test-connection`; all providers now enter the same `testLLMConnection()` path once minimal required fields are present.
- FT-10 keeps similarity analysis behind the same main-process boundary: the renderer cannot pass raw bug payloads or store writes directly, it can only request analysis against the current persisted session.
- FT-12 keeps `bugCatalog` main-process only: the renderer can clear history through a dedicated channel but cannot enumerate or mutate catalog entries directly.
- Categorization cancellation is scoped per `webContents`, preventing one renderer surface from aborting another window's run.
- Categorization status is also scoped per `webContents`, so Dashboard remount recovery reflects only the current window's work.
- Cancelled categorization runs do not write partial `SessionData`; the existing session remains the source of truth until a full run succeeds.
- `session:clear` and `catalog:clear` intentionally have different blast radii, which lets operators reset the open snapshot without losing historical categorization reuse.
- `toRendererError()` converts plain thrown objects into real `Error` instances before they cross the IPC boundary, preserving human-readable messages and error codes for the renderer.

## Dependencies

- [[wiki/entities/electron-store]] — `store` instance
- `src/shared/ipc-channels.ts` — `IPC_CHANNELS` constant map
- [[wiki/entities/ado-service]] — `fetchBugsFromQuery`, `testAdoConnection`
- [[wiki/entities/llm-service]] — `categorizeBugs`, `testLLMConnection`
- [[wiki/entities/similarity-service]] — `findSimilarBugs`
- [[wiki/entities/catalog-merge-utility]] — signature computation plus fetch/categorize/similarity catalog updates
- [[wiki/entities/open-external-ipc]]

## See also

- [[wiki/entities/preload-bridge]]
- [[wiki/entities/open-external-ipc]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/electron-architecture]]
- [[wiki/topics/llm-categorization-pipeline]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
