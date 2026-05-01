---
title: 'Topbar'
type: entity
subtype: component
created: 2026-04-29
updated: 2026-05-01
sources: ['[[wiki/sources/ft-01-scaffold]]', '[[wiki/sources/ft-10-ai-cluster-similarity]]']
tags: [react, component, navigation, ui]
lang: en
---

## Description

The main navigation topbar component. Displays BugCat branding (Bug icon + name), nav links (Dashboard, Settings) with active state styling, and a project indicator stub.

## Location

`src/renderer/src/components/layout/Topbar.tsx`

## Structure

```
┌─────────────────────────────────────────────────────┐
│ 🐛 BugCat   [Dashboard] [Settings]    Project: —   │
└─────────────────────────────────────────────────────┘
```

- **Left**: Bug icon + "BugCat" brand (blue-700), nav links via `NavLink`
- **Right**: Database icon + project name placeholder
- Active nav link: blue-700 text + bottom border
- Inactive: gray-500 text, hover → gray-900

## FT-10 Note

After the FT-10 refinement, similarity analysis is no longer exposed as a dedicated top-level route. The operator reaches it from the `Similarità` tab inside [[wiki/entities/dashboard-page]], so the top bar stays focused on the two primary workspaces: dashboard and settings.

## Dependencies

- `lucide-react`: `Bug`, `Database` icons
- `react-router-dom`: `NavLink` for active-aware routing
- `@renderer/lib/utils`: `cn()` for conditional classes

## See also

- [[wiki/entities/app-layout]]
- [[wiki/topics/renderer-ui]]
