---
title: 'useClosedBugKpis Hook'
type: entity
subtype: hook
created: 2026-05-13
updated: 2026-05-13
sources: ['[[wiki/sources/ft-13-closed-bugs-history]]']
tags: [react, hook, catalog, ipc, state-management]
lang: en
---

## Description

Renderer hook that loads the closed-only historical catalog slice and exposes derived KPI state to [[wiki/entities/closed-bugs-page]].

## Location

`src/renderer/src/hooks/useClosedBugKpis.ts`

## Public API

```typescript
export interface UseClosedBugKpisReturn {
  kpis: ClosedBugKpiData | null
  loading: boolean
  error: string | null
}
```

## Key Behaviors

- Calls `window.electronAPI.getCatalogClosed()` on mount.
- Casts the IPC payload to `ClosedCatalogSnapshot`, preserving `closedBugs`, `fetchedAt`, and the persisted `lastClearedAt` cleanup baseline.
- Starts in `loading = true`, then flips to `false` in a `finally` block so success and failure paths converge.
- Captures readable error text from `Error.message`, falling back to a generic historical-load message.
- Uses a local `cancelled` guard to avoid state updates after unmount.

## Dependencies

- [[wiki/entities/preload-bridge]] — `getCatalogClosed()`
- [[wiki/entities/closed-bug-kpis-utility]] — `computeClosedBugKpis()`
- [[wiki/entities/shared-types]] — `ClosedCatalogSnapshot`

## See also

- [[wiki/entities/closed-bugs-page]]
- [[wiki/topics/closed-bug-history-analytics]]
