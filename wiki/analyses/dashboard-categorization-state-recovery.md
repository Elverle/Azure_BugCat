---
title: 'Analysis: Dashboard categorization state recovery'
type: analysis
created: 2026-05-03
updated: 2026-05-03
sources:
  [
    '[[wiki/sources/ft-05-dashboard]]',
    '[[wiki/analyses/cancel-categorization-flow]]'
  ]
tags: [analysis, dashboard, ipc, cancellation, remount, error-handling]
lang: en
---

## Problem

The first cancellable-categorization implementation still had three user-facing issues during manual testing:

- the UI could look idle until the first chunk progress event arrived,
- navigating from Dashboard to Settings and back could remount the page and re-enable `Categorize` even though the main process was still working,
- blocking errors coming back from `llm:categorize` were shown as `Error invoking remote method 'llm:categorize': [object Object]` instead of a readable message.

## Root Cause

The renderer and main process disagreed about where long-running categorization state lived:

- `useDashboard()` stored categorization state inside a single component mount,
- the main process had no read-only status channel to answer whether a categorization was already active for the current `webContents`,
- `ipcMain.handle()` still threw plain objects for some categorization failures, which Electron wrapped into a generic invoke error string.

## Solution

The follow-up hardening keeps the cancellable workflow but makes the renderer resilient to remounts and error transport:

- [[wiki/entities/ipc-channels]] adds `llm:categorize-status`.
- [[wiki/entities/ipc-handlers]] now exposes a read-only status check derived from the per-window `AbortController` registry.
- [[wiki/entities/ipc-handlers]] also normalizes thrown `AppError`-like objects into real `Error` instances through `toRendererError()`, preserving `message`, `code`, and optional `details`.
- [[wiki/entities/preload-bridge]] exposes `getCategorizationStatus()`.
- [[wiki/entities/use-dashboard-hook]] moves categorization UI state into a module-scoped external store synchronized with `useSyncExternalStore()`.
- [[wiki/entities/use-dashboard-hook]] initializes from `Promise.all([getSession(), getCategorizationStatus()])`, so a remounted Dashboard can recover the active run immediately.
- [[wiki/entities/use-dashboard-hook]] sets `isCancelling` before awaiting the cancel IPC, so the UI reflects user intent even before the provider emits the next progress event.
- [[wiki/entities/dashboard-header]] now disables the cancel button and shows `Cancelling...` while the cancel request is in flight.

## Product Behavior

- Returning to Dashboard during an active categorization now shows `Cancel`, not `Categorize`.
- Cancel feedback becomes immediate because the header switches to `Cancelling...` as soon as the user clicks.
- Progress subscription is re-established when a remounted Dashboard sees that categorization is still active.
- Real categorization failures now surface their actual message in the renderer-facing modal instead of the generic `[object Object]` invoke wrapper.
- Intentional cancellation remains silent: partial results are still discarded and the previous persisted session remains untouched.

## Verification

The follow-up was validated with focused tests and a production build:

- `tests/main/ipc-handlers.spec.ts` verifies the status IPC contract, concurrent-run handling, cancellation semantics, and readable renderer errors.
- `tests/renderer/DashboardPage.spec.tsx` verifies cancel-state rendering and Dashboard remount recovery through the status check.
- `tests/renderer/useDashboard.spec.ts` verifies hook hydration, progress subscription, and error-state behavior with the shared categorization state.
- `npm run build` completed successfully after the status/error-hardening changes.

## Components Involved

- [[wiki/entities/ipc-channels]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/use-dashboard-hook]]
- [[wiki/entities/dashboard-header]]
- [[wiki/entities/dashboard-page]]
- [[wiki/topics/llm-categorization-pipeline]]
- [[wiki/topics/dashboard-bug-exploration]]

## See also

- [[wiki/analyses/cancel-categorization-flow]]
- [[wiki/topics/llm-categorization-pipeline]]
- [[wiki/topics/dashboard-bug-exploration]]