---
title: 'useDashboard Hook'
type: entity
subtype: hook
created: 2026-04-30
updated: 2026-05-03
sources: ['[[wiki/sources/ft-05-dashboard]]', '[[wiki/sources/ft-11-openrouter-provider]]']
tags: [react, hook, dashboard, ipc, state-management]
lang: en
---

## Description

Central state management hook for the dashboard page. Owns session hydration, long-running action state, categorization progress subscription, and session timestamp exposure.

## Location

`src/renderer/src/hooks/useDashboard.ts`

## Public API

```typescript
export interface UseDashboardReturn {
  bugs: CategorizedBug[]
  loading: boolean
  progress: ChunkProgress | null
  categorizeError: string | null
  sessionInfo: { fetchedAt: string | null; categorizedAt: string | null }
  fetchBugs: () => Promise<void>
  categorizeBugs: () => Promise<void>
  clearCategorizeError: () => void
}
```

## Key Behaviors

- Calls `window.electronAPI.getSession()` on mount and hydrates `bugs`, `fetchedAt`, and `categorizedAt` from `SessionData`.
- Exposes a shared `loadSession()` callback so both fetch and categorize flows refresh the same source of truth after IPC completes.
- Subscribes to `window.electronAPI.onCategorizeProgress()` only during categorization and clears the listener on success, failure, or unmount.
- Resets `progress` to `null` before and after categorization so stale chunk state never lingers in the UI.
- Captures IPC categorization failures into `categorizeError` instead of swallowing them in the component tree.
- Exposes `clearCategorizeError()` so the page can dismiss a modal or inline error banner declaratively.
- Handles a null session by clearing bugs and timestamps instead of leaving stale state behind.

## Dependencies

- [[wiki/entities/preload-bridge]] — `getSession`, `fetchBugs`, `categorizeBugs`, `onCategorizeProgress`
- [[wiki/entities/shared-types]] — `CategorizedBug`, `SessionData`, `ChunkProgress`

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/entities/dashboard-header]]
- [[wiki/topics/dashboard-bug-exploration]]
