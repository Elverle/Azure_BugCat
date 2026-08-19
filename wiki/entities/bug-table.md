---
title: 'Bug Table'
type: entity
subtype: component
created: 2026-04-30
updated: 2026-08-19
sources: ['[[wiki/sources/ft-05-dashboard]]', '[[wiki/sources/ft-06-bug-detail-drawer]]']
tags: [react, component, dashboard, table]
lang: en
---

## Description

Primary flat-list renderer for dashboard results. Displays bugs in an 8-column sortable table with semantic headers, status/category badges, and row-level drill-down into [[wiki/entities/bug-detail-drawer]].

## Location

`src/renderer/src/components/dashboard/BugTable.tsx`

## Columns

| Key              | Label       |
| ---------------- | ----------- |
| `id`             | `ID`        |
| `title`          | `Title`     |
| `priority`       | `Priority`  |
| `state`          | `State`     |
| `assignee`       | `Assignee`  |
| `areaPath`       | `Area Path` |
| `macroCategory`  | `Category`  |
| `technicalLayer` | `Layer`     |

## Behavior

- Each header uses a real `<button>` inside `<th>` and exposes `aria-sort` so assistive technology can announce the active sort state.
- Visual sort icon changes between neutral, ascending, and descending states; actual sort transitions are delegated to the parent.
- Null assignees render as the literal text `Unassigned` — a label, not the `UNASSIGNED` machine value, which is only ever a comparison key.
- The category and layer cells render through `sentinelLabel()`, so a persisted sentinel reaches the screen as readable text; the same values reach [[wiki/entities/badge-color-utilities]] raw, so colour does not follow wording. See [[wiki/concepts/sentinel-value-label-separation]].
- Status badges use [[wiki/entities/badge-color-utilities]]; category badges use deterministic hash-based palette slots.
- Rows expose `data-bug-click` so the drawer's outside-click handler can distinguish legitimate bug switches from true dismissal clicks.
- Rows are keyboard-activatable through `Enter` and `Space`, using `role="button"` when `onBugClick` is present so table exploration remains compatible with the new detail drawer flow.

## Dependencies

- [[wiki/entities/badge-color-utilities]]
- [[wiki/entities/dashboard-utils]] — `SortState`, `SortKey`
- [[wiki/entities/shared-types]] — `CategorizedBug`
- [[wiki/concepts/click-outside-exclusion-pattern]]

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/entities/bug-detail-drawer]]
- [[wiki/concepts/accessible-collection-controls]]
- [[wiki/concepts/click-outside-exclusion-pattern]]
- [[wiki/topics/dashboard-bug-exploration]]
