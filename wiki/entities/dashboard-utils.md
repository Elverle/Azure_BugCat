---
title: 'Dashboard Utilities'
type: entity
subtype: library
created: 2026-04-30
updated: 2026-08-19
sources: ['[[wiki/sources/ft-05-dashboard]]']
tags: [typescript, library, dashboard, pure-functions]
lang: en
---

## Description

Pure utility module that centralizes dashboard derivation logic. Keeps filtering, sorting, grouping, KPI aggregation, and filter-option extraction outside React components so behavior is deterministic and easy to unit test.

## Location

`src/renderer/src/lib/dashboard-utils.ts`

## Public API

```typescript
export interface FilterState {
  statuses: string[]
  assignees: string[]
  macroCategories: string[]
  technicalLayers: string[]
  searchText: string
}

export interface SortState {
  key: keyof CategorizedBug | null
  direction: 'asc' | 'desc'
}

export type GroupBy = 'none' | 'macroCategory' | 'technicalLayer' | 'assignee'

export function filterBugs(bugs: CategorizedBug[], filters: FilterState): CategorizedBug[]
export function sortBugs(
  bugs: CategorizedBug[],
  sortKey: SortKey,
  sortDir: SortDirection
): CategorizedBug[]
export function groupBugs(bugs: CategorizedBug[], groupBy: GroupBy): Map<string, CategorizedBug[]>
export function computeKpis(bugs: CategorizedBug[]): KpiData
export function getUniqueValues(bugs: CategorizedBug[], field: keyof CategorizedBug): string[]
export function getTechnicalLayersForMacros(
  bugs: CategorizedBug[],
  selectedMacros: string[]
): string[]
```

## Key Rules

- Filter composition uses AND across filter families and OR within each selected list.
- Null assignees are normalized to the `UNASSIGNED` sentinel for both filtering and grouping. The two used to disagree — grouping had its own Italian key — which meant a group the user saw could not be reproduced by the filter built for the same set of bugs.
- Empty macro-category and technical-layer values are grouped under the `UNCATEGORIZED` sentinel. Both come from [[wiki/entities/categorization-sentinels]]; this module compares and groups machine values and never resolves them to text.
- `sortBugs()` sorts null values last regardless of direction.
- Known date fields (`createdDate`, `updatedDate`, `categorizedAt`) are compared as timestamps instead of plain strings.
- KPI aggregation counts only non-empty macro-categories and non-null assignees.

## Dependencies

- [[wiki/entities/shared-types]] — `CategorizedBug`

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/entities/kpi-cards]]
- [[wiki/concepts/dashboard-derivation-pipeline]]
