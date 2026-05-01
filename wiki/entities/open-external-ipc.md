---
title: 'Open External IPC'
type: entity
subtype: api-endpoint
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-06-bug-detail-drawer]]']
tags: [electron, ipc, shell, security, azure-devops]
lang: en
---

## Description

Dedicated IPC contract for opening Azure DevOps work item URLs in the user's default system browser. It centralizes shell access in the main process and keeps the renderer inside the existing contextBridge security boundary.

## Location

- `src/shared/ipc-channels.ts`
- `src/preload/index.ts`
- `src/main/ipc-handlers.ts`

## Contract

| Surface      | Value                                                                        |
| ------------ | ---------------------------------------------------------------------------- |
| Channel      | `shell:open-external`                                                        |
| Renderer API | `window.electronAPI.openExternal(url: string)`                               |
| Main handler | `ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL, async (_event, url) => { ... })` |
| Side effect  | `shell.openExternal(url)`                                                    |

## Validation Rules

- Rejects non-string payloads before attempting any shell operation.
- Parses the URL with the platform `URL` constructor and fails fast on malformed input.
- Accepts only the `https:` protocol.
- Returns a promise to the renderer, allowing callers to handle rejections without exposing direct shell access.

## Why It Exists

- The dashboard drawer needs a "View in Azure DevOps" action, but Electron best practices forbid renderer code from invoking browser APIs directly.
- The contract is intentionally narrow: one action, one validated URL argument, one system-level side effect.

## See also

- [[wiki/entities/ipc-channels]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/topics/dashboard-bug-exploration]]
