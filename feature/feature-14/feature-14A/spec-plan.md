# Spec-Planner — Iteration 1

## Feature Context

- **Feature:** Fondazione Settings, Project Registry e schema dati Agent Sessions
- **Feature #:** FT-14A
- **Feature Type:** full-stack

---

## Part 1: Requirements

### Functional Requirements

#### Agent Provider Configuration

- **FR-CFG-001:** Extend `AppSettings` with agent-specific fields
  - Description: Add `agentProvider`, `agentApiKey`, `agentModel`, `copilotByokEnabled`, `copilotByokProvider`, `copilotByokApiKey`, `projects`, `architectureContext`, `maxConcurrentSessions` to `AppSettings` without breaking existing LLM fields.
  - Acceptance Criteria: Given existing settings are persisted, When the app starts after migration, Then all existing fields retain their values AND new fields have safe defaults.
  - Priority: Must-Have

- **FR-CFG-002:** Derive agent provider automatically from `llmProvider` when applicable
  - Description: When `llmProvider = 'anthropic'`, agent provider is implicitly `'claude-sdk'`. When `llmProvider = 'openai'`, agent provider is implicitly `'codex-sdk'`. For all other providers, user picks from a dropdown (`'claude-sdk' | 'codex-sdk' | 'copilot-sdk' | 'none'`). The derived value must be reflected in persisted `agentProvider`.
  - Acceptance Criteria: Given `llmProvider` changes to `'anthropic'`, When the settings card re-renders, Then `agentProvider` shows "Claude Code SDK (automatico)" with no dropdown AND `agentProvider` value is `'claude-sdk'` in state.
  - Priority: Must-Have

- **FR-CFG-003:** Expose conditional API key / model fields for manual agent provider
  - Description: When `agentProvider` is explicit (not auto-derived), show `agentApiKey` and `agentModel` fields. When `agentProvider = 'none'`, hide all agent sub-fields except the dropdown.
  - Acceptance Criteria: Given `llmProvider = 'gemini'` and user selects `agentProvider = 'claude-sdk'`, When the card renders, Then `agentApiKey` and `agentModel` inputs are visible.
  - Priority: Must-Have

- **FR-CFG-004:** Support Copilot BYOK toggle
  - Description: When `agentProvider = 'copilot-sdk'` (either auto-derived or manual), show a toggle `copilotByokEnabled`. When ON, show `copilotByokProvider` (LLM provider dropdown) and `copilotByokApiKey`. When OFF, hide both.
  - Acceptance Criteria: Given `agentProvider = 'copilot-sdk'` and `copilotByokEnabled = true`, When the card renders, Then BYOK provider and API key fields are visible.
  - Priority: Must-Have

- **FR-CFG-005:** Verify Codex CLI installation via IPC
  - Description: When the derived or selected agent provider is `'codex-sdk'`, show a "Verifica installazione CLI" button that calls a new IPC handler `agent:check-binary`. The handler runs `codex --version` and returns `{ installed: boolean; version?: string; error?: string }`.
  - Acceptance Criteria: Given Codex is installed, When the user clicks "Verifica installazione CLI", Then the button shows the detected version string. Given Codex is not installed, Then the button shows an error message.
  - Priority: Must-Have

#### Project Registry

- **FR-PRJ-001:** CRUD for project entries
  - Description: User can add, edit, and remove `ProjectEntry` items. Each entry has: `id` (UUID), `name` (max 60 chars), `path` (absolute filesystem path), `type` (`'backend' | 'frontend' | 'shared'`), `description` (max 300 chars), `keywords` (string array). Projects are stored in `AppSettings.projects`.
  - Acceptance Criteria: Given the user adds a project with valid fields, When they save settings and reload, Then the project appears in the registry with all fields preserved.
  - Priority: Must-Have

- **FR-PRJ-002:** Folder browser dialog for project path
  - Description: Each project entry's path field has a folder-picker button (📁) that opens an Electron `dialog.showOpenDialog` with `properties: ['openDirectory']`. The selected path populates the field.
  - Acceptance Criteria: Given the user clicks the folder picker, When they select a directory, Then the path input is populated with the absolute path.
  - Priority: Must-Have

