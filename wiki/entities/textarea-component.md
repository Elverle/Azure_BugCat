---
title: 'Textarea Component'
type: entity
subtype: component
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-02-settings]]']
tags: [react, ui, shadcn-ui, component]
lang: en
---

## Description

Styled HTML `<textarea>` wrapper following the shadcn/ui manual-install pattern. Forwards ref, merges class names via `cn()`. Supports vertical resize.

## Location

`src/renderer/src/components/ui/textarea.tsx`

## API

Extends `React.TextareaHTMLAttributes<HTMLTextAreaElement>`. Accepts all native textarea props plus optional `className` override.

## Default Styling

`min-h-[80px] w-full resize-y rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50`

## See also

- [[wiki/entities/input-component]]
- [[wiki/concepts/tailwind-styling]]
