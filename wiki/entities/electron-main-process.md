---
title: 'Electron Main Process'
type: entity
subtype: service
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-01-scaffold]]']
tags: [electron, main-process]
lang: en
---

## Description

The Electron main process entry point. Creates the `BrowserWindow`, configures security settings, registers IPC handlers, and manages app lifecycle.

## Location

`src/main/index.ts`

## Behaviour

### Window creation (`createWindow`)

- Size: 1280×800 (min 1024×700)
- `show: false` until `ready-to-show` to avoid visual flash
- Security: `nodeIntegration=false`, `contextIsolation=true`, `sandbox=true`
- Preload script: `../preload/index.js`

### External link handling

`setWindowOpenHandler` intercepts navigation. Only `https:` URLs are opened via `shell.openExternal`. All others are silently denied.

### Content loading

- **Dev**: loads `ELECTRON_RENDERER_URL` (Vite dev server)
- **Prod**: loads `../renderer/index.html` (built output)

### App lifecycle

- `app.whenReady()` → `registerIPCHandlers()` → `createWindow()`
- macOS: re-creates window on `activate` if none exist
- Non-macOS: `window-all-closed` → `app.quit()`

## Dependencies

- `@electron-toolkit/utils` — `is.dev` helper
- [[wiki/entities/ipc-handlers]] — `registerIPCHandlers()`

## See also

- [[wiki/concepts/ipc-security-model]]
- [[wiki/topics/electron-architecture]]
