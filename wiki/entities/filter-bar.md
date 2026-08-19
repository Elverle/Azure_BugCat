---
title: 'Filter Bar'
type: entity
subtype: component
created: 2026-04-30
updated: 2026-08-19
sources: ['[[wiki/sources/ft-05-dashboard]]']
tags: [react, component, dashboard, filters]
lang: en
---

## Description

Horizontal control bar for dashboard exploration. Combines debounced free-text search, four multi-select filters, grouping selection, reset, and collapse/expand-all actions.

## Location

`src/renderer/src/components/dashboard/FilterBar.tsx`

## Behavior

- Debounces text search by 200 ms before calling `onSearchChange()`.
- Uses [[wiki/entities/multi-select-component]] for the status, assignee, category, and technical-layer filters, labelled `State`, `Assignee`, `Category`, and `Technical layer`.
- Passes `getLabel={sentinelLabel}` to the assignee, category, and layer multi-selects, so an option can read as `Unassigned` while still being compared as `__unassigned__`. The status filter gets no `getLabel`: ADO state names are never sentinels. See [[wiki/concepts/sentinel-value-label-separation]].
- Exposes `groupBy` through a native `<select>` with options `none`, `macroCategory`, `technicalLayer`, and `assignee`, shown as `None`, `By category`, `By technical layer`, and `By assignee`.
- Includes a stateless `Reset` action and a grouped-view `Expand all` / `Collapse all` toggle.
- Keeps local search input mirrored with the parent `searchText` prop, so external resets immediately update the field.

## Dependencies

- [[wiki/entities/multi-select-component]]
- [[wiki/entities/dashboard-utils]] — `FilterState`, `GroupBy`

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/concepts/accessible-collection-controls]]
- [[wiki/concepts/dashboard-derivation-pipeline]]
