---
title: 'Bug Card'
type: entity
subtype: component
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-05-dashboard]]']
tags: [react, component, dashboard, card]
lang: en
---

## Description

Compact card renderer used in grouped dashboard mode. Emphasizes status and category context while keeping title, priority, assignee, and area path visible in a scan-friendly layout.

## Location

`src/renderer/src/components/dashboard/BugCard.tsx`

## Behavior

- Uses `getSubCategoryBgTint()` to apply a deterministic light background per sub-category cluster.
- Renders status, macro-category, and sub-category with the same palette mapping used by the table view.
- Shows priority as `P{n}` and falls back to italic `Unassigned` for null assignees.
- Truncates `areaPath` to avoid oversized cards while preserving the grouping context.
- Accepts an optional click callback for future drill-down flows.

## Dependencies

- [[wiki/entities/badge-color-utilities]]
- [[wiki/entities/shared-types]] — `CategorizedBug`

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/entities/group-accordion]]
- [[wiki/topics/dashboard-bug-exploration]]
