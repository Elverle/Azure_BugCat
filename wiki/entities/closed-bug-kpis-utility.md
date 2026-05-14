---
title: 'Closed Bug KPIs Utility'
type: entity
subtype: library
created: 2026-05-13
updated: 2026-05-13
sources: ['[[wiki/sources/ft-13-closed-bugs-history]]']
tags: [typescript, utility, kpi, catalog, renderer]
lang: en
---

## Description

Pure renderer utility module that computes FT-13 KPI aggregates from a list of closed `CatalogBug` entries, the latest fetch timestamp, and the persisted history-cleanup baseline.

## Location

`src/renderer/src/lib/closed-bug-kpis.ts`

## Public API

```typescript
export interface ClosedBugKpiData {
  totalClosed: number
  recentlyClosedCount: number
  categoryDistribution: ClosedBugCategoryBreakdown[]
  similarityGroupCount: number
  similarityGroupPercentage: number
  lastUpdateAt: string | null
  lastClearedAt: string | null
}

export function computeClosedBugKpis(
  closedBugs: CatalogBug[],
  fetchedAt: string | null,
  lastClearedAt: string | null
): ClosedBugKpiData
```

## Aggregation Rules

- `totalClosed` is `closedBugs.length`.
- `lastClearedAt` passes through the persisted history cleanup timestamp so the UI can explain the current counting baseline.
- `recentlyClosedCount` counts only bugs whose `closedAt` exactly matches `fetchedAt`.
- `categoryDistribution` groups by `macroCategory`, falls back to `Non categorizzato`, sorts descending by count, and keeps per-category bug rows with `id`, `title`, `closedAt`, and similarity-history flags.
- `similarityGroupCount` counts bugs with `everInSimilarityGroup === true`.
- `similarityGroupPercentage` is a rounded integer percentage over `totalClosed`, with a zero-safe fallback.
- `lastUpdateAt` passes through `fetchedAt` unchanged.

## Why It Matters

- Keeps the KPI contract testable without rendering React.
- Separates historical analytics semantics from page-state management.
- Preserves the project convention that renderer libraries under `src/renderer/src/lib` stay pure and reusable.

## Validation Surface

- `tests/renderer/closed-bug-kpis.spec.ts` covers empty input, exact recent-closure matching, distribution sorting, uncategorized fallback, similarity metrics, and timestamp passthrough.

## See also

- [[wiki/entities/use-closed-bug-kpis-hook]]
- [[wiki/entities/closed-bugs-page]]
- [[wiki/topics/closed-bug-history-analytics]]
