---
title: 'electron-vite Build Configuration'
type: concept
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-01-scaffold]]']
tags: [electron-vite, vite, build, configuration]
lang: en
---

## Overview

The project uses `electron-vite` v2 to unify the build for all three Electron targets (main, preload, renderer) under a single config file.

## Configuration

File: `electron.vite.config.ts`

### Main process

- `externalizeDepsPlugin({ exclude: ['electron-store'] })` — bundles `electron-store` (ESM module) while externalizing other deps.

### Preload

- `externalizeDepsPlugin()` — standard externalization.

### Renderer

- `@vitejs/plugin-react` for JSX/React support.
- Path aliases: `@renderer` → `src/renderer/src`, `@shared` → `src/shared`.
- Custom root: `src/renderer/` with entry `src/renderer/index.html`.

## TypeScript Configuration

Three-file split (`tsconfig.json` → references):

| Config               | Scope                 | Key settings                                                                           |
| -------------------- | --------------------- | -------------------------------------------------------------------------------------- |
| `tsconfig.node.json` | main, preload, shared | `types: ["electron-vite/node"]`, aliases `@shared/*`, `@main/*`                        |
| `tsconfig.web.json`  | renderer              | `types: ["electron-vite/client"]`, aliases `@renderer/*`, `@shared/*`, JSX `react-jsx` |

## Scripts

| Script    | Command                                   |
| --------- | ----------------------------------------- |
| `dev`     | `electron-vite dev`                       |
| `build`   | `electron-vite build`                     |
| `preview` | `electron-vite preview`                   |
| `package` | `electron-vite build && electron-builder` |

## Packaging (electron-builder)

- App ID: `com.alpitour.bugcat`
- Product name: `BugCat`
- Output: `dist-electron/`
- Targets: NSIS (Win), DMG (macOS), AppImage (Linux)

## See also

- [[wiki/topics/electron-architecture]]