- **FR-PRJ-003:** Validate project path at save time
  - Description: When the user saves settings, each project's `path` is checked for existence (via IPC or renderer-side validation note). A non-existent path produces a visible error and blocks save.
  - Acceptance Criteria: Given a project has path `/nonexistent`, When the user tries to save, Then the save is blocked AND the path field shows "Directory does not exist".
  - Priority: Must-Have

- **FR-PRJ-004:** Validate project field constraints
  - Description: `name` required & max 60 chars. `description` max 300 chars. `keywords` individual keyword max 30 chars. At least one project is not required (empty registry is valid).
  - Acceptance Criteria: Given a project name exceeds 60 chars, When the user blurs the field, Then an inline error appears.
  - Priority: Must-Have

#### Architecture Context & Concurrency

- **FR-ARC-001:** Architecture context textarea
  - Description: A `textarea` field in the Agent Sessions settings section, mapped to `AppSettings.architectureContext`. Max 1000 chars with character counter.
  - Acceptance Criteria: Given the user types 1001 characters, When validation runs, Then an error blocks save AND the counter shows 1001/1000 in red.
  - Priority: Must-Have

- **FR-CON-001:** Max concurrent sessions input
  - Description: A numeric input for `AppSettings.maxConcurrentSessions`, constrained to integer range 1–5. Default: 1.
  - Acceptance Criteria: Given the user enters 6, When validation runs, Then an error "Must be between 1 and 5" appears.
  - Priority: Must-Have

#### Store Migration

- **FR-MIG-001:** Schema version 4 migration
  - Description: Add migration v4 that backfills new `AppSettings` fields with defaults: `agentProvider = 'none'`, `agentApiKey = ''`, `agentModel = ''`, `copilotByokEnabled = false`, `copilotByokProvider = undefined`, `copilotByokApiKey = ''`, `projects = []`, `architectureContext = ''`, `maxConcurrentSessions = 1`. Existing settings fields must be unmodified.
  - Acceptance Criteria: Given a v3 store, When migration v4 runs, Then all new fields have defaults AND all existing fields are unchanged AND `schemaVersion = 4`.
  - Priority: Must-Have

#### IPC Channels

- **FR-IPC-001:** New IPC channels for agent/project operations
  - Description: Add `agent:check-binary` (invoke → `{ installed, version?, error? }`), `projects:get` (invoke → `ProjectEntry[]`), `projects:set` (invoke with `ProjectEntry[]`), `agent:select-directory` (invoke → `string | null` via `dialog.showOpenDialog`).
  - Acceptance Criteria: Given the renderer calls `agent:check-binary`, When the handler executes, Then it returns the expected shape without crashing.
  - Priority: Must-Have

### Non-Functional Requirements

- **NFR-COMPAT-001:** All existing settings, session, and catalog data must survive migration v4 without data loss.
- **NFR-PERF-001:** Settings page load time must not increase noticeably (< 200ms added) despite new sections.
- **NFR-SEC-001:** `agentApiKey` and `copilotByokApiKey` must be stored in the same encrypted `electron-store` as `apiKey` and `pat`.
- **NFR-SEC-002:** The `agent:check-binary` handler must not allow arbitrary command execution — it runs only `codex --version`.
- **NFR-TEST-001:** All new IPC handlers and validation functions must have unit tests. New UI sections must have renderer tests for conditional rendering.

### Constraints

- Must not install any agent SDK packages (`@anthropic-ai/claude-code`, `@openai/codex-sdk`, `@github/copilot-sdk`). Those belong to FT-14B.
- Must not introduce agent session execution, session state, or session IPC events.
- Must follow existing patterns: shared types → IPC channels → preload → ipc-handlers → renderer hooks/pages.
- Store migration must integrate with existing `store-migration.ts` pattern (incrementing `CURRENT_SCHEMA_VERSION`).
- The `agent:select-directory` IPC handler must use Electron's `dialog` module — renderer cannot access Node `fs` directly.

### Assumptions

- **A-001:** `codex` CLI is on the system PATH when installed. The binary check runs `codex --version` via `child_process.execFile`.
- **A-002:** Project paths are validated for existence only (directory exists), not for git repository status or language content.
- **A-003:** The provider matrix auto-derivation is computed in the renderer (UI logic) and persisted to `agentProvider` on save — no main-process derivation logic needed.
- **A-004:** Keywords are entered as comma-separated text and split/trimmed by the renderer before storage.

