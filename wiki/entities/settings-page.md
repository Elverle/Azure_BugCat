---
title: 'Settings Page'
type: entity
subtype: component
created: 2026-04-29
updated: 2026-05-17
sources:
  [
    '[[wiki/sources/ft-02-settings]]',
    '[[wiki/sources/ft-07-session-persistence]]',
    '[[wiki/sources/ft-12-incremental-session-cache]]',
    '[[wiki/sources/ft-14a-agent-configuration-project-registry]]'
  ]
tags: [react, page, settings, ui, session, catalog, agent, projects]
lang: en
---

## Description

Top-level page component for application configuration. It now composes six section cards: ADO connection, LLM provider, agent provider, project registry, architecture context, and categories. The page keeps the save action bar and the two destructive cleanup zones for session and historical catalog data. Settings state still lives in [[wiki/entities/use-settings-hook]], while destructive actions remain gated behind explicit confirmation dialogs.

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
│ AgentProviderSection                    │
├─────────────────────────────────────────┤
│ ProjectRegistrySection                  │
├─────────────────────────────────────────┤
│ ArchitectureContextSection              │
├─────────────────────────────────────────┤
│ CategoriesSection                       │
├─────────────────────────────────────────┤
│                         [Save Settings] │
├─────────────────────────────────────────┤
│ [Clear result banner — conditional]     │
├─────────────────────────────────────────┤
│ ⚠ Zona pericolosa                      │
│   [Pulisci dati sessione]               │
├─────────────────────────────────────────┤
│ [Clear catalog result banner - cond.]   │
├─────────────────────────────────────────┤
│ ⚠ Cancella storico bug                  │
│   [Cancella storico bug]                │
└─────────────────────────────────────────┘

[ConfirmDialog session clear - conditional overlay]
[ConfirmDialog catalog clear - conditional overlay]
```

## Behavior

- Shows a full-page spinner while settings are loading from IPC.
- Keeps the security note always visible: credentials are stored locally in encrypted form.
- Shows a save result banner: success auto-dismisses after 10 seconds, error stays dismissible.
- Disables the save button when the form is not dirty, contains validation errors, or is currently saving.
- Owns local state for the Codex CLI binary check result and loading flag, then passes that state into [[wiki/entities/agent-provider-section]].
- Hosts the FT-14A agent-session preparation surface without executing any agent workflow yet.
- Renders a session danger zone card that explains the destructive impact of clearing the current snapshot while preserving historical catalog data.
- Renders a second danger zone card for deleting the historical bug catalog while preserving the current session snapshot.
- Opens separate [[wiki/entities/confirm-dialog]] instances before invoking `window.electronAPI.clearSession()` and `window.electronAPI.clearCatalog()`.
- Shows dedicated success/error banners for both destructive actions; confirming either action always closes its modal in `finally`.
- Adds explicit `aria-label`s to dismiss buttons for non-text icon controls.

## Props / State

No props — uses `useSettings()` hook directly for settings state and local `useState()` for two confirmation dialogs plus separate feedback banners for session-clear and catalog-clear results.

## Dependencies

- [[wiki/entities/use-settings-hook]] — settings state management
- [[wiki/entities/ado-connection-section]]
- [[wiki/entities/llm-provider-section]]
- [[wiki/entities/agent-provider-section]]
- [[wiki/entities/project-registry-section]]
- [[wiki/entities/architecture-context-section]]
- [[wiki/entities/categories-section]]
- [[wiki/entities/button-component]] — Save and destructive actions
- [[wiki/entities/confirm-dialog]] — guarded clear-session flow
- `lucide-react` — icons (`Shield`, `Loader2`, `CheckCircle2`, `XCircle`, `X`, `AlertTriangle`)

## See also

- [[wiki/topics/renderer-ui]]
- [[wiki/topics/agent-session-configuration-foundation]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
- [[wiki/concepts/settings-persistence-flow]]
- [[wiki/concepts/accessible-confirmation-dialog]]
