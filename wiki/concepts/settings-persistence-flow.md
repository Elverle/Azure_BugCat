---
title: 'Settings Persistence Flow'
type: concept
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-02-settings]]']
tags: [electron, ipc, electron-store, persistence, settings]
lang: en
---

## Definition

Settings flow from the React renderer through the Electron IPC bridge to the main process, where they are persisted in an encrypted electron-store. The flow is bidirectional: load on mount, save on user action.

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        RENDERER                             │
│                                                             │
│  useSettings()                                              │
│    ├─ mount: await window.electronAPI.getSettings()         │
│    └─ save:  await window.electronAPI.setSettings(settings) │
│                         │                                   │
└─────────────────────────┼───────────────────────────────────┘
                          │ contextBridge (preload)
┌─────────────────────────┼───────────────────────────────────┐
│                     MAIN PROCESS                            │
│                         │                                   │
│  ipc-handlers.ts        │                                   │
│    ├─ settings:get → store.get('settings')                  │
│    └─ settings:set → store.set('settings', payload)         │
│                         │                                   │
│  electron-store          │                                   │
│    └─ AES-256-CBC encrypted with machine-id derived key     │
└─────────────────────────────────────────────────────────────┘
```

## Steps

### Load (mount)

1. `useSettings` calls `window.electronAPI.getSettings()` in a `useEffect`
2. Preload bridge invokes `ipcRenderer.invoke('settings:get')`
3. Main process handler reads `store.get('settings')` from encrypted store
4. Result returned to renderer → `setSettings(loaded)` + `setOriginalSettings(loaded)`
5. If load fails, defaults are used and an error banner is shown

### Save (user action)

1. User clicks Save → `save()` callback
2. All fields marked as touched, full validation run
3. If valid: `window.electronAPI.setSettings(settings)` called
4. Main process handler calls `store.set('settings', settings)`
5. On success: `originalSettings` updated (resets dirty flag), success banner shown
6. On error: error banner with message

### Test Connections

1. `testAdoConnection()` / `testLlmConnection()` in `useSettings`
2. IPC call raced against 5 s `Promise.race` timeout
3. Main process stubs currently return `{ success: false, message: '...not yet implemented' }`
4. Result displayed inline with auto-dismiss after 5 s

## Security

- Credentials (PAT, API keys) are encrypted at rest via [[wiki/entities/electron-store]]
- Only whitelisted IPC channels exposed via [[wiki/entities/preload-bridge]]
- No raw `ipcRenderer` access in renderer — see [[wiki/concepts/ipc-security-model]]

## See also

- [[wiki/entities/use-settings-hook]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/electron-store]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/topics/electron-architecture]]
