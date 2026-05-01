---
title: 'Accessible Collection Controls'
type: concept
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-05-dashboard]]', '[[wiki/sources/ft-06-bug-detail-drawer]]']
tags: [accessibility, react, ui, dashboard]
lang: en
---

## Definition

FT-05 adopts a project-level pattern for interactive collection controls built from semantic HTML first, then enhanced with ARIA metadata and keyboard handling. The goal is to keep dashboard exploration accessible without introducing third-party widgets.

## How It Works in This Project

- [[wiki/entities/multi-select-component]] uses a real button trigger plus a `role="listbox"` popup with `role="option"`, `aria-selected`, `aria-expanded`, and `Escape` handling.
- [[wiki/entities/bug-table]] exposes sort state through `aria-sort` on header cells and uses native buttons for sort interaction.
- [[wiki/entities/group-accordion]] uses a button trigger, `aria-controls`, and a labeled `role="region"` wrapper for expanded content.
- [[wiki/entities/bug-table]] row drill-down is keyboard-triggerable via `Enter` and `Space` when detail navigation is enabled.
- [[wiki/entities/bug-card]] mirrors the same non-native button pattern with `role="button"`, `tabIndex={0}`, and `Enter`/`Space` handling.
- [[wiki/entities/bug-detail-drawer]] uses explicit `aria-label`s on icon-only previous/next/close controls and keeps `Escape` as a global close affordance.

## Why It Matters Here

- The dashboard is the main operator workspace, so keyboard navigation and screen-reader hints are required for routine use.
- The project constraint forbids adding new UI dependencies, which makes semantic custom controls preferable to external combo-box packages.
- FT-06 adds drill-down interactions on both rows and cards, so accessibility now has to cover entry into the detail flow as well as filter/group controls.
- This pattern keeps behavior localized to small components that can be tested independently.

## Trade-offs

- **Pro:** No new dependency surface, styling stays consistent with the existing Tailwind/shadcn mix.
- **Pro:** ARIA state is explicit in the source code and straightforward to test.
- **Con:** Focus management is simpler than a full roving-tabindex widget; advanced keyboard navigation would require further refinement.
- **Con:** Accessibility behavior must be maintained manually as components evolve.

## See also

- [[wiki/entities/multi-select-component]]
- [[wiki/entities/bug-table]]
- [[wiki/entities/bug-card]]
- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/group-accordion]]
- [[wiki/topics/dashboard-bug-exploration]]
