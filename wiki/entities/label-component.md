---
title: 'Label Component'
type: entity
subtype: component
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-02-settings]]']
tags: [react, ui, shadcn-ui, component]
lang: en
---

## Description

Styled HTML `<label>` wrapper following the shadcn/ui manual-install pattern. Forwards ref, merges class names via `cn()`. Consistent typography for form labels.

## Location

`src/renderer/src/components/ui/label.tsx`

## API

Extends `React.LabelHTMLAttributes<HTMLLabelElement>`. Accepts all native label props plus optional `className` override.

## Default Styling

`text-sm font-medium text-gray-700`

## See also

- [[wiki/entities/input-component]]
- [[wiki/concepts/tailwind-styling]]
