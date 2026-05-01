---
title: 'IPC Security Model'
type: concept
created: 2026-04-29
updated: 2026-05-01
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

Only these IPC channels are exposed (no generic store access):

- `ping`, `settings:get`, `settings:set`
- `ado:fetch-bugs`, `ado:test-connection`
- `llm:categorize`, `llm:categorize-progress`, `llm:test-connection`
- `llm:find-similar`, `llm:find-similar-progress`
- `session:get`, `session:clear`
- `shell:open-external`

## External Navigation

`shell.openExternal` is restricted to `https:` protocol only. Invalid URLs and non-HTTPS schemes are rejected in the main process before the browser can be opened.

## CSP (Content Security Policy)

Applied via `<meta>` tag in `index.html`:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:;
```

## Known Gaps

- `settings:set` accepts `unknown` — no runtime validation (e.g., Zod schema).
- `style-src 'unsafe-inline'` is needed for Tailwind but weakens CSP.

## See also

- [[wiki/entities/electron-main-process]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/topics/electron-architecture]]
