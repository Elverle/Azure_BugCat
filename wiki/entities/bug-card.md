---
title: 'Bug Card'
type: entity
subtype: component
created: 2026-04-30
updated: 2026-08-19
sources: ['[[wiki/sources/ft-05-dashboard]]', '[[wiki/sources/ft-06-bug-detail-drawer]]']
tags: [react, component, dashboard, card]
lang: en
---

## Description

Compact card renderer used in grouped dashboard mode. Emphasizes status and category context while keeping title, priority, assignee, and area path visible in a scan-friendly layout, and now acts as a drill-down trigger for [[wiki/entities/bug-detail-drawer]].

## Location

`src/renderer/src/components/dashboard/BugCard.tsx`

## Behavior

- Uses `getTechnicalLayerBgTint()` to apply a deterministic light background per technical-layer cluster.
- Renders status, macro-category, and technical layer with the same palette mapping used by the table view. The category and layer text goes through `sentinelLabel()`, while the palette hashes the raw value, so colour does not follow wording.
- Shows priority as `P{n}` and falls back to italic `Unassigned` for null assignees.
- Truncates `areaPath` to avoid oversized cards while preserving the grouping context.
- Marks its root element with `data-bug-click` so the drawer can ignore bug-switch clicks during outside-click detection.
- Uses `role="button"`, `tabIndex={0}`, and `Enter`/`Space` handling when `onClick` is supplied, avoiding inaccessible `div`-only interaction.

## Dependencies

- [[wiki/entities/badge-color-utilities]]
- [[wiki/entities/shared-types]] — `CategorizedBug`
- [[wiki/concepts/click-outside-exclusion-pattern]]

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/group-accordion]]
- [[wiki/concepts/accessible-collection-controls]]
- [[wiki/topics/dashboard-bug-exploration]]
