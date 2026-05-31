---
title: 'electron-vite Build Configuration'
type: concept
created: 2026-04-29
updated: 2026-05-31
sources:
  [
    '[[wiki/sources/ft-01-scaffold]]',
    '[[wiki/sources/ft-11-openrouter-provider]]',
    '[[wiki/sources/min-10-release-automation-auto-updates]]'
  ]
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
- Publish provider: GitHub Releases through `build.publish.provider = "github"`
- Windows target: NSIS for x64 and arm64
- macOS targets: DMG and ZIP for x64 and arm64
- Linux targets: AppImage and DEB for x64 and arm64
- On Windows, a successful NSIS build produces a setup `.exe` in `dist-electron/`, while `dist-electron/win-unpacked/` is only the portable unpacked app directory.
- GitHub publishing also uploads the electron-updater metadata needed by packaged clients to discover updates from GitHub Releases.
- If the Windows packaging flow stops after `win-unpacked/` and logs `Cannot create symbolic link` while extracting `winCodeSign`, the shell lacks symlink privileges; rerun from an elevated terminal or enable Windows Developer Mode before packaging again.

### Release workflow

`.github/workflows/release.yml` runs when a pushed tag matches `v*`. The workflow builds on `windows-latest`, `macos-latest`, and `ubuntu-latest`, installs dependencies with `npm ci`, then executes `npm run package -- --publish always` with `GH_TOKEN` sourced from `secrets.GITHUB_TOKEN`. The job has `contents: write` permission so electron-builder can create or update the matching GitHub Release.

### Auto-update metadata

The main process depends on `electron-updater` and calls `checkForUpdatesAndNotify()` only in packaged builds. `autoDownload` and `autoInstallOnAppQuit` are enabled, so update checks use the GitHub provider metadata published by electron-builder and defer installation until app quit.

### Icon-path finding

No `icon` path is configured under the top-level build block or platform-specific `win`, `mac`, or `linux` blocks in `package.json`. That means there are no broken icon asset paths in the current electron-builder config; packaged apps will use Electron's default icons until explicit platform icon assets are added.

## See also

- [[wiki/sources/min-10-release-automation-auto-updates]]
- [[wiki/topics/electron-architecture]]
- [[wiki/entities/openrouter-provider]]
