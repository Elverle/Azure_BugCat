---
title: 'Electron Architecture'
type: topic
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-01-scaffold]]']
tags: [electron, architecture, ipc, security]
lang: en
---

## Overview

The Bug Categorizer is an Electron desktop app with a strict three-process architecture: Main, Preload, and Renderer. The design prioritizes security (sandbox, context isolation) and type safety (shared IPC channel constants, typed bridge).

## Architecture Diagram

```
┌──────────────────────────────────────────────────┐
│                   Renderer                        │
│        React 18 + TypeScript + Tailwind           │
│  window.electronAPI.* (typed, whitelisted)        │
│                                                   │
│  Routes: / (Dashboard) | /settings (Settings)     │
│  Router: HashRouter (file:// compatible)          │
├──────────────────────────────────────────────────┤
│                   Preload                         │
│        contextBridge.exposeInMainWorld            │
│  ipcRenderer.invoke() → typed channels only       │
├──────────────────────────────────────────────────┤
│                    Main                           │
│        Node.js + Electron APIs                    │
│  ipcMain.handle() registered in ipc-handlers.ts   │
│  electron-store (encrypted) for persistence       │
│  app lifecycle, window management                 │
└──────────────────────────────────────────────────┘
```

## Source Structure

```
src/
├── main/
│   ├── index.ts          # App entry, window creation
│   ├── store.ts          # Encrypted electron-store
│   └── ipc-handlers.ts   # IPC handler registration
├── preload/
│   ├── index.ts          # contextBridge with typed API
│   └── index.d.ts        # Window.electronAPI declarations
├── shared/
│   ├── types.ts          # Domain types (BugItem, AppSettings, etc.)
│   └── ipc-channels.ts   # Typed IPC channel constants
└── renderer/
    ├── index.html        # HTML entry with CSP
    └── src/
        ├── main.tsx      # React entry
        ├── App.tsx       # HashRouter + routes
        ├── assets/       # CSS (Tailwind + Inter)
        ├── lib/          # Utilities (cn)
        ├── components/   # UI + layout components
        └── pages/        # Route pages
```

## Components

| Component                               | Page                     |
| --------------------------------------- | ------------------------ |
| [[wiki/entities/electron-main-process]] | Main process entry       |
| [[wiki/entities/electron-store]]        | Encrypted persistence    |
| [[wiki/entities/ipc-handlers]]          | IPC handler registration |
| [[wiki/entities/preload-bridge]]        | Context bridge           |
| [[wiki/entities/ipc-channels]]          | Channel constants        |
| [[wiki/entities/shared-types]]          | Domain model             |

## Key Concepts

| Concept                               | Page                         |
| ------------------------------------- | ---------------------------- |
| [[wiki/concepts/ipc-security-model]]  | Security layers and CSP      |
| [[wiki/concepts/electron-vite-build]] | Build pipeline and packaging |

## Data Flow

### Settings read (renderer → main → store)

1. `window.electronAPI.getSettings()` — renderer calls bridge
2. Preload: `ipcRenderer.invoke('settings:get')` — sends to main
3. Main: `store.get('settings')` — reads from encrypted store
4. Result flows back through the same chain

### Settings write (renderer → main → store)

1. `window.electronAPI.setSettings(data)` — renderer calls bridge
2. Preload: `ipcRenderer.invoke('settings:set', data)` — sends to main
3. Main: `store.set('settings', data)` — writes to encrypted store

## Future (planned)

- **FT-02**: Settings page UI
- **FT-03**: Azure DevOps integration (`ado:fetch-bugs`, `ado:test-connection`)
- **FT-04**: LLM categorization (`llm:categorize`, `llm:test-connection`, progress events)
- **FT-05**: Dashboard page with bug triage UI

## See also

- [[wiki/topics/renderer-ui]]
