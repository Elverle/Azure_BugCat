---
title: 'Filter Bar'
type: entity
subtype: component
created: 2026-04-30
updated: 2026-04-30
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
- Uses [[wiki/entities/multi-select-component]] for status, assignee, macro-category, and sub-category filters.
- Exposes `groupBy` through a native `<select>` with options `none`, `macroCategory`, `subCategory`, and `assignee`.
- Includes a stateless `Reset` action and a grouped-view `Chiudi tutti` / `Espandi tutti` toggle.
- Keeps local search input mirrored with the parent `searchText` prop, so external resets immediately update the field.

## Dependencies

- [[wiki/entities/multi-select-component]]
- [[wiki/entities/dashboard-utils]] — `FilterState`, `GroupBy`

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/concepts/accessible-collection-controls]]
- [[wiki/concepts/dashboard-derivation-pipeline]]
