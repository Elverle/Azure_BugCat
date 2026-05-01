---
title: 'FT-07 — Persistenza Dati e Gestione Sessione'
type: source
created: 2026-05-01
updated: 2026-05-01
sources: []
tags: [persistence, session, migration, settings, accessibility, testing]
lang: en
---

## Summary

FT-07 hardens the app's persistence layer and completes the user-facing session reset flow. The feature adds schema-versioned store bootstrapping in the main process, a reusable confirmation dialog with focus management, a destructive `Pulisci dati sessione` action in Settings, and an extracted `formatDate()` helper used to render session freshness timestamps consistently.

## Files Created

| File                                                | Purpose                                                                    |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/main/store-migration.ts`                       | Versioned migration pipeline for persisted store payloads                  |
| `src/renderer/src/components/ui/confirm-dialog.tsx` | Reusable confirmation modal with focus trap and keyboard handling          |
| `src/renderer/src/lib/date-utils.ts`                | Shared Italian-locale date formatting helper                               |
| `tests/main/store-migration.spec.ts`                | Migration coverage for legacy detection, forward-compat, and failure paths |
| `tests/renderer/format-date.spec.ts`                | Unit coverage for extracted date formatting behavior                       |
| `tests/renderer/SettingsPage-clear.spec.tsx`        | UI coverage for the clear-session confirmation flow                        |

## Files Modified

| File                                                        | Change                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/main/index.ts`                                         | Runs `migrateStore(store)` before registering IPC handlers or creating the window    |
| `src/main/store.ts`                                         | Keeps `schemaVersion` out of defaults so legacy stores can be detected correctly     |
| `src/renderer/src/pages/SettingsPage.tsx`                   | Adds danger zone banner, clear-session feedback, and confirmation dialog integration |
| `src/renderer/src/components/dashboard/DashboardHeader.tsx` | Replaces inline `toLocaleString()` formatting with the shared `formatDate()` helper  |
| `tests/main/ipc-handlers.spec.ts`                           | Adds explicit session clear/get coverage                                             |

## Key Takeaways

1. **Store upgrades now happen before app services start** — `migrateStore(store)` runs during Electron bootstrap, so IPC handlers never see stale schema assumptions.
2. **Legacy detection is intentional** — `schemaVersion` is not part of `electron-store` defaults, because missing keys must stay observable through `store.has('schemaVersion')`.
3. **Destructive actions now follow a reusable UI pattern** — Settings does not call `clearSession()` immediately; it routes through a focus-managed modal with explicit confirm/cancel choices.
4. **Session reset is scoped correctly** — clearing the session removes fetched/categorized bug data without touching saved settings.
5. **Timestamp formatting is centralized** — the dashboard header now relies on a pure utility instead of formatting dates inline inside the component.
6. **FT-07 shipped with targeted tests** — migration, renderer dialog flow, extracted date formatting, and IPC session contracts all have direct coverage.

## Architecture

```
app.whenReady()
  → migrateStore(store)
    → detect legacy schema via store.has('schemaVersion')
    → apply pending migrations in version order
    → persist migrated settings/session payloads
  → registerIPCHandlers()
  → createWindow()

SettingsPage danger zone
  → open ConfirmDialog
    → Escape / backdrop / Cancel closes
    → Confirm calls window.electronAPI.clearSession()
      → ipcMain.handle('session:clear')
      → store.set('session', null)

DashboardHeader
  → formatDate(sessionInfo.fetchedAt | categorizedAt)
```

## See also

- [[wiki/entities/store-migration]]
- [[wiki/entities/confirm-dialog]]
- [[wiki/entities/date-format-utility]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/concepts/accessible-confirmation-dialog]]
- [[wiki/topics/session-persistence-lifecycle]]