### Out of Scope

- Agent session execution (runners, SDK integrations, streaming)
- MCP Azure DevOps server integration
- Prompt builder / template system
- Sessions tab / workspace UI
- Fix mode (write permissions, permission handlers)
- `@azure-devops/mcp-server` package installation

### Edge Cases

| Scenario                                                       | Expected Behavior                                                                                       | Related Requirement    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------- |
| Migration on fresh install (no prior data)                     | All settings get full defaults including new FT-14A fields                                              | FR-MIG-001             |
| `llmProvider` changes from `anthropic` to `gemini` mid-session | `agentProvider` switches from auto `claude-sdk` to dropdown; previous `agentProvider` value is replaced | FR-CFG-002             |
| User deletes all projects from registry                        | Empty `projects: []` is valid; save succeeds                                                            | FR-PRJ-001, FR-PRJ-004 |
| Project path contains spaces or unicode                        | Path validation checks existence regardless of encoding                                                 | FR-PRJ-003             |
| Codex binary check when `codex` not installed                  | Handler returns `{ installed: false, error: "..." }` — no throw                                         | FR-CFG-005             |
| User enters 0 or negative `maxConcurrentSessions`              | Validation error blocks save                                                                            | FR-CON-001             |
| BYOK toggled ON then provider changed away from copilot-sdk    | BYOK fields disappear; persisted values are cleared on save                                             | FR-CFG-004             |
| `architectureContext` with 1000 chars exactly                  | Valid — counter shows 1000/1000 in normal color                                                         | FR-ARC-001             |
| Save with one valid project and one invalid project path       | Save blocked; error shown only on the invalid project                                                   | FR-PRJ-003             |
| Store migration runs on already-v4 store                       | No-op — `migrateStore` short-circuits                                                                   | FR-MIG-001             |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 16
- **Parallelizable:** 10 (63%)
- **Execution Waves:** 5

### Execution Waves

#### Wave 1 — Shared Types & IPC Contract

**Execution:** PARALLEL

| Task ID | Type      | Title                                            | Description                            | Files                        | Depends On | Complexity |
| ------- | --------- | ------------------------------------------------ | -------------------------------------- | ---------------------------- | ---------- | ---------- |
| T-001   | IMPLEMENT | Shared types for agent config & project registry | Add new types and extend `AppSettings` | `src/shared/types.ts`        | None       | S          |
| T-002   | IMPLEMENT | IPC channel definitions                          | Add new channel constants              | `src/shared/ipc-channels.ts` | None       | S          |

#### Wave 2 — Main Process Foundation

**Execution:** PARALLEL (T-003, T-004, T-005 are independent)

| Task ID | Type      | Title                                     | Description                                                                  | Files                                              | Depends On   | Complexity |
| ------- | --------- | ----------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- | ------------ | ---------- |
| T-003   | IMPLEMENT | Store migration v4                        | Backfill new settings defaults                                               | `src/main/store-migration.ts`, `src/main/store.ts` | T-001        | M          |
| T-004   | IMPLEMENT | IPC handlers for agent/project operations | Implement `agent:check-binary`, `projects:get/set`, `agent:select-directory` | `src/main/ipc-handlers.ts`                         | T-001, T-002 | M          |
| T-005   | IMPLEMENT | Preload bridge for new channels           | Expose new IPC methods via `contextBridge`                                   | `src/preload/index.ts`, `src/preload/index.d.ts`   | T-002        | S          |

#### Wave 3 — Renderer Foundation

**Execution:** PARALLEL (T-006, T-007 are independent)

| Task ID | Type      | Title                               | Description                                                                            | Files                                   | Depends On   | Complexity |
| ------- | --------- | ----------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------- | ------------ | ---------- |
| T-006   | IMPLEMENT | Validation functions for new fields | Path existence (via IPC), text lengths, int range, project field constraints           | `src/renderer/src/lib/validation.ts`    | T-001        | M          |
| T-007   | IMPLEMENT | Extend `useSettings` hook           | Add new defaults, handle agent provider auto-derivation, dirty tracking for new fields | `src/renderer/src/hooks/useSettings.ts` | T-001, T-005 | M          |

