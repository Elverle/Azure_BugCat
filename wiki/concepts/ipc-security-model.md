---
title: 'IPC Security Model'
type: concept
created: 2026-04-29
updated: 2026-08-20
sources: ['[[wiki/sources/ft-01-scaffold]]', '[[wiki/sources/ft-10-ai-cluster-similarity]]']
tags: [electron, security, ipc, architecture]
lang: en
---

## Overview

The app follows Electron security best practices with a strict process isolation model.

## Layers

```
┌─────────────────────────────────────────┐
│ Renderer (React)                        │  No Node.js access
│   window.electronAPI.getSettings()      │
├─────────────────────────────────────────┤
│ Preload (contextBridge)                 │  Whitelisted methods only
│   ipcRenderer.invoke('settings:get')    │
├─────────────────────────────────────────┤
│ Main (Node.js)                          │  Full access
│   ipcMain.handle('settings:get', ...)   │
└─────────────────────────────────────────┘
```

## Security Settings

| Setting            | Value   | Purpose                             |
| ------------------ | ------- | ----------------------------------- |
| `nodeIntegration`  | `false` | Renderer cannot access Node.js APIs |
| `contextIsolation` | `true`  | Preload runs in isolated context    |
| `sandbox`          | `true`  | OS-level process sandboxing         |

## Whitelisted Channels

Only these IPC channels are exposed (no generic store access). The source of truth is `src/shared/ipc-channels.ts`; this list mirrors all 22 of its constants:

- `ping`
- `settings:get`, `settings:set`
- `ado:fetch-bugs`, `ado:test-connection`, `ado:fetch-attachment-data-url`
- `llm:categorize`, `llm:categorize-cancel`, `llm:categorize-status`, `llm:categorize-progress`, `llm:categorize-done`, `llm:test-connection`
- `llm:find-similar`, `llm:find-similar-cancel`, `llm:find-similar-status`, `llm:find-similar-progress`, `llm:find-similar-done`
- `session:get`, `session:clear`
- `catalog:clear`, `catalog:get-closed`
- `shell:open-external`

## External Navigation

`shell.openExternal` is restricted to `https:` protocol only. Invalid URLs and non-HTTPS schemes are rejected in the main process before the browser can be opened.

## CSP (Content Security Policy)

Applied via `<meta>` tag in `index.html`:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:;
```

## Payload Validation

`settings:set` takes its payload as `unknown` and validates it before persisting: `assertValidSettings()` (`src/shared/validation.ts`) runs on every call, and a malformed or out-of-range payload is rejected instead of written. The renderer validates the same fields for its own UX, but the main process is the trust boundary — the renderer's checks are a convenience, not the guarantee.

`pat` and `apiKey` never cross the bridge in plaintext in either direction: see [[wiki/entities/secret-storage]] for the sentinel exchange.

## Known Gaps

- `style-src 'unsafe-inline'` is needed for Tailwind but weakens CSP.

## See also

- [[wiki/entities/electron-main-process]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/topics/electron-architecture]]
