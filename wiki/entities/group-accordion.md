---
title: 'Group Accordion'
type: entity
subtype: component
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-05-dashboard]]']
tags: [react, component, dashboard, grouping]
lang: en
---

## Description

Reusable collapsible container for grouped dashboard output. Wraps either a table or a list of cards under a group header with a bug-count badge.

## Location

`src/renderer/src/components/dashboard/GroupAccordion.tsx`

## Props

```typescript
interface GroupAccordionProps {
  groupName: string
  bugCount: number
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}
```

## Behavior

- Derives a stable `contentId` from the group name and wires it through `aria-controls` / `role="region"`.
- Uses a single header `<button>` so expand/collapse works with both pointer and keyboard activation.
- Shows stronger indigo styling when expanded and a muted gray style when collapsed.
- Keeps rendering strategy outside the component: children may be a [[wiki/entities/bug-table]] or a list of [[wiki/entities/bug-card]] instances.

## Dependencies

- [[wiki/entities/bug-table]]
- [[wiki/entities/bug-card]]

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/concepts/accessible-collection-controls]]
