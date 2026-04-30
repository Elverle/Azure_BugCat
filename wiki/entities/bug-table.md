---
title: 'Bug Table'
type: entity
subtype: component
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-05-dashboard]]']
tags: [react, component, dashboard, table]
lang: en
---

## Description

Primary flat-list renderer for dashboard results. Displays bugs in an 8-column sortable table with semantic headers, status/category badges, and an optional row click callback for future detail views.

## Location

`src/renderer/src/components/dashboard/BugTable.tsx`

## Columns

| Key             | Label          |
| --------------- | -------------- |
| `id`            | `ID`           |
| `title`         | `Titolo`       |
| `priority`      | `Priorità`     |
| `state`         | `Stato`        |
| `assignee`      | `Assegnatario` |
| `areaPath`      | `Area Path`    |
| `macroCategory` | `Macro-cat`    |
| `subCategory`   | `Sotto-cat`    |

## Behavior

- Each header uses a real `<button>` inside `<th>` and exposes `aria-sort` so assistive technology can announce the active sort state.
- Visual sort icon changes between neutral, ascending, and descending states; actual sort transitions are delegated to the parent.
- Null assignees render as `Unassigned`.
- Status badges use [[wiki/entities/badge-color-utilities]]; category badges use deterministic hash-based palette slots.
- Rows are keyboard-activatable when `onBugClick` is provided, leaving a clean seam for FT-06 bug detail interactions.

## Dependencies

- [[wiki/entities/badge-color-utilities]]
- [[wiki/entities/dashboard-utils]] — `SortState`, `SortKey`
- [[wiki/entities/shared-types]] — `CategorizedBug`

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/concepts/accessible-collection-controls]]
- [[wiki/topics/dashboard-bug-exploration]]
