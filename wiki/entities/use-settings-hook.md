---
title: 'useSettings Hook'
type: entity
subtype: hook
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-02-settings]]']
tags: [react, hook, state-management, settings, ipc]
lang: en
---

## Description

Central state management hook for the Settings page. Owns form state, validation, dirty tracking, IPC load/save, and test connection calls. Single source of truth for all settings-related state.

## Location

`src/renderer/src/hooks/useSettings.ts`

## Public API

```typescript
export interface UseSettingsReturn {
  settings: AppSettings
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  loading: boolean
  saving: boolean
  saveResult: ResultMessage | null
  isDirty: boolean
  canSave: boolean
  updateField: (field: keyof AppSettings, value: unknown) => void
  save: () => Promise<void>
  clearSaveResult: () => void
  testAdoConnection: () => Promise<void>
  testAdoResult: ResultMessage | null
  testAdoLoading: boolean
  testLlmConnection: () => Promise<void>
  testLlmResult: ResultMessage | null
  testLlmLoading: boolean
  resetCategories: () => void
  categoriesToText: (categories: string[]) => string
  textToCategories: (text: string) => string[]
}
```

## State Management

| State                             | Type                             | Purpose                                      |
| --------------------------------- | -------------------------------- | -------------------------------------------- |
| `settings`                        | `AppSettings`                    | Current form values                          |
| `originalSettings`                | `AppSettings`                    | Snapshot at load time, for dirty comparison  |
| `errors`                          | `Record<string, string \| null>` | Per-field validation errors                  |
| `touched`                         | `Record<string, boolean>`        | Tracks which fields user has interacted with |
| `loading`                         | `boolean`                        | True while loading from IPC                  |
| `saving`                          | `boolean`                        | True while saving to IPC                     |
| `saveResult`                      | `ResultMessage \| null`          | Success/error feedback after save            |
| `testAdoResult` / `testLlmResult` | `ResultMessage \| null`          | Test connection feedback                     |

## Key Behaviors

- **Load on mount:** Calls `window.electronAPI.getSettings()` with cleanup cancellation
- **Real-time validation:** Re-runs `validateSettings()` on every settings change via `useEffect`
- **Dirty tracking:** `isDirty = JSON.stringify(settings) !== JSON.stringify(originalSettings)`
- **`canSave`:** `isDirty && isSettingsValid(errors) && !saving`
- **Save flow:** Mark all fields touched → validate → if valid, call `setSettings()` IPC → update `originalSettings`
- **Test connections:** Race IPC call against 5 s timeout → structured result
- **Auto-dismiss:** Test results clear after 5 s via `useEffect` timers
- **Categories helpers:** `categoriesToText` (join with `\n`), `textToCategories` (split, trim, deduplicate)

## Default Settings

```typescript
const DEFAULT_SETTINGS: AppSettings = {
  orgUrl: '',
  projectName: '',
  queryId: '',
  topN: 20,
  chunkSize: 15,
  llmProvider: 'openai',
  apiKey: '',
  pat: '',
  categories: [],
  copilotAuthStatus: 'unknown'
}
```

## Dependencies

- [[wiki/entities/validation-utils]] — `validateSettings()`, `isSettingsValid()`
- [[wiki/entities/preload-bridge]] — `window.electronAPI` (getSettings, setSettings, testAdoConnection, testLlmConnection)
- [[wiki/entities/shared-types]] — `AppSettings`

## See also

- [[wiki/entities/settings-page]] — consumer
- [[wiki/concepts/form-validation-pattern]]
- [[wiki/concepts/settings-persistence-flow]]
