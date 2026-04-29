---
title: 'AppLayout'
type: entity
subtype: component
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-01-scaffold]]']
tags: [react, component, layout]
lang: en
---

## Description

Root layout component wrapping all pages. Renders the [[wiki/entities/topbar]] at the top and a scrollable `<main>` area with a React Router `<Outlet>` for child routes.

## Location

`src/renderer/src/components/layout/AppLayout.tsx`

## Structure

```
┌────────────────────────┐
│       <Topbar />       │
├────────────────────────┤
│                        │
│      <Outlet />        │  ← scrollable
│                        │
└────────────────────────┘
```

- Full-height flex column (`h-screen overflow-hidden flex flex-col`)
- Background: `bg-gray-50`, text: `text-gray-800`
- Main area: `flex-1 overflow-y-auto`

## See also

- [[wiki/entities/topbar]]
- [[wiki/topics/renderer-ui]]
