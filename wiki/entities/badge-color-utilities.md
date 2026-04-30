---
title: 'Badge Color Utilities'
type: entity
subtype: library
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-05-dashboard]]']
tags: [typescript, library, dashboard, styling]
lang: en
---

## Description

Utility module that maps bug states, macro-categories, and sub-categories to consistent Tailwind color classes. Provides both badge styling and the lighter background tints used by grouped cards.

## Location

`src/renderer/src/lib/badge-colors.ts`

## Public API

```typescript
export function getStatusBadgeClasses(state: string): string
export function getCategoryColor(category: string): { bg: string; text: string }
export function getSubCategoryBgTint(subCategory: string): string
```

## Behavior

- `getStatusBadgeClasses()` applies explicit semantic mappings for `Active`, `Resolved`, and `Closed`; unknown states fall back to blue.
- `getCategoryColor()` hashes the category string into a fixed 12-color palette so identical categories always share the same badge colors.
- Empty categories fall back to neutral gray badge styling.
- `getSubCategoryBgTint()` reuses the same hash strategy against a lighter tint palette for card backgrounds.

## See also

- [[wiki/entities/bug-table]]
- [[wiki/entities/bug-card]]
- [[wiki/topics/dashboard-bug-exploration]]
