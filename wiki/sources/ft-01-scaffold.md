---
title: 'FT-01 — Scaffold Electron + Infrastruttura Base'
type: source
created: 2026-04-29
updated: 2026-04-29
sources: []
tags: [electron, react, typescript, tailwind, scaffold, feature-1]
lang: en
---

## Summary

Initial scaffolding of the Bug Categorizer Desktop app. Sets up the full electron-vite build pipeline with React 18, TypeScript, Tailwind CSS + Inter font, and shadcn/ui (manual install). Establishes the IPC security architecture (Main ↔ Preload ↔ Renderer), encrypted electron-store with machine-id, HashRouter routing, and a topbar matching `design.html`.

## Files Created

| Area         | File                                               | Purpose                                                   |
| ------------ | -------------------------------------------------- | --------------------------------------------------------- |
| **Config**   | `package.json`                                     | Dependencies, scripts, electron-builder config            |
| **Config**   | `electron.vite.config.ts`                          | electron-vite build: main, preload, renderer              |
| **Config**   | `tsconfig.json` / `.node.json` / `.web.json`       | Split TypeScript configs (node vs browser)                |
| **Config**   | `tailwind.config.js`, `postcss.config.js`          | Tailwind CSS with Inter font                              |
| **Config**   | `.eslintrc.cjs`, `.prettierrc.json`                | Linting and formatting                                    |
| **Main**     | `src/main/index.ts`                                | Electron main process — window creation                   |
| **Main**     | `src/main/store.ts`                                | Encrypted electron-store                                  |
| **Main**     | `src/main/ipc-handlers.ts`                         | IPC handler registration                                  |
| **Preload**  | `src/preload/index.ts`                             | contextBridge with typed API                              |
| **Preload**  | `src/preload/index.d.ts`                           | TypeScript declarations for Window.electronAPI            |
| **Shared**   | `src/shared/types.ts`                              | Domain types (BugItem, CategorizedBug, AppSettings, etc.) |
| **Shared**   | `src/shared/ipc-channels.ts`                       | Typed IPC channel constants                               |
| **Renderer** | `src/renderer/index.html`                          | HTML entry with CSP meta tag                              |
| **Renderer** | `src/renderer/src/main.tsx`                        | React entry point                                         |
| **Renderer** | `src/renderer/src/App.tsx`                         | HashRouter with routes                                    |
| **Renderer** | `src/renderer/src/assets/index.css`                | Tailwind + Inter imports                                  |
| **Renderer** | `src/renderer/src/lib/utils.ts`                    | `cn()` utility (clsx + tailwind-merge)                    |
| **Renderer** | `src/renderer/src/components/ui/button.tsx`        | shadcn Button component                                   |
| **Renderer** | `src/renderer/src/components/layout/Topbar.tsx`    | Navigation topbar                                         |
| **Renderer** | `src/renderer/src/components/layout/AppLayout.tsx` | Shell layout with Outlet                                  |
| **Renderer** | `src/renderer/src/pages/DashboardPage.tsx`         | Dashboard placeholder                                     |
| **Renderer** | `src/renderer/src/pages/SettingsPage.tsx`          | Settings placeholder                                      |

## Key Decisions

- **electron-vite** chosen over raw Vite for unified main/preload/renderer builds.
- **sandbox: true** enabled for maximum process isolation.
- **No generic store IPC** — only whitelisted settings/session channels exposed.
- **Encryption fallback** uses random key persisted to `userData/.bugcat-key` (not a hardcoded string).
- **HashRouter** for Electron `file://` compatibility.
- **shadcn/ui manual install** — no CLI; Button component hand-created with `class-variance-authority`.

## Technical Debt

- No test framework configured yet.
- ESLint 9 with legacy `.eslintrc.cjs` format — should migrate to flat config.
- No runtime validation on IPC payloads (settings are typed but not validated at runtime).

## See also

- [[wiki/entities/electron-main-process]]
- [[wiki/entities/electron-store]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/topbar]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/concepts/electron-vite-build]]
- [[wiki/topics/electron-architecture]]
