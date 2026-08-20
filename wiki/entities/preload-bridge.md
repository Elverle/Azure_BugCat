---
title: 'Preload Bridge (contextBridge)'
type: entity
subtype: middleware
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
tags: [electron, ipc, preload, context-bridge, shell, similarity, catalog]
lang: en
---

## Description

The preload script uses `contextBridge.exposeInMainWorld` to safely expose a typed `electronAPI` object to the renderer. Each method is a thin wrapper around `ipcRenderer.invoke()` for a specific whitelisted channel.

## Location

- `src/preload/index.ts` — bridge implementation
- `src/preload/index.d.ts` — preload-exported `ElectronAPI` type
- `src/renderer/src/global.d.ts` — renderer-side `Window.electronAPI` augmentation

## Exposed API (`window.electronAPI`)

| Method                           | IPC Channel                     | Direction                |
| -------------------------------- | ------------------------------- | ------------------------ |
| `ping()`                         | `ping`                          | invoke                   |
| `getSettings()`                  | `settings:get`                  | invoke                   |
| `setSettings(settings)`          | `settings:set`                  | invoke                   |
| `fetchBugs()`                    | `ado:fetch-bugs`                | invoke                   |
| `testAdoConnection(settings)`    | `ado:test-connection`           | invoke                   |
| `fetchAdoAttachmentDataUrl(url)` | `ado:fetch-attachment-data-url` | invoke                   |
| `categorizeBugs()`               | `llm:categorize`                | invoke                   |
| `cancelCategorization()`         | `llm:categorize-cancel`         | invoke                   |
| `getCategorizationStatus()`      | `llm:categorize-status`         | invoke                   |
| `testLlmConnection(settings)`    | `llm:test-connection`           | invoke                   |
| `onCategorizeProgress(cb)`       | `llm:categorize-progress`       | on (returns unsubscribe) |
| `onCategorizeDone(cb)`           | `llm:categorize-done`           | on (returns unsubscribe) |
| `findSimilarBugs()`              | `llm:find-similar`              | invoke                   |
| `cancelFindSimilar()`            | `llm:find-similar-cancel`       | invoke                   |
| `getFindSimilarStatus()`         | `llm:find-similar-status`       | invoke                   |
| `onFindSimilarProgress(cb)`      | `llm:find-similar-progress`     | on (returns unsubscribe) |
| `onFindSimilarDone(cb)`          | `llm:find-similar-done`         | on (returns unsubscribe) |
| `getSession()`                   | `session:get`                   | invoke                   |
| `clearSession()`                 | `session:clear`                 | invoke                   |
| `clearCatalog()`                 | `catalog:clear`                 | invoke                   |
| `getCatalogClosed()`             | `catalog:get-closed`            | invoke                   |
| `openExternal(url)`              | `shell:open-external`           | invoke                   |

## Type Export

```typescript
export type ElectronAPI = typeof electronAPI
```

The type is augmented onto `Window` in `index.d.ts`:

```typescript
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

## Security

- Only named methods are exposed — no raw `ipcRenderer.send`/`invoke` access.
- Progress subscriptions return cleanup functions to prevent listener leaks.
- `openExternal()` preserves the security boundary by routing browser launches through the validated main-process handler.
- Catalog access remains narrow and explicit: the renderer can trigger `clearSession()` and `clearCatalog()`, and FT-13 adds only `getCatalogClosed()` instead of a generic catalog-read bridge.
- Cancellation remains explicit and whitelisted: the renderer can only abort the current categorization run through the dedicated method, not by touching arbitrary process state.
- The status method is read-only and window-scoped: the renderer can query whether its own categorization is still active without receiving access to the controller itself.

## FT-14 Notes

`testAdoConnection(settings)` and `testLlmConnection(settings)` take the renderer's live, unsaved form as their argument. That payload can carry the `SECRET_PLACEHOLDER` sentinel rather than a real credential, because [[wiki/entities/ipc-handlers|`SETTINGS_GET`]] never gave the renderer the secret to begin with; the main process swaps the sentinel back for the stored plaintext before testing. The bridge itself stays unaware of the distinction — it forwards what it is given, and no decrypted secret ever travels back through it. See [[wiki/entities/secret-storage]].

## See also

- [[wiki/entities/ipc-handlers]] — main-process counterpart
- [[wiki/entities/ipc-channels]] — channel constant definitions
- [[wiki/entities/open-external-ipc]]
- [[wiki/entities/use-ai-cluster-hook]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/topics/electron-architecture]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