#### Wave 4 — UI Components & Integration

**Execution:** SEQUENTIAL (T-008 → T-009 → T-010 → T-011 → T-012)

| Task ID | Type      | Title                                            | Description                                                                              | Files                                                                 | Depends On          | Complexity |
| ------- | --------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------- | ---------- |
| T-008   | IMPLEMENT | AgentProviderSection component                   | Provider matrix card with auto-derivation, dropdown, conditional fields, CLI check, BYOK | `src/renderer/src/components/settings/AgentProviderSection.tsx`       | T-006, T-007        | L          |
| T-009   | IMPLEMENT | ProjectRegistrySection component                 | Project cards with CRUD, folder browser, inline validation, keywords input               | `src/renderer/src/components/settings/ProjectRegistrySection.tsx`     | T-006, T-007        | L          |
| T-010   | IMPLEMENT | ArchitectureContextSection component             | Textarea with char counter, maxConcurrentSessions input                                  | `src/renderer/src/components/settings/ArchitectureContextSection.tsx` | T-006, T-007        | S          |
| T-011   | INTEGRATE | Wire Agent Sessions sections into SettingsPage   | Import and render new sections between LlmProviderSection and CategoriesSection          | `src/renderer/src/pages/SettingsPage.tsx`                             | T-008, T-009, T-010 | S          |
| T-012   | IMPLEMENT | Extend validateSettings for full save validation | Integrate new field validations into the existing `validateSettings` function            | `src/renderer/src/lib/validation.ts`                                  | T-008, T-009, T-010 | S          |

#### Wave 5 — Tests

**Execution:** PARALLEL

| Task ID | Type | Title                                        | Description                                                                    | Files                                               | Depends On                 | Complexity |
| ------- | ---- | -------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------- | -------------------------- | ---------- |
| T-013   | TEST | Store migration v4 tests                     | Test backfill from v3, fresh install, idempotency                              | `tests/main/store-migration-v4.spec.ts`             | T-003                      | M          |
| T-014   | TEST | IPC handler tests for agent/project channels | Test `agent:check-binary`, `projects:get/set`, `agent:select-directory`        | `tests/main/ipc-handlers.spec.ts` (extend)          | T-004                      | M          |
| T-015   | TEST | Validation function tests for new fields     | Test path, text length, range, project constraints                             | `tests/renderer/validation.spec.ts` (extend or new) | T-006, T-012               | M          |
| T-016   | TEST | Settings UI conditional rendering tests      | Test provider matrix display, BYOK toggle, project CRUD, CLI check interaction | `tests/renderer/AgentSettingsSection.spec.tsx`      | T-008, T-009, T-010, T-011 | L          |

### Critical Path

T-001 → T-007 → T-008 → T-011 → T-016 (critical path: 5 tasks)

### Task Details

#### T-001: Shared types for agent config & project registry

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Add `AgentProviderType = 'claude-sdk' | 'codex-sdk' | 'copilot-sdk' | 'none'` to `types.ts`
  2. Add `ProjectType = 'backend' | 'frontend' | 'shared'`
  3. Add `ProjectEntry` interface: `{ id: string; name: string; path: string; type: ProjectType; description: string; keywords: string[] }`
  4. Add `CopilotByokConfig` interface: `{ enabled: boolean; provider?: LLMProviderType; apiKey?: string }`
  5. Extend `AppSettings` with: `agentProvider: AgentProviderType`, `agentApiKey?: string`, `agentModel?: string`, `copilotByokEnabled?: boolean`, `copilotByokProvider?: LLMProviderType`, `copilotByokApiKey?: string`, `projects: ProjectEntry[]`, `architectureContext: string`, `maxConcurrentSessions: number`
  6. Add `BinaryCheckResult` interface: `{ installed: boolean; version?: string; error?: string }`
- **Acceptance Criteria:** Types compile without errors. Existing type references remain valid.
- **Testing Approach:** Type-checked at compile time; no dedicated test needed.
- **Output:** Updated `src/shared/types.ts`

