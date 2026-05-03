---
title: 'Preload Bridge (contextBridge)'
type: entity
subtype: middleware
created: 2026-04-29
updated: 2026-05-03
sources:
  [
    '[[wiki/sources/ft-01-scaffold]]',
    '[[wiki/sources/ft-06-bug-detail-drawer]]',
    '[[wiki/sources/ft-10-ai-cluster-similarity]]',
    '[[wiki/analyses/cancel-categorization-flow]]',
    '[[wiki/analyses/dashboard-categorization-state-recovery]]'
  ]
tags: [electron, ipc, preload, context-bridge, shell, similarity]
lang: en
---

## Description

The preload script uses `contextBridge.exposeInMainWorld` to safely expose a typed `electronAPI` object to the renderer. Each method is a thin wrapper around `ipcRenderer.invoke()` for a specific whitelisted channel.

## Location

- `src/preload/index.ts` — bridge implementation
- `src/preload/index.d.ts` — TypeScript declarations for `Window.electronAPI`

## Exposed API (`window.electronAPI`)

| Method                      | IPC Channel                 | Direction                |
| --------------------------- | --------------------------- | ------------------------ |
| `ping()`                    | `ping`                      | invoke                   |
| `getSettings()`             | `settings:get`              | invoke                   |
| `setSettings(settings)`     | `settings:set`              | invoke                   |
| `fetchBugs()`               | `ado:fetch-bugs`            | invoke                   |
| `testAdoConnection()`       | `ado:test-connection`       | invoke                   |
| `categorizeBugs()`          | `llm:categorize`            | invoke                   |
| `cancelCategorization()`    | `llm:categorize-cancel`     | invoke                   |
| `getCategorizationStatus()` | `llm:categorize-status`     | invoke                   |
| `testLlmConnection()`       | `llm:test-connection`       | invoke                   |
| `onCategorizeProgress(cb)`  | `llm:categorize-progress`   | on (returns unsubscribe) |
| `findSimilarBugs()`         | `llm:find-similar`          | invoke                   |
| `onFindSimilarProgress(cb)` | `llm:find-similar-progress` | on (returns unsubscribe) |
| `getSession()`              | `session:get`               | invoke                   |
| `clearSession()`            | `session:clear`             | invoke                   |
| `openExternal(url)`         | `shell:open-external`       | invoke                   |

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
- Cancellation remains explicit and whitelisted: the renderer can only abort the current categorization run through the dedicated method, not by touching arbitrary process state.
- The status method is read-only and window-scoped: the renderer can query whether its own categorization is still active without receiving access to the controller itself.

## See also

- [[wiki/entities/ipc-handlers]] — main-process counterpart
- [[wiki/entities/ipc-channels]] — channel constant definitions
- [[wiki/entities/open-external-ipc]]
- [[wiki/entities/use-ai-cluster-hook]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/topics/electron-architecture]]
