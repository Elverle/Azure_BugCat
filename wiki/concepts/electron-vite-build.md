---
title: 'electron-vite Build Configuration'
type: concept
created: 2026-04-29
updated: 2026-08-18
sources: ['[[wiki/sources/ft-01-scaffold]]', '[[wiki/sources/ft-11-openrouter-provider]]']
tags: [electron-vite, vite, build, configuration]
lang: en
---

## Overview

The project uses `electron-vite` with a single `defineConfig()` file to coordinate the three Electron targets (main, preload, renderer). The current configuration is intentionally small and only overrides the places where runtime packaging or renderer resolution needs project-specific behavior.

## Configuration

File: `electron.vite.config.ts`

### Main process

- Uses `build.externalizeDeps.exclude` to bundle ESM/runtime-sensitive dependencies that should not remain external at runtime.
- Current exclude list: `electron-store`.
- FT-11 originally added `@openrouter/sdk` to this list, because the SDK-backed OpenRouter provider ran in the Electron main process and depended on the SDK being packaged consistently with the app bundle. That entry was removed on 2026-08-11 when `@openrouter/sdk` was dropped from `package.json` entirely — see [[wiki/entities/openrouter-provider]].

### Preload

- No custom overrides right now; the preload target inherits electron-vite defaults.

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

- App ID: `com.gversino.bugcat`
- Product name: `BugCat`
- Output: `dist-electron/`
- Targets: NSIS (Win), DMG (macOS), AppImage (Linux)

## See also

- [[wiki/topics/electron-architecture]]
- [[wiki/entities/openrouter-provider]]
