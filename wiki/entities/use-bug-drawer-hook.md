---
title: 'useBugDrawer Hook'
type: entity
subtype: hook
created: 2026-04-30
updated: 2026-05-01
sources:
  ['[[wiki/sources/ft-06-bug-detail-drawer]]', '[[wiki/sources/ft-10-ai-cluster-similarity]]']
tags: [react, hook, dashboard, drawer]
lang: en
---

## Description

Renderer hook that owns bug drawer selection state and index-based navigation across the current bug list supplied by a page. It now supports both standard dashboard exploration and the dashboard `Similarità` drill-down flow while keeping the detail panel aligned with the currently visible slice of data.

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
- [[wiki/topics/ai-cluster-similar-bug-detection]]
