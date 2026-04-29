---
title: 'Categories Section'
type: entity
subtype: component
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-02-settings]]']
tags: [react, component, settings, categories]
lang: en
---

## Description

Settings card for managing bug categories. Uses a textarea where each line is one category. Categories are parsed on blur (split lines, trim, deduplicate). Includes a Reset button (with confirmation dialog) and an info note about LLM auto-generation when categories are empty.

## Location

`src/renderer/src/components/settings/CategoriesSection.tsx`

## Props

```typescript
interface CategoriesSectionProps {
  categories: string[]
  onCategoriesChange: (categories: string[]) => void
  onReset: () => void
  categoriesToText: (categories: string[]) => string
  textToCategories: (text: string) => string[]
}
```

## Behavior

- Local `textValue` state synced to `categories` prop via `useEffect`
- Editing updates local text; parsing happens on `onBlur` (not on every keystroke)
- Reset button triggers `window.confirm()` before clearing
- Info banner: "When categories are empty, the LLM will auto-generate categories based on the bugs."

## Dependencies

- [[wiki/entities/textarea-component]], [[wiki/entities/label-component]], [[wiki/entities/button-component]]
- `lucide-react` — Tags, Info

## See also

- [[wiki/entities/settings-page]]
- [[wiki/entities/use-settings-hook]]
