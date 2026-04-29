---
title: 'Settings Page'
type: entity
subtype: component
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-02-settings]]']
tags: [react, page, settings, ui]
lang: en
---

## Description

Top-level page component for application configuration. Composes three section cards (ADO connection, LLM provider, categories) with a save action bar. Delegates all state management to the [[wiki/entities/use-settings-hook]].

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
│ LlmProviderSection                     │
├─────────────────────────────────────────┤
│ CategoriesSection                       │
├─────────────────────────────────────────┤
│                         [Save Settings] │
└─────────────────────────────────────────┘
```

## Behavior

- Shows spinner while settings are loading from IPC
- Security note always visible: "Credentials stored locally in encrypted form"
- Save result banner: green for success (auto-dismiss 3 s), red for error (manual dismiss)
- Save button disabled when form is not dirty, has validation errors, or is currently saving
- Saving shows inline spinner in the button

## Props / State

No props — uses `useSettings()` hook directly for all state.

## Dependencies

- [[wiki/entities/use-settings-hook]] — state management
- [[wiki/entities/ado-connection-section]]
- [[wiki/entities/llm-provider-section]]
- [[wiki/entities/categories-section]]
- [[wiki/entities/button-component]] — Save button
- `lucide-react` — icons (Shield, Loader2, CheckCircle2, XCircle, X)

## See also

- [[wiki/topics/renderer-ui]]
- [[wiki/concepts/settings-persistence-flow]]
