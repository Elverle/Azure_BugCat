---
title: 'Settings Page'
type: entity
subtype: component
created: 2026-04-29
updated: 2026-05-01
sources: ['[[wiki/sources/ft-02-settings]]', '[[wiki/sources/ft-07-session-persistence]]']
tags: [react, page, settings, ui, session]
lang: en
---

## Description

Top-level page component for application configuration. Composes three section cards (ADO connection, LLM provider, categories), a save action bar, and a destructive danger zone for clearing cached session data. Delegates settings state management to the [[wiki/entities/use-settings-hook]] and calls `window.electronAPI.clearSession()` only after explicit confirmation.

## Location

`src/renderer/src/pages/SettingsPage.tsx`

## Layout

```
┌─────────────────────────────────────────┐
│ Settings (h1) + subtitle                │
├─────────────────────────────────────────┤
│ 🔒 Security note (amber banner)        │
├─────────────────────────────────────────┤
│ [Save result banner — conditional]      │
├─────────────────────────────────────────┤
│ AdoConnectionSection                    │
├─────────────────────────────────────────┤
│ LlmProviderSection                      │
├─────────────────────────────────────────┤
│ CategoriesSection                       │
├─────────────────────────────────────────┤
│                         [Save Settings] │
├─────────────────────────────────────────┤
│ [Clear result banner — conditional]     │
├─────────────────────────────────────────┤
│ ⚠ Zona pericolosa                      │
│   [Pulisci dati sessione]               │
└─────────────────────────────────────────┘

[ConfirmDialog — conditional overlay]
```

## Behavior

- Shows a full-page spinner while settings are loading from IPC.
- Keeps the security note always visible: credentials are stored locally in encrypted form.
- Shows a save result banner: success auto-dismisses after 10 seconds, error stays dismissible.
- Disables the save button when the form is not dirty, contains validation errors, or is currently saving.
- Renders a danger zone card that explains the destructive impact of clearing the cached bug session.
- Opens [[wiki/entities/confirm-dialog]] before invoking `window.electronAPI.clearSession()`.
- Shows a dedicated success/error banner for the clear-session action; confirming always closes the modal in `finally`.
- Adds explicit `aria-label`s to dismiss buttons for non-text icon controls.

## Props / State

No props — uses `useSettings()` hook directly for settings state and local `useState()` only for confirmation dialog visibility plus clear-session feedback.

## Dependencies

- [[wiki/entities/use-settings-hook]] — settings state management
- [[wiki/entities/ado-connection-section]]
- [[wiki/entities/llm-provider-section]]
- [[wiki/entities/categories-section]]
- [[wiki/entities/button-component]] — Save and destructive actions
- [[wiki/entities/confirm-dialog]] — guarded clear-session flow
- `lucide-react` — icons (`Shield`, `Loader2`, `CheckCircle2`, `XCircle`, `X`, `AlertTriangle`)

## See also

- [[wiki/topics/renderer-ui]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/concepts/settings-persistence-flow]]
- [[wiki/concepts/accessible-confirmation-dialog]]
