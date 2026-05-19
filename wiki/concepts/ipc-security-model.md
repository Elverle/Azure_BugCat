---
title: 'IPC Security Model'
type: concept
created: 2026-04-29
updated: 2026-05-18
sources:
	[
		'[[wiki/sources/ft-01-scaffold]]',
		'[[wiki/sources/ft-10-ai-cluster-similarity]]',
		'[[wiki/sources/ft-14b-agent-sessions]]'
	]
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
- `agent:check-binary`, `agent:select-directory`
- `agent:start`, `agent:abort`, `agent:get-session`
- `agent:chunk`, `agent:completed`, `agent:error`
- `projects:get`, `projects:set`, `projects:validate-paths`

## External Navigation

`shell.openExternal` is restricted to `https:` protocol only. Invalid URLs and non-HTTPS schemes are rejected in the main process before the browser can be opened.

## Agent Session Boundary

- FT-14B agent execution stays entirely in the main process; the renderer only sees the whitelisted preload surface.
- Claude is explicitly restricted to read-only `Read`, `Glob`, and `Grep` tools.
- Codex is launched in `read-only` sandbox mode.
- FT-14B rejects `fix` mode in IPC, so the first release cannot ask agents to mutate code through the app workflow.

## CSP (Content Security Policy)

Applied via `<meta>` tag in `index.html`:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:;
```

## Known Gaps

- `settings:set` accepts `unknown` — no runtime validation (e.g., Zod schema).
- `style-src 'unsafe-inline'` is needed for Tailwind but weakens CSP.
- Copilot permission handling is still permissive in FT-14B (`approveAll`) and needs follow-up hardening.

## See also

- [[wiki/entities/electron-main-process]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/concepts/read-only-agent-analysis-sandboxing]]
- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/electron-architecture]]
