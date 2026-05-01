# Feature 7 — FT-07: Persistenza Dati e Gestione Sessione

## Requirements

| # | ID | Descrizione | Priorità |
|---|---|---|---|
| 1 | FR-SCHEMA-001 | Schema version tracking (`schemaVersion` field) | Must-Have |
| 2 | FR-SCHEMA-002 | Schema migration on app startup | Must-Have |
| 3 | FR-SCHEMA-003 | Forward-compatible migration pipeline | Should-Have |
| 4 | FR-CLEAR-001 | "Pulisci dati sessione" button in Settings (Danger Zone) | Must-Have |
| 5 | FR-CLEAR-002 | Confirmation dialog before clear | Must-Have |
| 6 | FR-CLEAR-003 | Clear invokes IPC and resets UI | Must-Have |
| 7 | FR-TS-001 | Italian locale timestamp format (GG/MM/AAAA HH:MM) | Must-Have |

## Implementation Plan

### Wave 1 (PARALLEL)
| Task | Tipo | Titolo | Files |
|------|------|--------|-------|
| T-001 | IMPLEMENT | Schema migration module | `src/main/store-migration.ts` |
| T-002 | IMPLEMENT | Confirmation dialog component | `src/renderer/src/components/ui/confirm-dialog.tsx` |

### Wave 2 (PARALLEL)
| Task | Tipo | Titolo | Files |
|------|------|--------|-------|
| T-003 | INTEGRATE | Wire migration into app startup | `src/main/index.ts`, `src/main/store.ts` |
| T-004 | IMPLEMENT | "Pulisci dati sessione" in Settings | `src/renderer/src/pages/SettingsPage.tsx` |
| T-005 | IMPLEMENT | Extract formatDate to date-utils.ts | `src/renderer/src/lib/date-utils.ts`, `DashboardHeader.tsx` |

### Wave 3 (PARALLEL)
| Task | Tipo | Titolo | Files |
|------|------|--------|-------|
| T-006 | TEST | Schema migration tests | `tests/main/store-migration.spec.ts` |
| T-007 | TEST | Clear session IPC tests | `tests/main/ipc-handlers.spec.ts` |
| T-008 | TEST | Settings clear-session UI + format date tests | `tests/renderer/SettingsPage-clear.spec.tsx`, `tests/renderer/format-date.spec.ts` |

## Decisions

- Migration v0→v1: no-op (version stamp only)
- Clear session feedback: stay in Settings with success banner
- formatDate: extracted to `src/renderer/src/lib/date-utils.ts`
- Persistence: electron-store (not SQLite)