#### T-002: IPC channel definitions

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Add to `IPC_CHANNELS`:
     - `AGENT_CHECK_BINARY: 'agent:check-binary'`
     - `AGENT_SELECT_DIRECTORY: 'agent:select-directory'`
     - `PROJECTS_GET: 'projects:get'`
     - `PROJECTS_SET: 'projects:set'`
- **Acceptance Criteria:** New constants are typed and accessible from all layers.
- **Testing Approach:** Type-checked at compile time.
- **Output:** Updated `src/shared/ipc-channels.ts`

#### T-003: Store migration v4

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Bump `CURRENT_SCHEMA_VERSION` to `4`
  2. Add migration `{ version: 4, up: (data) => ... }` that merges new default fields into `data.settings`:
     - `agentProvider: 'none'`
     - `agentApiKey: ''`
     - `agentModel: ''`
     - `copilotByokEnabled: false`
     - `copilotByokProvider: undefined`
     - `copilotByokApiKey: ''`
     - `projects: []`
     - `architectureContext: ''`
     - `maxConcurrentSessions: 1`
  3. Use spread to preserve existing settings: `{ ...existingSettings, ...newDefaults }` — only set missing keys.
  4. Update `store.ts` defaults to include new fields so fresh installs are v4-native.
- **Acceptance Criteria:** v3 store upgrades cleanly. Fresh installs have all new defaults. Existing fields unchanged.
- **Testing Approach:** Dedicated test file with v3→v4 migration scenarios.
- **Output:** Updated `src/main/store-migration.ts`, `src/main/store.ts`

#### T-004: IPC handlers for agent/project operations

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. `agent:check-binary`: Use `child_process.execFile('codex', ['--version'])` with a 5s timeout. Catch errors → `{ installed: false, error: message }`. Parse stdout → `{ installed: true, version: trimmed }`. **Do not** pass user input to the command — hardcoded `'codex'` and `'--version'` only (NFR-SEC-002).
  2. `agent:select-directory`: Use `dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), { properties: ['openDirectory'] })`. Return `result.filePaths[0] ?? null`.
  3. `projects:get`: Read from `store.get('settings')` and return `.projects ?? []`.
  4. `projects:set`: Read current settings, replace `.projects`, write back via `store.set('settings', ...)`.
- **Acceptance Criteria:** All four handlers register without errors. Binary check doesn't throw on missing `codex`. Directory dialog opens correctly.
- **Testing Approach:** Unit test with mocked `child_process`, `dialog`, `store`.
- **Output:** Updated `src/main/ipc-handlers.ts`

#### T-005: Preload bridge for new channels

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Add methods to `electronAPI` object in `preload/index.ts`:
     - `checkAgentBinary: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_CHECK_BINARY)`
     - `selectDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_SELECT_DIRECTORY)`
     - `getProjects: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_GET)`
     - `setProjects: (projects: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_SET, projects)`
  2. Update `ElectronAPI` type export accordingly.
  3. No changes needed in `index.d.ts` beyond what TypeScript infers — the `window.electronAPI` is `unknown` by convention.
- **Acceptance Criteria:** New methods exposed and typed in the preload module.
- **Testing Approach:** Covered by IPC handler integration tests.
- **Output:** Updated `src/preload/index.ts`

#### T-006: Validation functions for new fields

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Add to `validation.ts`:
     - `validateMaxLength(value: string, max: number, fieldName: string): string | null`
     - `validateProjectEntry(project: ProjectEntry): Record<string, string | null>` — validates name (required, max 60), path (required), description (max 300), keywords (each max 30 chars)
     - `validateArchitectureContext(value: string): string | null` — max 1000 chars
     - `validateMaxConcurrentSessions(value: number): string | null` — reuse `validateIntRange(value, 1, 5, ...)`
  2. Path existence validation will be handled via IPC at save time (not in pure validation) — the sync validator flags only empty paths.
  3. Keep existing functions untouched.
- **Acceptance Criteria:** Each validator returns `null` for valid input and a descriptive error string for invalid input.
- **Testing Approach:** Unit tests in renderer test suite.
- **Output:** Updated `src/renderer/src/lib/validation.ts`

