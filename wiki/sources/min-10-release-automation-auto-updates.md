---
title: 'min-10 - Release Automation and Auto-Updates'
type: source
created: 2026-05-31
updated: 2026-05-31
sources: []
tags: [minor, release, electron-builder, electron-updater, github-actions]
lang: en
---

## Summary

min-10 documents the release pipeline implementation that moves BugCat from local Windows/macOS packaging notes to multi-platform GitHub Releases distribution. The app now has electron-builder GitHub publishing metadata, a tag-triggered GitHub Actions release workflow, and a packaged-only auto-update check through `electron-updater`.

## Improvement Scope

- **ID:** min-10
- **Parent area:** FT-01 build/distribution foundation
- **Primary workflow:** publish installers and update metadata from pushed `v*` tags
- **Runtime behavior:** packaged clients check GitHub Releases for updates on startup
- **Documentation focus:** README, build concept page, main-process entity page, wiki index/log, and feature tracker

## Implementation Files Reviewed

| File                            | Purpose                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `package.json`                  | Adds production `electron-updater`, GitHub publish provider, and Windows/macOS/Linux x64+arm64 package targets  |
| `src/main/index.ts`             | Imports `autoUpdater`, enables auto-download/install-on-quit, and checks for updates only when `app.isPackaged` |
| `.github/workflows/release.yml` | Builds on Windows, macOS, and Ubuntu when a pushed tag matches `v*`, then publishes with `--publish always`     |

## Package Targets

| Platform | Targets       | Architectures |
| -------- | ------------- | ------------- |
| Windows  | NSIS          | x64, arm64    |
| macOS    | DMG, ZIP      | x64, arm64    |
| Linux    | AppImage, DEB | x64, arm64    |

## Release Flow

Pushing a version tag such as `v1.0.1` starts the release workflow. Each OS runner installs dependencies with `npm ci` and runs `npm run package -- --publish always`; `GH_TOKEN` comes from `secrets.GITHUB_TOKEN`, and `contents: write` lets electron-builder publish artifacts and updater metadata to the matching GitHub Release.

## Auto-Update Behavior

`checkForUpdates()` is called during Electron startup after IPC registration and window creation. The function exits in development, while packaged builds call `checkForUpdatesAndNotify()` against the GitHub provider feed. `autoDownload` and `autoInstallOnAppQuit` are enabled, so available updates download automatically and install when the app quits.

## Icon Configuration Finding

No `icon` path is configured in the electron-builder `build`, `win`, `mac`, or `linux` blocks. The current config therefore has no broken icon asset paths, but packaged apps use Electron's default icons until explicit platform-specific assets are added.

## See also

- [[wiki/concepts/electron-vite-build]]
- [[wiki/entities/electron-main-process]]
- [[wiki/topics/electron-architecture]]
