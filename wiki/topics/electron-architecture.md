---
title: 'Electron Architecture'
type: topic
created: 2026-04-29
updated: 2026-05-01
sources:
  [
    '[[wiki/sources/ft-01-scaffold]]',
    '[[wiki/sources/ft-07-session-persistence]]',
    '[[wiki/sources/ft-10-ai-cluster-similarity]]'
  ]
tags: [electron, architecture, ipc, security, session]
lang: en
---

## Overview

Azure BugCat is an Electron desktop app with a strict three-process architecture: Main, Preload, and Renderer. The design prioritizes security (sandbox, context isolation), type safety (shared IPC channel constants, typed bridge), and explicit persistence bootstrapping through store migration before app services come online.

## Architecture Diagram

```text
┌──────────────────────────────────────────────────┐
│                   Renderer                       │
│        React 18 + TypeScript + Tailwind         │
│  window.electronAPI.* (typed, whitelisted)      │
│                                                  │
│  Routes: / | /settings                         │
│  Router: HashRouter (file:// compatible)        │
├──────────────────────────────────────────────────┤
│                   Preload                        │
│        contextBridge.exposeInMainWorld          │
│  ipcRenderer.invoke/on -> typed channels only   │
├──────────────────────────────────────────────────┤
│                    Main                          │
│        Node.js + Electron APIs                   │
│  migrateStore(store)                             │
│    -> ipcMain.handle() registration              │
│    -> window creation                            │
│  electron-store (encrypted) for persistence      │
└──────────────────────────────────────────────────┘
```

## Source Structure

```text
src/
├── main/
│   ├── index.ts            # App entry, migration bootstrap, window creation
│   ├── store.ts            # Encrypted electron-store
│   ├── store-migration.ts  # Schema-versioned migration pipeline
│   ├── ipc-handlers.ts     # IPC handler registration
│   ├── ado/                # Azure DevOps integration
│   └── llm/                # Categorization + similarity services and providers
├── preload/
│   ├── index.ts            # contextBridge with typed API
│   └── index.d.ts          # Window.electronAPI declarations
├── shared/
│   ├── types.ts            # Domain/session types
│   └── ipc-channels.ts     # Typed IPC channel constants
└── renderer/
        ├── index.html          # HTML entry with CSP
        └── src/
                ├── App.tsx         # HashRouter + route registration
                ├── pages/          # Dashboard, Settings
                ├── hooks/          # Session/action hooks
                └── components/     # Layout, dashboard, AI Cluster, settings UI
```

## Process Roles

| Process       | Responsibility                                                               |
| ------------- | ---------------------------------------------------------------------------- |
| Renderer      | SPA routing, user interactions, progress UI, drawer drill-down               |
| Preload       | Typed, minimal bridge for invoke and progress subscriptions                  |
| Main          | Store access, Azure DevOps calls, LLM provider orchestration, URL validation |
| Shared module | Channel constants and DTOs crossing process boundaries                       |

## Key Flows

### App bootstrap

1. `app.whenReady()` resolves.
2. Main process runs `migrateStore(store)`.
3. IPC handlers are registered only after the store is at the current schema.
4. The browser window is created and loads the renderer.

### Categorization flow

1. Renderer invokes `llm:categorize` through the preload bridge.
2. Main loads session bugs and settings from the encrypted store.
3. `categorizeBugs()` runs in the main process and streams chunk progress.
4. Main persists updated categorized session data.

### Similarity flow

1. Renderer invokes `llm:find-similar` from the dashboard `Similarità` tab.
2. Main validates that the session has already been categorized.
3. `findSimilarBugs()` groups bugs by `macroCategory`, calls the LLM per category, and streams progress.
4. Main persists `session.similarityResults` for later hydration.

## Feature Milestones

- **FT-02**: Settings page UI and persistence workflow
- **FT-03**: Azure DevOps integration (`ado:fetch-bugs`, `ado:test-connection`)
- **FT-04**: LLM categorization (`llm:categorize`, `llm:test-connection`, progress events)
- **FT-07**: Schema-versioned store migration and guarded session reset UX
- **FT-10**: AI Cluster similarity analysis integrated into dashboard (`llm:find-similar`, similarity progress events, session-persisted results)

## See also

- [[wiki/topics/renderer-ui]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
