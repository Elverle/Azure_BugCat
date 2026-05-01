---
title: 'Accessible Confirmation Dialog'
type: concept
created: 2026-05-01
updated: 2026-05-01
sources: ['[[wiki/sources/ft-07-session-persistence]]']
tags: [accessibility, ui, dialog, focus-management, destructive-actions]
lang: en
---

## Definition

Destructive actions use a modal confirmation step that combines semantic dialog markup, keyboard affordances, focus trapping, and focus restoration. The pattern reduces accidental destructive actions while keeping the flow accessible to keyboard and assistive-technology users.

## How It Works in This Project

- [[wiki/entities/confirm-dialog]] renders only when `open` is `true` and exposes `role="dialog"` with `aria-modal`, `aria-labelledby`, and `aria-describedby`.
- Opening the dialog stores the previously focused element and moves focus to the cancel button.
- A document-level `keydown` handler closes on `Escape` and cycles `Tab` / `Shift+Tab` within the dialog's focusable elements.
- Clicking the backdrop cancels, while clicks inside the panel stop propagation.
- Closing restores focus to the element that originally opened the dialog.
- [[wiki/entities/settings-page]] uses the pattern for `Pulisci dati sessione`, so destructive session reset always has an explicit confirm/cancel branch.

## Why It Matters Here

- Session clearing is irreversible for cached bug/categorization data, so an accidental click should not immediately mutate persistent state.
- The app already relies on custom UI primitives; this pattern extends that approach without bringing in an external dialog library.
- Focus restoration matters inside Electron desktop UIs because the same page remains mounted after modal dismissal.

## Trade-offs

- **Pro:** Reusable for future destructive or high-risk actions with consistent behavior.
- **Pro:** Accessibility behavior is explicit and easy to test.
- **Con:** The current focus trap queries the first `[role="dialog"]`, so multiple simultaneous dialogs would need extra coordination.
- **Con:** Advanced dialog features such as inert background management are still implemented manually.

## See also

- [[wiki/entities/confirm-dialog]]
- [[wiki/entities/settings-page]]
- [[wiki/topics/renderer-ui]]
- [[wiki/topics/session-persistence-lifecycle]]