#### T-007: Extend `useSettings` hook

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Update `DEFAULT_SETTINGS` with new fields: `agentProvider: 'none'`, `agentApiKey: ''`, `agentModel: ''`, `copilotByokEnabled: false`, `copilotByokProvider: undefined`, `copilotByokApiKey: ''`, `projects: []`, `architectureContext: ''`, `maxConcurrentSessions: 1`.
  2. Add auto-derivation effect: when `settings.llmProvider` changes, compute and set `agentProvider`:
     - `'anthropic'` → set `agentProvider = 'claude-sdk'`
     - `'openai'` → set `agentProvider = 'codex-sdk'`
     - other → keep current `agentProvider` (user-managed)
  3. Add project CRUD helpers to the return interface:
     - `addProject: (project: ProjectEntry) => void`
     - `updateProject: (id: string, updates: Partial<ProjectEntry>) => void`
     - `removeProject: (id: string) => void`
  4. These helpers operate on `settings.projects` via `updateField('projects', ...)`.
  5. Add `checkAgentBinary: () => Promise<BinaryCheckResult>` that calls `window.electronAPI.checkAgentBinary()`.
  6. Add `selectDirectory: () => Promise<string | null>` that calls `window.electronAPI.selectDirectory()`.
  7. Extend `UseSettingsReturn` with these new members.
- **Acceptance Criteria:** Hook returns all new fields and helpers. Auto-derivation fires on `llmProvider` change.
- **Testing Approach:** Covered by renderer integration tests.
- **Output:** Updated `src/renderer/src/hooks/useSettings.ts`

#### T-008: AgentProviderSection component

- **Type:** IMPLEMENT
- **Wave:** 4 — SEQUENTIAL
- **Implementation Notes:**
  1. Create `AgentProviderSection.tsx` in `src/renderer/src/components/settings/`.
  2. Accept props similar to other sections: `settings`, `errors`, `touched`, `onFieldChange`, plus `onCheckBinary`, `binaryCheckResult`, `binaryCheckLoading`.
  3. Render a card with header "Agent Sessions" and icon (e.g., `Terminal` from lucide).
  4. **Provider display logic:**
     - If `llmProvider = 'anthropic'`: show read-only badge "Claude Code SDK (automatico)" — no dropdown.
     - If `llmProvider = 'openai'`: show read-only badge "Codex CLI (automatico)" + "Verifica installazione CLI" button.
     - Otherwise: show `<Select>` with options: Claude Code SDK, Codex CLI, Copilot SDK, Nessuno.
  5. **Conditional fields** (visible when `agentProvider !== 'none'` and not auto-derived to `anthropic`/`openai`):
     - `agentApiKey` (password input with toggle)
     - `agentModel` (text input)
  6. **BYOK section** (visible when `agentProvider = 'copilot-sdk'`):
     - Toggle `copilotByokEnabled`
     - When ON: `copilotByokProvider` dropdown + `copilotByokApiKey` input
  7. **Codex CLI check button:**
     - Visible when derived/selected provider is `'codex-sdk'`
     - Shows loading spinner during check, then success/error result
- **Acceptance Criteria:** Provider matrix renders correctly for all `llmProvider` values. BYOK toggle shows/hides fields. CLI check invokes IPC.
- **Testing Approach:** Renderer test with mocked `window.electronAPI`.
- **Output:** New `src/renderer/src/components/settings/AgentProviderSection.tsx`

#### T-009: ProjectRegistrySection component

- **Type:** IMPLEMENT
- **Wave:** 4 — SEQUENTIAL
- **Implementation Notes:**
  1. Create `ProjectRegistrySection.tsx` in `src/renderer/src/components/settings/`.
  2. Accept props: `projects: ProjectEntry[]`, `onAddProject`, `onUpdateProject`, `onRemoveProject`, `onSelectDirectory`, `errors` (per-project).
  3. Render a card with header "Progetti registrati" and an "Aggiungi progetto" button.
  4. Each project renders as a sub-card with:
     - `name` input (max 60 chars)
     - `path` input + 📁 folder browser button (calls `onSelectDirectory`)
     - `type` radio group: Backend / Frontend / Shared
     - `description` textarea (max 300 chars)
     - `keywords` input (comma-separated, rendered as tags)
     - Remove button (with confirmation or undo affordance)
  5. Inline validation errors shown per field.
  6. New projects get a generated UUID `id`.
