---
title: 'Accessible Collection Controls'
type: concept
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-05-dashboard]]']
tags: [accessibility, react, ui, dashboard]
lang: en
---

## Definition

FT-05 adopts a project-level pattern for interactive collection controls built from semantic HTML first, then enhanced with ARIA metadata and keyboard handling. The goal is to keep dashboard exploration accessible without introducing third-party widgets.

## How It Works in This Project

- [[wiki/entities/multi-select-component]] uses a real button trigger plus a `role="listbox"` popup with `role="option"`, `aria-selected`, `aria-expanded`, and `Escape` handling.
- [[wiki/entities/bug-table]] exposes sort state through `aria-sort` on header cells and uses native buttons for sort interaction.
- [[wiki/entities/group-accordion]] uses a button trigger, `aria-controls`, and a labeled `role="region"` wrapper for expanded content.
- Optional row click behavior in [[wiki/entities/bug-table]] is also keyboard-triggerable via `Enter` and `Space`.

## Why It Matters Here

- The dashboard is the main operator workspace, so keyboard navigation and screen-reader hints are required for routine use.
- The project constraint forbids adding new UI dependencies, which makes semantic custom controls preferable to external combo-box packages.
- This pattern keeps behavior localized to small components that can be tested independently.

## Trade-offs

- **Pro:** No new dependency surface, styling stays consistent with the existing Tailwind/shadcn mix.
- **Pro:** ARIA state is explicit in the source code and straightforward to test.
- **Con:** Focus management is simpler than a full roving-tabindex widget; advanced keyboard navigation would require further refinement.
- **Con:** Accessibility behavior must be maintained manually as components evolve.

## See also

- [[wiki/entities/multi-select-component]]
- [[wiki/entities/bug-table]]
- [[wiki/entities/group-accordion]]
- [[wiki/topics/dashboard-bug-exploration]]
