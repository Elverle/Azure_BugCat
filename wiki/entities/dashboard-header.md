---
title: 'Dashboard Header'
type: entity
subtype: component
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-05-dashboard]]']
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

- Formats timestamps with `toLocaleString('it-IT')` for the dashboard subtitle.
- Shows `Nessun dato caricato` when no session exists yet.
- `Fetch Bugs` shows a spinner while any dashboard action is loading.
- `Categorize` swaps its label to `Categorizing X/Y` while `ChunkProgress` updates arrive.
- Both actions are disabled while loading to avoid concurrent IPC requests.

## Dependencies

- [[wiki/entities/use-dashboard-hook]]
- [[wiki/entities/shared-types]] — `ChunkProgress`

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/topics/dashboard-bug-exploration]]
- [[wiki/topics/llm-categorization-pipeline]]
