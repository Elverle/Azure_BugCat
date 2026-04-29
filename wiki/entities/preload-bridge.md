---
title: 'Preload Bridge (contextBridge)'
type: entity
subtype: middleware
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-01-scaffold]]']
tags: [electron, ipc, preload, context-bridge]
lang: en
---

## Description

The preload script uses `contextBridge.exposeInMainWorld` to safely expose a typed `electronAPI` object to the renderer. Each method is a thin wrapper around `ipcRenderer.invoke()` for a specific whitelisted channel.

## Location

- `src/preload/index.ts` — bridge implementation
- `src/preload/index.d.ts` — TypeScript declarations for `Window.electronAPI`

## Exposed API (`window.electronAPI`)

| Method                     | IPC Channel               | Direction                |
| -------------------------- | ------------------------- | ------------------------ |
| `ping()`                   | `ping`                    | invoke                   |
| `getSettings()`            | `settings:get`            | invoke                   |
| `setSettings(settings)`    | `settings:set`            | invoke                   |
| `fetchBugs()`              | `ado:fetch-bugs`          | invoke                   |
| `testAdoConnection()`      | `ado:test-connection`     | invoke                   |
| `categorizeBugs()`         | `llm:categorize`          | invoke                   |
| `testLlmConnection()`      | `llm:test-connection`     | invoke                   |
| `onCategorizeProgress(cb)` | `llm:categorize-progress` | on (returns unsubscribe) |
| `getSession()`             | `session:get`             | invoke                   |
| `clearSession()`           | `session:clear`           | invoke                   |

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
- `onCategorizeProgress` returns a cleanup function to prevent listener leaks.

## See also

- [[wiki/entities/ipc-handlers]] — main-process counterpart
- [[wiki/entities/ipc-channels]] — channel constant definitions
- [[wiki/concepts/ipc-security-model]]
- [[wiki/topics/electron-architecture]]
