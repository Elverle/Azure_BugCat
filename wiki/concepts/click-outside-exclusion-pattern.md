---
title: 'Click-Outside Exclusion Pattern'
type: concept
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-06-bug-detail-drawer]]']
tags: [ui, interaction, dashboard, accessibility]
lang: en
---

## Definition

Document-level outside-click closing pattern that uses an explicit data-attribute allowlist to ignore certain external targets. It is used when a panel should close on general page clicks, but some outside clicks are actually part of a valid state transition rather than a dismissal.

## How It Works in This Project

- [[wiki/entities/bug-detail-drawer]] listens for `mousedown` on `document` and closes only when the event target is outside the drawer surface.
- The same handler skips closure when `target.closest('[data-bug-click]')` matches, so selecting a different bug row or grouped bug card does not trigger a close before the next open.
- [[wiki/entities/bug-table]] marks clickable rows with `data-bug-click`.
- [[wiki/entities/bug-card]] marks clickable cards with `data-bug-click`.

## Why It Matters Here

- The dashboard now supports rapid drill-down between bugs. Without the exclusion marker, clicking another bug while the drawer is open would briefly count as an outside click and could cause a close/reopen flicker.
- The marker keeps the drawer logic decoupled from specific component implementations: any future bug launcher only needs to expose the agreed attribute.

## Trade-offs

- **Pro:** Minimal state coupling between the drawer and the components that can open it.
- **Pro:** Easy to extend to new launch surfaces without rewriting the closing logic.
- **Con:** Relies on an attribute convention that must be preserved when clickable bug surfaces are refactored.
- **Con:** Global document listeners still require cleanup discipline and focused component tests.

## See also

- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/bug-table]]
- [[wiki/entities/bug-card]]
- [[wiki/topics/dashboard-bug-exploration]]
