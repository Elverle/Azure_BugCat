---
title: 'Button (shadcn/ui)'
type: entity
subtype: component
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-01-scaffold]]']
tags: [react, component, shadcn-ui, ui]
lang: en
---

## Description

shadcn/ui `Button` component, manually installed (no CLI). Uses `class-variance-authority` for variant/size management and `cn()` for class merging.

## Location

`src/renderer/src/components/ui/button.tsx`

## Variants

| Variant       | Style                           |
| ------------- | ------------------------------- |
| `default`     | Dark gray bg, white text        |
| `destructive` | Red bg, white text              |
| `outline`     | White bg, gray border           |
| `secondary`   | Light gray bg, dark text        |
| `ghost`       | Transparent, hover gray         |
| `link`        | Underline on hover              |
| `gradient`    | Indigo→purple gradient (custom) |

## Sizes

| Size      | Class              |
| --------- | ------------------ |
| `default` | `h-9 px-4 py-2`    |
| `sm`      | `h-8 px-3 text-xs` |
| `lg`      | `h-10 px-8`        |
| `icon`    | `h-9 w-9`          |

## Dependencies

- `class-variance-authority` — variant definitions
- `@renderer/lib/utils` — `cn()` merge utility

## See also

- [[wiki/topics/renderer-ui]]
