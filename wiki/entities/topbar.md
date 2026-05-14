---
title: 'Topbar'
type: entity
subtype: component
created: 2026-04-29
updated: 2026-05-13
sources:
	[
		'[[wiki/sources/ft-01-scaffold]]',
		'[[wiki/sources/ft-10-ai-cluster-similarity]]',
		'[[wiki/sources/ft-13-closed-bugs-history]]'
	]
tags: [react, component, navigation, ui]
lang: en
---

## Description

The main navigation topbar component. Displays BugCat branding plus the three top-level routes: Dashboard, Storico Chiusi, and Settings. Active links are styled through `NavLink` state.

## Location

`src/renderer/src/components/layout/Topbar.tsx`

## Structure

```
┌───────────────────────────────────────────────────────┐
│ 🐛 BugCat   [Dashboard] [Storico Chiusi] [Settings] │
└───────────────────────────────────────────────────────┘
```

- **Brand**: Bug icon + "BugCat" wordmark (blue-700)
- **Navigation**: `Dashboard`, `Storico Chiusi`, and `Settings` links via `NavLink`
- **Visual cue**: `Storico Chiusi` is the only nav item with an `Archive` icon, marking the historical analytics route
- Active nav link: blue-700 text + bottom border
- Inactive: gray-500 text, hover → gray-900

## Routing Note

- After the FT-10 refinement, similarity analysis is no longer exposed as a dedicated top-level route. The operator reaches it from the `Similarità` tab inside [[wiki/entities/dashboard-page]].
- FT-13 adds `Storico Chiusi` as a dedicated top-level page instead of embedding historical KPIs inside the dashboard, keeping the dashboard focused on the live open-bug workspace.

## Dependencies

- `lucide-react`: `Bug`, `Archive` icons
- `react-router-dom`: `NavLink` for active-aware routing
- `@renderer/lib/utils`: `cn()` for conditional classes

## See also

- [[wiki/entities/app-layout]]
- [[wiki/entities/closed-bugs-page]]
- [[wiki/topics/renderer-ui]]
