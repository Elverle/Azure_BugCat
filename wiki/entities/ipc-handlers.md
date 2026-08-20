---
title: 'IPC Handlers'
type: entity
subtype: service
created: 2026-04-29
updated: 2026-08-20
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
    '[[wiki/sources/ft-13-closed-bugs-history]]',
    '[[wiki/analyses/cancel-categorization-flow]]',
    '[[wiki/analyses/dashboard-categorization-state-recovery]]'
  ]
tags: [electron, ipc, main-process, shell, catalog, secrets]
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
| `settings:get`                  | ✅ Implemented | Returns `store.get('settings')` with `pat`/`apiKey` replaced by [[wiki/entities/secret-storage\|`SECRET_PLACEHOLDER`]] when set — the renderer never receives the decrypted secret                            |
| `settings:set`                  | ✅ Implemented | Validates via `assertValidSettings()`, then `store.set('settings', payload)`; a sentinel `pat`/`apiKey` keeps the existing stored value, anything else is encrypted through [[wiki/entities/secret-storage]]    |
| `session:get`                   | ✅ Implemented | Returns `store.get('session')`                                                                                                                                                                                  |
| `session:clear`                 | ✅ Implemented | Sets `session` to `null`                                                                                                                                                                                        |
| `catalog:clear`                 | ✅ Implemented | Sets `bugCatalog` to `null`, records `catalogMetadata.lastClearedAt`, and leaves the current `session` untouched                                                                                                |
| `catalog:get-closed`            | ✅ Implemented | Reads `bugCatalog`, filters to entries with `closedAt !== null`, and returns that closed-only slice together with the latest `session.fetchedAt` plus `catalogMetadata.lastClearedAt` if available              |
| `ado:fetch-bugs`                | ✅ Implemented | Validates settings, calls `fetchBugsFromQuery()`, merges results into `bugCatalog`, persists a fresh open-bug `session` plus `lastFetchNewCount`, and reuses categorization when signatures still match         |
| `ado:test-connection`           | ✅ Implemented | Accepts an optional `settingsOverride` (the live, unsaved form); resolves any secret sentinel in it back to the stored plaintext via `resolveSecrets()`, calls `testAdoConnection()`, returns `TestConnectionResult` |
| `ado:fetch-attachment-data-url` | ✅ Implemented | Loads persisted settings and returns a renderer-safe attachment data URL for Azure DevOps-hosted images                                                                                                         |
| `llm:categorize`                | ✅ Implemented | Loads settings+session, filters to uncategorized open bugs, creates a per-window `AbortController`, calls `categorizeBugs()`, and persists each completed chunk into `session` and `bugCatalog` as it arrives (survives cancellation), then stamps `categorizedAt` once the run finishes |
| `llm:categorize-cancel`         | ✅ Implemented | Aborts the active categorization controller for the current renderer window and returns `{ cancelled }`                                                                                                         |
| `llm:categorize-status`         | ✅ Implemented | Returns `{ active }` for the current renderer window so a remounted Dashboard can recover an in-flight categorization                                                                                           |
| `llm:test-connection`           | ✅ Implemented | Same `settingsOverride` + `resolveSecrets()` resolution as `ado:test-connection`; validates `apiKey`, calls `testLLMConnection()`, returns `TestConnectionResult`; generic-provider `baseUrl` rules are enforced downstream |
| `llm:find-similar`              | ✅ Implemented | Validates settings plus categorized session state, calls `findSimilarBugs()`, sends `SimilarityProgress`, persists `similarityResults`, and updates catalog similarity metadata                                 |
| `shell:open-external`           | ✅ Implemented | Validates that the payload is a well-formed `https://` URL, then delegates to `shell.openExternal()`                                                                                                            |

## Security Notes

- Only whitelisted channels are exposed — no generic `store:get`/`store:set`.
- `settings:set` accepts `unknown` — **no runtime validation** (technical debt).
- The shell handler uses `new URL(url)` plus protocol enforcement so the renderer cannot open arbitrary schemes.
- FT-08 removed the old Copilot-specific authentication branch from `llm:test-connection`; all providers now enter the same `testLLMConnection()` path once minimal required fields are present.
- FT-10 keeps similarity analysis behind the same main-process boundary: the renderer cannot pass raw bug payloads or store writes directly, it can only request analysis against the current persisted session.
- FT-12 keeps `bugCatalog` main-process owned; FT-13 adds only a filtered closed-history read channel, so the renderer still cannot enumerate or mutate the full catalog directly.
- Categorization cancellation is scoped per `webContents`, preventing one renderer surface from aborting another window's run.
- Categorization status is also scoped per `webContents`, so Dashboard remount recovery reflects only the current window's work.
- Cancelled categorization runs do persist partial results: `llm:categorize` merges each completed chunk into `session` and `bugCatalog` as it arrives (`persistChunk()`, FT-12), so a cancel keeps every chunk that finished before the signal was honored and only leaves the in-flight/remaining bugs uncategorized. Only the final `categorizedAt` stamp on the session is written after a run completes without cancellation — see [[wiki/analyses/cancel-categorization-flow]] for the pre-FT-12 all-or-nothing behavior this replaced.
- `session:clear` and `catalog:clear` intentionally have different blast radii, which lets operators reset the open snapshot without losing historical categorization reuse.
- FT-14 keeps `pat`/`apiKey` plaintext confined to this file: `readSettings()` is the only place `decryptSecret()` is called, and it exists specifically so no other module needs direct access to `store.get('settings')` for secret fields. `SETTINGS_GET` and `SETTINGS_SET` never let the decrypted value cross into the renderer — see [[wiki/entities/secret-storage]] for the sentinel exchange and the connection-test resolution path.
- `catalog:get-closed` reuses `session.fetchedAt` as the renderer-facing "last update" marker for FT-13, and now also forwards the persisted history cleanup baseline without exposing the mutable session snapshot itself.
- `toRendererError()` converts plain thrown objects into real `Error` instances before they cross the IPC boundary, preserving human-readable messages and error codes for the renderer.

## Dependencies

- [[wiki/entities/electron-store]] — `store` instance
- [[wiki/entities/secret-storage]] — `encryptSecret`/`decryptSecret` for settings persistence; `SECRET_PLACEHOLDER`/`isSecretPlaceholder` for the renderer-facing sentinel
- `src/shared/ipc-channels.ts` — `IPC_CHANNELS` constant map
- [[wiki/entities/ado-service]] — `fetchBugsFromQuery`, `testAdoConnection`
- [[wiki/entities/llm-service]] — `categorizeBugs`, `testLLMConnection`
- [[wiki/entities/similarity-service]] — `findSimilarBugs`
- [[wiki/entities/catalog-merge-utility]] — signature computation plus fetch/categorize/similarity catalog updates
- [[wiki/entities/open-external-ipc]]

## See also

- [[wiki/entities/preload-bridge]]
- [[wiki/entities/open-external-ipc]]
- [[wiki/entities/secret-storage]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/electron-architecture]]
- [[wiki/topics/llm-categorization-pipeline]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
