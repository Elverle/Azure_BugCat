---
title: 'Dashboard Header'
type: entity
subtype: component
created: 2026-04-30
updated: 2026-05-01
sources: ['[[wiki/sources/ft-05-dashboard]]', '[[wiki/sources/ft-07-session-persistence]]']
tags: [react, component, dashboard, actions]
lang: en
---

## Description

Header strip for the dashboard. Displays the page title, session freshness timestamps, and the primary `Fetch Bugs` / `Categorize` actions.

## Location

`src/renderer/src/components/dashboard/DashboardHeader.tsx`

## Props

```typescript
interface DashboardHeaderProps {
  onFetch: () => void
  onCategorize: () => void
  loading: boolean
  sessionInfo: { fetchedAt: string | null; categorizedAt: string | null }
  progress: ChunkProgress | null
}
```

## Behavior

- Formats session timestamps through [[wiki/entities/date-format-utility]] instead of inlining locale logic inside the component.
- Shows `Dati aggiornati il ...` plus an optional `Categorizzati il ...` suffix when session metadata exists.
- Shows `Nessun dato caricato` when no session exists yet.
- `Fetch Bugs` shows a spinner while any dashboard action is loading.
- `Categorize` swaps its label to `Categorizing X/Y` while `ChunkProgress` updates arrive.
- Both actions are disabled while loading to avoid concurrent IPC requests.

## Dependencies

- [[wiki/entities/use-dashboard-hook]]
- [[wiki/entities/shared-types]] — `ChunkProgress`
- [[wiki/entities/date-format-utility]] — timestamp formatting

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/topics/dashboard-bug-exploration]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/llm-categorization-pipeline]]