- **Acceptance Criteria:** User can add/edit/remove projects. Folder dialog populates path. Validation errors appear inline.
- **Testing Approach:** Renderer test for CRUD interactions and validation display.
- **Output:** New `src/renderer/src/components/settings/ProjectRegistrySection.tsx`

#### T-010: ArchitectureContextSection component

- **Type:** IMPLEMENT
- **Wave:** 4 — SEQUENTIAL
- **Implementation Notes:**
  1. Create `ArchitectureContextSection.tsx` in `src/renderer/src/components/settings/`.
  2. Accept props: `settings`, `errors`, `touched`, `onFieldChange`.
  3. Render:
     - `architectureContext` textarea with char counter (e.g., "342 / 1000") — counter turns red at limit.
     - `maxConcurrentSessions` number input with label and validation error.
  4. Keep it simple — just the two fields in a small card.
- **Acceptance Criteria:** Character counter updates live. Validation errors display for both fields.
- **Testing Approach:** Covered by integration renderer test.
- **Output:** New `src/renderer/src/components/settings/ArchitectureContextSection.tsx`

#### T-011: Wire Agent Sessions sections into SettingsPage

- **Type:** INTEGRATE
- **Wave:** 4 — SEQUENTIAL
- **Implementation Notes:**
  1. Import `AgentProviderSection`, `ProjectRegistrySection`, `ArchitectureContextSection` in `SettingsPage.tsx`.
  2. Place them after `LlmProviderSection` and before `CategoriesSection`.
  3. Pass appropriate props from `useSettings()` return value.
  4. Add state for `binaryCheckResult` and `binaryCheckLoading` in the page (or in the hook).
  5. Wire `selectDirectory` to `ProjectRegistrySection`'s folder browser.
- **Acceptance Criteria:** New sections appear on the settings page in correct order. All interactions work end-to-end within the settings flow.
- **Testing Approach:** Visual verification + renderer test.
- **Output:** Updated `src/renderer/src/pages/SettingsPage.tsx`

#### T-012: Extend validateSettings for full save validation

- **Type:** IMPLEMENT
- **Wave:** 4 — SEQUENTIAL
- **Implementation Notes:**
  1. Update `validateSettings()` to include:
     - `architectureContext: validateArchitectureContext(settings.architectureContext)`
     - `maxConcurrentSessions: validateMaxConcurrentSessions(settings.maxConcurrentSessions)`
  2. Add project-level validation: iterate `settings.projects` and call `validateProjectEntry` for each. Collect errors keyed by `project-{index}-{field}`.
  3. Update `isSettingsValid` to account for project-level errors.
  4. Agent API key validation: required only when `agentProvider !== 'none'` and the provider is not auto-derived from `anthropic`/`openai` (those reuse the main API key).
- **Acceptance Criteria:** `validateSettings` returns errors for all new fields. `isSettingsValid` blocks save when any project field is invalid.
- **Testing Approach:** Covered by validation unit tests.
- **Output:** Updated `src/renderer/src/lib/validation.ts`

#### T-013: Store migration v4 tests

- **Type:** TEST
- **Wave:** 5 — PARALLEL
- **Implementation Notes:**
  1. Create `tests/main/store-migration-v4.spec.ts`.
  2. Test scenarios:
     - v3 store with only legacy settings → v4 adds all new defaults
     - v3 store with existing `apiKey`, `pat`, `categories` → those fields preserved after migration
     - Fresh store (no schema version) → full migration chain produces valid v4 state
     - v4 store → migration is no-op
  3. Use the same `StoreAccess` mock pattern as existing migration tests.
- **Acceptance Criteria:** All migration scenarios pass.
- **Testing Approach:** Unit tests in Node runtime.
- **Output:** New `tests/main/store-migration-v4.spec.ts`

#### T-014: IPC handler tests for agent/project channels

