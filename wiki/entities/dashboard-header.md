---
title: 'Dashboard Header'
type: entity
subtype: component
created: 2026-04-30
updated: 2026-05-13
sources:
  [
    '[[wiki/sources/ft-05-dashboard]]',
    '[[wiki/sources/ft-12-incremental-session-cache]]',
    '[[wiki/sources/ft-07-session-persistence]]',
    '[[wiki/analyses/cancel-categorization-flow]]',
    '[[wiki/analyses/dashboard-categorization-state-recovery]]'
  ]
tags: [react, component, dashboard, actions]
lang: en
---

## Description

Header strip for the dashboard. Displays the page title, session freshness timestamps, a small fetch summary for newly discovered bugs, and the primary `Fetch Bugs` / `Categorize` actions.

## Location

`src/renderer/src/components/dashboard/DashboardHeader.tsx`

## Props

```typescript
interface DashboardHeaderProps {
  onFetch: () => void
  onCategorize: () => void
  onCancelCategorize: () => void
  loading: boolean
  isCategorizing: boolean
  isCancelling: boolean
  sessionInfo: {
    fetchedAt: string | null
    categorizedAt: string | null
    lastFetchNewCount: number | null
  }
  progress: ChunkProgress | null
}
```

## Behavior

- Formats session timestamps through [[wiki/entities/date-format-utility]] instead of inlining locale logic inside the component.
- Shows `Dati aggiornati il ...` plus an optional `Categorizzati il ...` suffix when session metadata exists.
- Shows `Nuovi rispetto allo storico: N` under the `Fetch Bugs` button after a fetch completes, using the scalar summary persisted in `SessionData.lastFetchNewCount`.
- Shows `Nessun dato caricato` when no session exists yet.
- `Fetch Bugs` shows a spinner while hydration or fetch is loading, and is also disabled while categorization is active.
- While `isCategorizing` is `true`, the primary action swaps from `Categorize` to a red `Cancel` button.
- While `isCancelling` is `true`, the cancel button is disabled and changes label to `Cancelling...` with a spinner, so the user gets feedback before the next chunk update arrives.
- The cancel button reflects progress as `Cancel (X/Y)` when chunk updates are available.
- The normal `Categorize` action reappears as soon as categorization finishes or is cancelled.

## Dependencies

- [[wiki/entities/use-dashboard-hook]]
- [[wiki/entities/shared-types]] — `ChunkProgress`
- [[wiki/entities/date-format-utility]] — timestamp formatting

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/topics/dashboard-bug-exploration]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/llm-categorization-pipeline]]
