---
title: 'Confirm Dialog'
type: entity
subtype: component
created: 2026-05-01
updated: 2026-05-03
sources:
  ['[[wiki/sources/ft-07-session-persistence]]', '[[wiki/sources/ft-11-openrouter-provider]]']
tags: [react, component, dialog, accessibility, settings]
lang: en
---

## Description

Reusable modal confirmation component for destructive or guarded user actions. FT-07 introduces it to protect session clearing in Settings, and FT-11 reuses the same component as a one-action blocking error popup for categorization failures.

## Location

`src/renderer/src/components/ui/confirm-dialog.tsx`

## Props

```typescript
interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'destructive' | 'default'
  onConfirm: () => void
  onCancel: () => void
}
```

## Behavior

- Returns `null` when `open` is `false`, so callers can always keep it mounted declaratively.
- Renders a centered `role="dialog"` surface with `aria-modal`, `aria-labelledby`, and `aria-describedby` wired through `useId()`.
- Moves initial focus to the cancel button when present; otherwise the primary action button becomes the first focus target.
- Restores focus to the previously active element when the dialog closes.
- Cancels on backdrop click or `Escape`.
- Traps `Tab` and `Shift+Tab` inside the dialog by cycling between the first and last focusable elements.
- Supports both neutral and destructive confirmation styling through the shared [[wiki/entities/button-component]] variants.
- `cancelLabel` is optional, allowing single-button informational dialogs in addition to confirm/cancel flows.

## Dependencies

- [[wiki/entities/button-component]] — action buttons
- `@renderer/lib/utils` — `cn()` class merging helper

## See also

- [[wiki/entities/settings-page]]
- [[wiki/concepts/accessible-confirmation-dialog]]
- [[wiki/topics/renderer-ui]]
- [[wiki/topics/session-persistence-lifecycle]]