- **Type:** TEST
- **Wave:** 5 — PARALLEL
- **Implementation Notes:**
  1. Extend existing `tests/main/ipc-handlers.spec.ts` or create a focused file.
  2. Test:
     - `agent:check-binary` with mocked `execFile` returning version string → `{ installed: true, version: '...' }`
     - `agent:check-binary` with mocked `execFile` throwing → `{ installed: false, error: '...' }`
     - `agent:select-directory` with mocked `dialog.showOpenDialog` returning a path
     - `agent:select-directory` with cancelled dialog → `null`
     - `projects:get` reads from store
     - `projects:set` writes to store and returns
  3. Mock `child_process.execFile`, `electron.dialog`, `store`.
- **Acceptance Criteria:** All handler behaviors are tested for success and failure paths.
- **Testing Approach:** Unit tests in Node runtime with Electron mocks.
- **Output:** Updated or new file in `tests/main/`

#### T-015: Validation function tests for new fields

- **Type:** TEST
- **Wave:** 5 — PARALLEL
- **Implementation Notes:**
  1. Extend existing renderer validation test file or create `tests/renderer/validation-agent.spec.ts`.
  2. Test:
     - `validateMaxLength` with under, at, and over limit
     - `validateProjectEntry` with valid data, missing name, long name, empty path, long description, long keyword
     - `validateArchitectureContext` with empty, 1000 chars, 1001 chars
     - `validateMaxConcurrentSessions` with 0, 1, 5, 6, non-integer
     - Updated `validateSettings` with new fields present and absent
  3. Run in jsdom runtime.
- **Acceptance Criteria:** All validation edge cases covered.
- **Testing Approach:** Unit tests in jsdom runtime.
- **Output:** New or extended file in `tests/renderer/`

#### T-016: Settings UI conditional rendering tests

- **Type:** TEST
- **Wave:** 5 — PARALLEL
- **Implementation Notes:**
  1. Create `tests/renderer/AgentSettingsSection.spec.tsx`.
  2. Test scenarios:
     - With `llmProvider = 'anthropic'`: Claude SDK badge visible, no dropdown, no agent API key field
     - With `llmProvider = 'openai'`: Codex badge visible, CLI check button visible
     - With `llmProvider = 'gemini'`: dropdown visible with 4 options
     - BYOK toggle: ON shows sub-fields, OFF hides them
     - Project CRUD: add project → card appears; remove → card disappears
     - Project validation: invalid path shows error
     - Architecture context: counter at limit turns red
     - Max concurrent sessions: out-of-range shows error
  3. Mock `window.electronAPI` for all IPC calls.
- **Acceptance Criteria:** All conditional rendering paths are verified.
- **Testing Approach:** Renderer component tests in jsdom.
- **Output:** New `tests/renderer/AgentSettingsSection.spec.tsx`

### Risk Register

| Risk                                                                    | Impact | Likelihood | Mitigation                                                                                                         |
| ----------------------------------------------------------------------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| Store migration v4 corrupts existing settings                           | High   | Low        | Thorough migration tests (T-013); spread preserves existing keys; migration runs in try/catch with fallback        |
| `codex --version` hangs on some systems                                 | Medium | Medium     | 5s timeout on `execFile`; non-blocking — user can dismiss and proceed                                              |
| Settings page becomes too long/dense                                    | Medium | Medium     | Dedicated card components with clear visual hierarchy; sections collapsible in future                              |
| `dialog.showOpenDialog` behaves differently across OS                   | Low    | Low        | Use Electron's cross-platform dialog API; test on Windows (primary target)                                         |
| Auto-derivation logic causes unexpected `agentProvider` changes on save | Medium | Medium     | Derivation only fires on `llmProvider` change in the hook, not on every render; persisted value is always explicit |
| Large number of projects (>10) slows settings page                      | Low    | Low        | No pagination needed for v1; project count expected to be small (2-5)                                              |

---

### Completeness Assessment

- Functional coverage: **High** — All 6 FR-CONFIG + 4 FR-PRJ + FR-ARC + FR-CON + FR-MIG + FR-IPC requirements mapped to tasks.
- Non-functional coverage: **High** — Security (encrypted store, hardcoded binary check), compatibility (migration tests), performance (no heavy operations).
- Task-to-requirement mapping: **Complete** — Every requirement has at least one implementing task and one test task.

### Status

**READY FOR APPROVAL**
