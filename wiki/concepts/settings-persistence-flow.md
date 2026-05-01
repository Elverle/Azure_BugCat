---
title: 'Settings Persistence Flow'
type: concept
created: 2026-04-29
updated: 2026-05-01
sources:
  [
    '[[wiki/sources/ft-02-settings]]',
    '[[wiki/sources/ft-03-ado-fetch]]',
    '[[wiki/sources/ft-04-llm-provider]]',
    '[[wiki/sources/ft-07-session-persistence]]',
    '[[wiki/sources/ft-08-generic-provider]]'
  ]
tags: [electron, ipc, electron-store, persistence, settings, session]
lang: en
---

## Definition

Settings and session data flow from the React renderer through the Electron IPC bridge to the main process, where they are persisted in an encrypted `electron-store`. FT-07 extends this concept with an explicit startup migration step and a user-triggered session reset path.

## Data Flow

```
App startup
    → migrateStore(store)
    → registerIPCHandlers()

Renderer
    ├─ useSettings() → getSettings / setSettings / test connections
    ├─ useDashboard() → getSession / fetchBugs / categorizeBugs
    └─ Settings danger zone → clearSession
                     │
                     ▼
            contextBridge (preload)
                     │
                     ▼
            ipcMain.handle(...)
                     │
                     ▼
            encrypted electron-store
```

## Steps

### Startup migration

1. `app.whenReady()` calls [[wiki/entities/store-migration]] before registering IPC handlers.
2. The migration layer detects legacy stores via `store.has('schemaVersion')`.
3. Pending migrations transform the persisted `settings`/`session` payloads in version order, including FT-08's provider cleanup.
4. Migrated data is written back first, then the current schema version is stored before normal app flows continue.

### Settings load/save

1. `useSettings` calls `window.electronAPI.getSettings()` in a `useEffect`.
2. Preload invokes `ipcRenderer.invoke('settings:get')`.
3. Main process reads `store.get('settings')`.
4. Renderer stores the loaded payload as both current and original state.
5. On save, validated settings flow back through `settings:set` to `store.set('settings', payload)`.

### Session read/write/clear

1. Dashboard hydration calls `window.electronAPI.getSession()`.
2. FT-03 fetch and FT-04 categorize handlers overwrite `store.set('session', sessionPayload)` with new timestamps and bugs.
3. FT-07 adds a guarded reset path: Settings opens [[wiki/entities/confirm-dialog]] before invoking `window.electronAPI.clearSession()`.
4. `session:clear` sets the stored session to `null` without modifying saved settings.

### Test connections

1. `testAdoConnection()` / `testLlmConnection()` in `useSettings` race IPC calls against a 5-second timeout.
2. Main handlers run real provider-specific validation and service calls rather than placeholder stubs.
3. Results are rendered inline in the Settings experience.

## Security

- Credentials (PAT, API keys) are encrypted at rest via [[wiki/entities/electron-store]].
- Only whitelisted IPC channels are exposed via [[wiki/entities/preload-bridge]].
- No raw `ipcRenderer` access exists in the renderer — see [[wiki/concepts/ipc-security-model]].

## See also

- [[wiki/entities/use-settings-hook]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/electron-store]]
- [[wiki/entities/store-migration]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/topics/electron-architecture]]
- [[wiki/topics/session-persistence-lifecycle]]
