---
title: 'useSettings Hook'
type: entity
subtype: hook
created: 2026-04-29
updated: 2026-08-20
sources: ['[[wiki/sources/ft-02-settings]]', '[[wiki/sources/ft-08-generic-provider]]']
tags: [react, hook, state-management, settings, ipc, secrets]
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
  clearSecret: (field: 'pat' | 'apiKey') => void
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
- **Test connections:** Race IPC call against 5 s timeout → structured result. Sends the current in-memory `settings` (which may still hold the [[wiki/entities/secret-storage|secret sentinel]] for an untouched `pat`/`apiKey`) as `settingsOverride`; the main process resolves it back to the stored plaintext.
- **`clearSecret(field)` (FT-14):** A stored `pat`/`apiKey` arrives from `getSettings()` as the sentinel and is not directly editable — typing into it would append characters to `'__stored__'`. `clearSecret()` calls `updateField(field, '')`, which flips the field back to its normal editable, empty state so the user can type a real replacement. Wired to the "Replace" buttons in [[wiki/entities/ado-connection-section]] and [[wiki/entities/llm-provider-section]].
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
  baseUrl: '',
  llmModel: '',
  pat: '',
  categories: []
}
```

## FT-08 Notes

- `useSettings` now treats generic-provider fields as part of the normal form state rather than branching on a Copilot-only authentication mode.
- The hook preserves `baseUrl` and `llmModel` values when users switch providers, because it stores the full `AppSettings` object and only changes the targeted field.

## Dependencies

- [[wiki/entities/validation-utils]] — `validateSettings()`, `isSettingsValid()`
- [[wiki/entities/preload-bridge]] — `window.electronAPI` (getSettings, setSettings, testAdoConnection, testLlmConnection)
- [[wiki/entities/shared-types]] — `AppSettings`
- [[wiki/entities/secret-storage]] — the sentinel `clearSecret()` reacts to

## See also

- [[wiki/entities/settings-page]] — consumer
- [[wiki/concepts/form-validation-pattern]]
- [[wiki/concepts/settings-persistence-flow]]
- [[wiki/entities/secret-storage]]
