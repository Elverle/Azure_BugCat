---
title: 'Select Component'
type: entity
subtype: component
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-02-settings]]']
tags: [react, ui, shadcn-ui, component]
lang: en
---

## Description

Styled HTML `<select>` wrapper following the shadcn/ui manual-install pattern. Forwards ref, merges class names via `cn()`. Consistent appearance with Input component.

## Location

`src/renderer/src/components/ui/select.tsx`

## API

Extends `React.SelectHTMLAttributes<HTMLSelectElement>`. Accepts children (`<option>` elements) and optional `className` override.

## Default Styling

`h-9 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50`

## See also

- [[wiki/entities/input-component]]
- [[wiki/concepts/tailwind-styling]]
