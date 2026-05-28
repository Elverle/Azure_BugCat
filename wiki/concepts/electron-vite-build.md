---
title: 'electron-vite Build Configuration'
type: concept
created: 2026-04-29
updated: 2026-05-02
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
- Current exclude list: `electron-store`, `@openrouter/sdk`.
- This FT-11 change is required because the OpenRouter provider runs in the Electron main process and depends on the SDK being packaged consistently with the app bundle.

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
- On Windows, a successful NSIS build produces a setup `.exe` in `dist-electron/`, while `dist-electron/win-unpacked/` is only the portable unpacked app directory.
- If the Windows packaging flow stops after `win-unpacked/` and logs `Cannot create symbolic link` while extracting `winCodeSign`, the shell lacks symlink privileges; rerun from an elevated terminal or enable Windows Developer Mode before packaging again.

## See also

- [[wiki/topics/electron-architecture]]
- [[wiki/entities/openrouter-provider]]
