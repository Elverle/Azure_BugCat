---
title: 'MultiSelect Component'
type: entity
subtype: component
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-05-dashboard]]']
tags: [react, component, ui, filters, accessibility]
lang: en
---

## Description

Custom dropdown multi-select built specifically for the dashboard filter bar. Supports optional client-side option search without introducing a third-party select library.

## Location

`src/renderer/src/components/ui/multi-select.tsx`

## Props

```typescript
export interface MultiSelectProps {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  searchable?: boolean
  className?: string
}
```

## Behavior

- Toggle button exposes `aria-expanded` and `aria-haspopup="listbox"`.
- Dropdown container uses `role="listbox"` with `aria-multiselectable="true"`.
- Option rows expose `role="option"`, `aria-selected`, and support `Enter` / `Space` toggling.
- Closes on outside click and on `Escape`, clearing the internal search term in both cases.
- Button label shows the placeholder when empty, joined values for one or two selections, and `N selected` for larger sets.

## Dependencies

- `lucide-react` — ChevronDown, Search, Check

## See also

- [[wiki/entities/filter-bar]]
- [[wiki/concepts/accessible-collection-controls]]
- [[wiki/topics/renderer-ui]]
