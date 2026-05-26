---
title: 'useSettings Hook'
type: entity
subtype: hook
created: 2026-04-29
updated: 2026-05-26
sources:
  [
    '[[wiki/sources/ft-02-settings]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-14a-agent-configuration-project-registry]]',
    '[[wiki/sources/ft-14g-code-source-selection-mcp-repos-vs-local-filesystem]]'
  ]
tags: [react, hook, state-management, settings, ipc, agent, projects]
lang: en
---

## Description

Central state management hook for the Settings page. It owns form state, validation, dirty tracking, IPC load/save, connection tests, FT-14A agent-provider derivation, project registry CRUD, and FT-14G's code-source-aware sanitization and path-validation flow.

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
  addProject: () => void
  updateProject: (id: string, updates: Partial<ProjectEntry>) => void
  removeProject: (id: string) => void
  checkAgentBinary: () => Promise<BinaryCheckResult>
  selectDirectory: () => Promise<string | null>
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
| `initialLoadDone`                 | `Ref<boolean>`                   | Guards auto-derivation during first hydrate  |

## Key Behaviors

- **Load on mount:** Calls `window.electronAPI.getSettings()` with cleanup cancellation
- **Real-time validation:** Re-runs `validateSettings()` on every settings change via `useEffect`
- **Dirty tracking:** `isDirty = JSON.stringify(settings) !== JSON.stringify(originalSettings)`
- **`canSave`:** `isDirty && isSettingsValid(errors) && !saving`
- **Auto-derivation:** After initial load, switching `llmProvider` to `anthropic` or `openai` writes `agentProvider = 'claude-sdk'` or `'codex-sdk'` into state.
- **Save flow:** Mark all fields touched, including per-project keys → sanitize hidden dependent fields → validate → validate project paths through IPC only when `codeSource === 'local'` → if valid, call `setSettings()` IPC → update `originalSettings`
- **Test connections:** Race IPC call against 5 s timeout → structured result
- **Auto-dismiss:** Test results clear after 5 s via `useEffect` timers
- **Categories helpers:** `categoriesToText` (join with `\n`), `textToCategories` (split, trim, deduplicate)
- **Project registry:** Adds rows with `crypto.randomUUID()`, updates rows by `id`, removes rows, and marks only the touched project sub-fields that actually changed.
- **Privileged helpers:** Exposes `checkAgentBinary()` and `selectDirectory()` as thin wrappers over the preload bridge.

## Sanitization Helper

```typescript
function sanitizeSettingsBeforeSave(settings: AppSettings): AppSettings
```

This helper clears hidden dependent fields before validation and persistence so stale BYOK or manual-agent secrets do not survive provider-mode changes.

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
  categories: [],
  agentProvider: 'none',
  agentApiKey: '',
  agentModel: '',
  copilotByokEnabled: false,
  copilotByokProvider: undefined,
  copilotByokApiKey: '',
  projects: [],
  architectureContext: '',
  maxConcurrentSessions: 1,
  codeSource: 'local'
}
```

## FT-08 Notes

- `useSettings` now treats generic-provider fields as part of the normal form state rather than branching on a Copilot-only authentication mode.
- The hook preserves `baseUrl` and `llmModel` values when users switch providers, because it stores the full `AppSettings` object and only changes the targeted field.

## FT-14A Notes

- `projects:get` / `projects:set` exist in the preload bridge, but the current Settings surface still persists the registry through the full `settings:set` flow so the entire form remains atomic.
- Project path validation is intentionally deferred to save time because the renderer is not allowed to hit `fs` directly.
- Per-project validation visibility uses synthetic touched keys such as `project-0-path`.

## FT-14G Notes

- `DEFAULT_SETTINGS` now includes `codeSource: 'local'`, which preserves pre-FT-14G behavior for fresh renderer state.
- The save flow no longer calls the privileged path-validation IPC when `codeSource === 'mcp-repos'`, which keeps the Settings experience aligned with the optional `ProjectEntry.path` contract.
- The hook still persists one unified `AppSettings` object, so switching between local and MCP-repos mode does not require a separate project-registry store.

## Dependencies

- [[wiki/entities/validation-utils]] — `validateSettings()`, `isSettingsValid()`
- [[wiki/entities/preload-bridge]] — `window.electronAPI` (settings load/save, test connections, path validation, binary check, directory picker)
- [[wiki/entities/shared-types]] — `AppSettings`

## See also

- [[wiki/entities/settings-page]] — consumer
- [[wiki/entities/project-registry]]
- [[wiki/concepts/agent-provider-auto-derivation]]
- [[wiki/concepts/code-source-selection-for-agent-analysis]]
- [[wiki/concepts/settings-sanitization-before-save]]
- [[wiki/concepts/dynamic-collection-touched-state]]
- [[wiki/concepts/form-validation-pattern]]
- [[wiki/concepts/settings-persistence-flow]]
