---
title: 'KPI Cards'
type: entity
subtype: component
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-05-dashboard]]']
tags: [react, component, dashboard, kpi]
lang: en
---

## Description

Four-card KPI strip summarizing the current filtered bug set: total bugs, active bugs, distinct macro-categories, and top assignees.

## Location

`src/renderer/src/components/dashboard/KpiCards.tsx`

## Props

```typescript
interface KpiCardsProps {
  kpis: KpiData
}
```

## Behavior

- Receives already-derived metrics from [[wiki/entities/dashboard-utils]]; does not compute counts itself.
- Uses color emphasis to separate totals (`gray-900`), active bugs (`red-600`), and cluster count (`purple-600`).
- Shows up to three assignees ordered by bug count.
- Falls back to `Nessun assegnatario` when no non-null assignees exist in the current slice.

## Dependencies

- [[wiki/entities/dashboard-utils]] — `KpiData`

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/concepts/dashboard-derivation-pipeline]]
