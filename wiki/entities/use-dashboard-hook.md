---
title: 'useDashboard Hook'
type: entity
subtype: hook
created: 2026-04-30
updated: 2026-05-13
sources:
  [
    '[[wiki/sources/ft-05-dashboard]]',
    '[[wiki/sources/ft-12-incremental-session-cache]]',
    '[[wiki/sources/ft-11-openrouter-provider]]',
    '[[wiki/analyses/cancel-categorization-flow]]',
    '[[wiki/analyses/dashboard-categorization-state-recovery]]'
  ]
tags: [react, hook, dashboard, ipc, state-management]
lang: en
---

## Description

Central state management hook for the dashboard page. Owns session hydration, long-running action state, categorization progress subscription, and session metadata exposure.

## Location

`src/renderer/src/hooks/useDashboard.ts`

## Public API

```typescript
export interface UseDashboardReturn {
  bugs: CategorizedBug[]
  loading: boolean
  isCategorizing: boolean
  isCancelling: boolean
  progress: ChunkProgress | null
  categorizeError: string | null
  sessionInfo: {
    fetchedAt: string | null
    categorizedAt: string | null
    lastFetchNewCount: number | null
  }
  fetchBugs: () => Promise<void>
  categorizeBugs: () => Promise<void>
  cancelCategorization: () => Promise<void>
  clearCategorizeError: () => void
}
```

## Key Behaviors

- Calls `window.electronAPI.getSession()` on mount and hydrates `bugs`, `fetchedAt`, `categorizedAt`, and `lastFetchNewCount` from `SessionData`.
- Reads `getSession()` and `getCategorizationStatus()` together on mount so a remounted Dashboard can recover an active categorization started before the route change.
- Exposes a shared `loadSession()` callback so both fetch and categorize flows refresh the same source of truth after IPC completes.
- Keeps the renderer decoupled from `bugCatalog` by exposing only the derived `lastFetchNewCount` summary needed by the header.
- Keeps `loading` focused on hydration/fetch flows and exposes a separate `isCategorizing` state so the UI can present cancel-specific affordances.
- Stores categorization UI state in a module-scoped external store synchronized through `useSyncExternalStore()`, so route remounts do not reset the renderer's in-progress affordances.
- Subscribes to `window.electronAPI.onCategorizeProgress()` only during categorization and clears the listener on success, failure, or unmount.
- Re-subscribes to progress updates after remount when the main-process status check says categorization is still active.
- Resets `progress` to `null` before and after categorization so stale chunk state never lingers in the UI.
- Captures IPC categorization failures into `categorizeError` instead of swallowing them in the component tree.
- Normalizes renderer-facing error text by reading the real `Error.message` when the main process forwards a structured failure across IPC.
- Treats `OPERATION_CANCELLED` as a silent user action: the hook clears progress and exits without opening the blocking error modal.
- Exposes `cancelCategorization()` through the preload bridge so the header can abort a running categorization.
- Exposes `isCancelling` and flips it before awaiting the cancel IPC, providing immediate UI feedback even before the next progress event or provider abort completes.
- Exposes `clearCategorizeError()` so the page can dismiss a modal or inline error banner declaratively.
- Handles a null session by clearing bugs and timestamps instead of leaving stale state behind.

## Dependencies

- [[wiki/entities/preload-bridge]] — `getSession`, `getCategorizationStatus`, `fetchBugs`, `categorizeBugs`, `cancelCategorization`, `onCategorizeProgress`
- [[wiki/entities/shared-types]] — `CategorizedBug`, `SessionData`, `ChunkProgress`

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/entities/dashboard-header]]
- [[wiki/topics/dashboard-bug-exploration]]
