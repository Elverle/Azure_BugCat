---
title: 'Electron Main Process'
type: entity
subtype: service
created: 2026-04-29
updated: 2026-05-31
sources:
  ['[[wiki/sources/ft-01-scaffold]]', '[[wiki/sources/min-10-release-automation-auto-updates]]']
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
- Startup also calls `checkForUpdates()` after window creation; the function returns immediately when `app.isPackaged` is false.
- macOS: re-creates window on `activate` if none exist
- Non-macOS: `window-all-closed` → `app.quit()`

### Auto-updates

Packaged builds use `electron-updater` with GitHub Releases as the publish source. The main process enables automatic download and install-on-quit, then calls `checkForUpdatesAndNotify()`. Development builds skip the check so local `electron-vite dev` sessions do not contact the release feed.

## Dependencies

- `@electron-toolkit/utils` — `is.dev` helper
- `electron-updater` — packaged-only update checks against GitHub Releases
- [[wiki/entities/ipc-handlers]] — `registerIPCHandlers()`

## See also

- [[wiki/sources/min-10-release-automation-auto-updates]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/topics/electron-architecture]]
