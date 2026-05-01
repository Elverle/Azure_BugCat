---
title: 'useBugDrawer Hook'
type: entity
subtype: hook
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-06-bug-detail-drawer]]']
tags: [react, hook, dashboard, drawer]
lang: en
---

## Description

Renderer hook that owns bug drawer selection state and index-based navigation across the current filtered and sorted bug list. It keeps the detail panel aligned with whatever slice of data the dashboard is currently showing.

## Location

`src/renderer/src/hooks/useBugDrawer.ts`

## State and Derived Values

| Value                 | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `selectedBug`         | Active bug shown in the drawer                         |
| `isOpen`              | Whether the drawer is visible                          |
| `currentIndex`        | Position of `selectedBug` inside the current `bugList` |
| `hasPrev` / `hasNext` | Boundary flags for navigation controls                 |

## Key Behaviors

- Accepts the current `bugList` as input, so navigation always reflects the latest filtered and sorted dashboard results.
- Exposes `openDrawer()` and `closeDrawer()` as stable callbacks for the page-level integration.
- Uses `currentIndex` to implement `goToPrev()` and `goToNext()` without duplicating list traversal logic in the page component.
- Closes automatically when filters or grouping changes remove the selected bug from the current list.
- Replaces `selectedBug` with the latest object instance from `bugList` when the same bug remains visible but its data changes.

## Dependencies

- [[wiki/entities/shared-types]] — `CategorizedBug`

## See also

- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/dashboard-page]]
- [[wiki/topics/dashboard-bug-exploration]]
