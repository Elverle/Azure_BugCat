---
title: 'Bug Detail Drawer'
type: entity
subtype: component
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-06-bug-detail-drawer]]']
tags: [react, component, dashboard, drawer, accessibility]
lang: en
---

## Description

Fixed right-side detail panel used by the dashboard to inspect one bug without leaving the current filtered workspace. It combines status/title context, LLM categorization output, Azure DevOps metadata, a scrollable description, list navigation controls, and a secure external-link action.

## Location

`src/renderer/src/components/dashboard/BugDetailDrawer.tsx`

## Props

| Prop                  | Type                     | Purpose                                                 |
| --------------------- | ------------------------ | ------------------------------------------------------- |
| `bug`                 | `CategorizedBug \| null` | Currently selected bug                                  |
| `isOpen`              | `boolean`                | Controls slide-in state                                 |
| `onClose`             | `() => void`             | Closes the drawer                                       |
| `onPrev` / `onNext`   | `() => void`             | Navigates within the active list                        |
| `hasPrev` / `hasNext` | `boolean`                | Disables boundary navigation buttons                    |
| `onViewInAdo`         | `() => void`             | Invokes the external browser action                     |
| `adoLinkEnabled`      | `boolean`                | Disables the footer action when settings are incomplete |

## Key Behaviors

- Renders as a fixed `w-[400px]` panel pinned below the top bar (`top-[57px]`) and animates with a `translate-x` transition.
- Installs a document-level `keydown` listener so `Escape` closes the drawer from anywhere in the page.
- Installs a document-level `mousedown` listener for click-outside closing, but skips both clicks inside the drawer and clicks tagged with `data-bug-click`; this behavior is documented in [[wiki/concepts/click-outside-exclusion-pattern]].
- Shows a highlighted LLM card when categorization data exists, or an explicit `Non ancora categorizzato` placeholder when `macroCategory` is empty.
- Formats created/updated timestamps with `it-IT`, joins tags inline, and renders `Nessuna descrizione disponibile` when description text is empty.
- Delegates previous/next navigation and external-link behavior to parent callbacks so navigation logic and shell access stay outside the presentation component.

## Dependencies

- [[wiki/entities/shared-types]] — `CategorizedBug`
- [[wiki/entities/badge-color-utilities]] — status badge classes
- [[wiki/concepts/click-outside-exclusion-pattern]]

## See also

- [[wiki/entities/use-bug-drawer-hook]]
- [[wiki/entities/dashboard-page]]
- [[wiki/entities/open-external-ipc]]
- [[wiki/topics/dashboard-bug-exploration]]
