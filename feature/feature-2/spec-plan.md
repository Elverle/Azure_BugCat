## Spec-Planner — Iteration 1

### Feature Context

- **Feature:** Pagina Settings e Persistenza Configurazione
- **Feature #:** feature-2
- **Feature ID:** FT-02
- **Feature Type:** full-stack (Electron Main Process + React Renderer)
- **Priority:** Critica
- **Dependencies:** FT-01 (completed)

---

## Part 1: Requirements

### Functional Requirements

#### FR-FORM — Settings Form Fields

- **FR-FORM-001:** Azure DevOps Organization URL field
  - Description: Text input for ADO organization URL with real-time validation. Must accept `https://dev.azure.com/{org}` or `https://{org}.visualstudio.com` formats.
  - Acceptance Criteria: Given the user types a URL, when the URL does not match the accepted formats, then a validation error is shown inline. Given a valid URL, when the field loses focus, then no error is displayed.
  - Priority: Must-Have

- **FR-FORM-002:** Project Name field
  - Description: Text input for ADO project name. Must not be empty.
  - Acceptance Criteria: Given the user leaves the field empty, when they attempt to save, then a "required" validation error is shown. Given a non-empty value, then no error.
  - Priority: Must-Have

- **FR-FORM-003:** Saved Query ID field
  - Description: Text input for ADO saved query ID. Must match UUID format (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
  - Acceptance Criteria: Given the user enters a non-UUID string, when validated, then an inline error "Invalid UUID format" is shown. Given a valid UUID, then no error.
  - Priority: Must-Have

- **FR-FORM-004:** Top N bugs field
  - Description: Numeric input for max bugs to fetch. Integer, range 1–200, default 20.
  - Acceptance Criteria: Given the user enters 0, 201, or a non-integer, when validated, then an inline error is shown. Given a value in range, then no error. Given the field is empty on first load, then the default value 20 is pre-filled.
  - Priority: Must-Have

- **FR-FORM-005:** LLM Provider select
  - Description: Dropdown select with options: OpenAI, Anthropic Claude, GitHub Copilot, Gemini. Default: `openai`.
  - Acceptance Criteria: Given the user changes the provider, when the selection changes, then the API Key section updates accordingly (FR-FORM-006). The selected value persists on save.
  - Priority: Must-Have

- **FR-FORM-006:** API Key field (conditional)
  - Description: Password-type input for LLM API key. Shown for `openai`, `anthropic`, `gemini` providers. Hidden when `github-copilot` is selected. Has a visibility toggle button (eye icon). Required when visible.
  - Acceptance Criteria: Given the provider is `openai`, when the API key field is empty, then validation prevents save. Given the provider is `github-copilot`, then the API key field is hidden and a Copilot auth status badge is shown instead.
  - Priority: Must-Have

- **FR-FORM-007:** GitHub Copilot auth status display
  - Description: When `github-copilot` provider is selected, display a read-only auth status badge (Authenticated / Unauthenticated / Unknown) instead of an API key field. The status value comes from `AppSettings.copilotAuthStatus`.
  - Acceptance Criteria: Given the provider is `github-copilot`, when the settings load, then the auth status badge is displayed with the current status. The user cannot manually edit this field.
  - Priority: Must-Have

- **FR-FORM-008:** PAT Azure DevOps field
  - Description: Password-type input for Azure DevOps Personal Access Token. Has a visibility toggle (eye icon). Required, non-empty.
  - Acceptance Criteria: Given the PAT field is empty, when the user attempts to save, then a validation error is shown. The field masks input by default and reveals on toggle.
  - Priority: Must-Have

- **FR-FORM-009:** Chunk Size field
  - Description: Numeric input for LLM categorization chunk size. Integer, range 5–30, default 15.
  - Acceptance Criteria: Given the user enters 4, 31, or a non-integer, when validated, then an inline error is shown. Default value 15 is pre-filled on first load.
  - Priority: Must-Have

#### FR-CAT — Categories Management

- **FR-CAT-001:** Categories editor
  - Description: Textarea where each line represents one category (flat list of strings). Categories are trimmed and deduplicated on save. Empty lines are ignored.
  - Acceptance Criteria: Given the user enters categories separated by newlines, when saved, then the `categories` array in AppSettings contains the trimmed, deduplicated, non-empty values. Given the textarea is empty, then `categories` is saved as `[]`.
  - Priority: Must-Have

- **FR-CAT-002:** Reset categories to default
  - Description: A "Reset" button that clears the categories textarea. Shows a confirmation prompt before clearing.
  - Acceptance Criteria: Given the user clicks "Reset to default", when they confirm, then the textarea is cleared. Given they cancel, then no change occurs.
  - Priority: Must-Have

- **FR-CAT-003:** Auto-categorization UX note
  - Description: A visible info note below the categories textarea: "When categories are empty, the LLM will auto-generate categories based on the bugs."
  - Acceptance Criteria: Given the categories section is visible, then the info note is always displayed.
  - Priority: Must-Have

#### FR-PERSIST — Persistence & IPC

- **FR-PERSIST-001:** Load settings on mount
  - Description: When the SettingsPage mounts, invoke `window.electronAPI.getSettings()` via IPC to load current settings from electron-store and populate all form fields.
  - Acceptance Criteria: Given settings were previously saved, when the SettingsPage loads, then all fields are populated with the stored values within 500ms.
  - Priority: Must-Have

- **FR-PERSIST-002:** Save settings via IPC
  - Description: When the user clicks Save, validate all fields client-side. If valid, invoke `window.electronAPI.setSettings(settings)` with the complete AppSettings object. Show success feedback on completion, error feedback on failure.
  - Acceptance Criteria: Given all fields are valid, when Save is clicked, then settings are persisted to electron-store and a success toast/banner is shown. Given validation fails, then the form scrolls to the first error and Save is blocked.
  - Priority: Must-Have

- **FR-PERSIST-003:** Dirty state tracking
  - Description: Track whether the form has unsaved changes. Enable the Save button only when there are changes AND all validations pass.
  - Acceptance Criteria: Given the form just loaded, then Save is disabled. Given the user changes a field, then Save becomes enabled (if valid). Given the user saves, then Save becomes disabled again.
  - Priority: Should-Have

#### FR-TEST — Test Connection

- **FR-TEST-001:** Test ADO Connection button
  - Description: A "Test Connection" button in the ADO section. On click, invokes `window.electronAPI.testAdoConnection()`. Shows a loading spinner during the call. Displays success or error feedback. Timeout: 5 seconds client-side.
  - Acceptance Criteria: Given the user clicks Test Connection, when the IPC call succeeds, then a green success message is shown. When the call fails or times out, then a red error message is shown with the error details. Feedback disappears after 5 seconds.
  - Priority: Must-Have

- **FR-TEST-002:** Test LLM Connection button
  - Description: A "Test Connection" button in the LLM section. On click, invokes `window.electronAPI.testLlmConnection()`. Shows a loading spinner during the call. Displays success or error feedback. Timeout: 5 seconds client-side.
  - Acceptance Criteria: Same as FR-TEST-001 but for LLM connection.
  - Priority: Must-Have

- **FR-TEST-003:** Test Connection stubs return structured response
  - Description: The Main Process IPC handlers for `ado:test-connection` and `llm:test-connection` currently throw "Not implemented". They must be updated to return a structured `{ success: boolean, message: string }` response. For FT-02, they return `{ success: false, message: "Not implemented — will be available after FT-03/FT-04" }` so the UI feedback loop works end-to-end.
  - Acceptance Criteria: Given the renderer calls testAdoConnection(), then it receives a `TestConnectionResult` object (not an exception). The UI can display the message.
  - Priority: Must-Have

#### FR-UX — User Experience

- **FR-UX-001:** Visual feedback on save
  - Description: After a successful save, display a transient success banner/toast at the top of the settings form (green background, auto-dismiss after 3 seconds). On save failure, display a persistent error banner (red background, dismissible).
  - Acceptance Criteria: Given a save succeeds, then a green "Settings saved" message appears and auto-dismisses. Given a save fails, then a red error message appears and stays until dismissed.
  - Priority: Must-Have

- **FR-UX-002:** Security note
  - Description: Display a visible info note at the top or bottom of the settings page: "Credentials are stored locally in encrypted form using machine-specific keys."
  - Acceptance Criteria: Given the settings page is visible, then the security note is always displayed.
  - Priority: Must-Have

- **FR-UX-003:** Form sections with card layout
  - Description: Group related fields into visual card sections matching the design reference: white `bg-white` cards on `bg-gray-50` background, `border-gray-200` borders, `shadow-sm`, section headings in `font-semibold text-gray-900`.
  - Acceptance Criteria: Given the settings page renders, then each section (ADO, LLM, Categories) is in a distinct card with the corporate design style.
  - Priority: Must-Have

- **FR-UX-004:** Real-time validation
  - Description: Validate fields on change (debounced) and on blur. Show inline error messages below the field in red text. Do not show errors for untouched fields on initial load.
  - Acceptance Criteria: Given a field is touched and invalid, then an error message appears below it. Given a field has never been interacted with, then no error is shown even if invalid.
  - Priority: Must-Have

### Non-Functional Requirements

- **NFR-SEC-001:** Credentials never accessible in Renderer process. All storage operations happen via IPC in the Main Process. No `nodeIntegration`, `contextIsolation` is enabled. (Already enforced by FT-01 architecture.)

- **NFR-SEC-002:** No API keys or PATs logged to console or devtools in production builds.

- **NFR-PERF-001:** Settings load and render within 500ms of navigating to the page.

- **NFR-PERF-002:** Test Connection feedback within 5 seconds (client-side timeout).

- **NFR-COMPAT-001:** No new npm dependencies. Use existing Tailwind CSS, lucide-react icons, class-variance-authority, and hand-crafted shadcn-style components.

- **NFR-MAINT-001:** Settings form validation logic extracted into a pure utility module (no React dependency) for testability.

### Constraints

1. **IPC trust boundary:** Renderer-side validation is for UX only. Main Process stores whatever it receives — no server-side validation in FT-02 scope.
2. **Test Connection stubs:** ADO and LLM actual implementations come in FT-03 and FT-04. FT-02 wires the IPC round-trip and UI feedback only.
3. **No new npm deps:** Reuse existing packages (Tailwind, lucide-react, class-variance-authority, tailwind-merge, clsx).
4. **GitHub Copilot provider:** No API key field; show auth status badge. Actual Copilot SDK integration is out of scope for FT-02.
5. **Design reference:** `content/design.html` — white cards, gray-50 bg, Inter font, border-gray-200, shadow-sm, blue-700 accents, compact density.

### Assumptions

1. The `AppSettings` interface in `src/shared/types.ts` is stable and complete for FT-02 scope.
2. `electron-store` get/set IPC handlers work correctly (verified in FT-01).
3. The preload bridge exposes all needed methods (`getSettings`, `setSettings`, `testAdoConnection`, `testLlmConnection`).
4. Default categories is an empty array (auto-categorization mode). There is no predefined set of default categories.
5. `copilotAuthStatus` defaults to `'unknown'` when no Copilot session data exists.

### Out of Scope

- Actual ADO connection testing (FT-03)
- Actual LLM connection testing / ping (FT-04)
- GitHub Copilot SDK authentication flow (FT-04)
- Main Process validation of settings (future hardening)
- Keyboard shortcuts for save (Ctrl+S)
- Settings import/export
- Settings migration between versions
- Multi-language / i18n

### Edge Cases

| Scenario | Expected Behavior | Related Requirement |
|----------|-------------------|---------------------|
| User switches from OpenAI → Copilot → OpenAI | API key value is preserved in form state across provider switches; field hides/shows accordingly | FR-FORM-005, FR-FORM-006 |
| User enters ADO org URL without trailing slash | Accept both `https://dev.azure.com/org` and `https://dev.azure.com/org/` | FR-FORM-001 |
| User enters ADO org URL with project path appended | Validation error — only the base org URL is accepted | FR-FORM-001 |
| User pastes UUID with surrounding whitespace | Trim whitespace before validation | FR-FORM-003 |
| User enters topN = 0 | Validation error: minimum is 1 | FR-FORM-004 |
| User enters topN = 200.5 | Validation error: must be integer | FR-FORM-004 |
| Categories textarea has duplicate lines | Deduplicate on save (case-sensitive) | FR-CAT-001 |
| Categories textarea has blank lines between entries | Ignore blank lines on save | FR-CAT-001 |
| IPC getSettings fails on mount | Show error banner, form fields populated with defaults | FR-PERSIST-001 |
| IPC setSettings fails | Show persistent error banner with details | FR-PERSIST-002 |
| Test Connection called with empty/invalid fields | Button is always clickable (tests current saved config); error comes from the IPC response | FR-TEST-001, FR-TEST-002 |
| User navigates away with unsaved changes | No unsaved-changes guard in FT-02 (out of scope — no router blocker) | — |
| Settings page loads for the very first time (fresh install) | All fields populated with defaults from electron-store defaults (orgUrl='', topN=20, etc.) | FR-PERSIST-001 |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 8
- **Parallelizable:** 6 (75%)
- **Execution Waves:** 4

### Execution Waves

#### Wave 1 — UI Primitives & Backend Stubs
**Execution:** PARALLEL

| Task ID | Type | Title | Description | Files | Depends On | Complexity |
|---------|------|-------|-------------|-------|------------|------------|
| T-001 | IMPLEMENT | Form UI components | Create shadcn-style Input, Label, Select, Textarea components | 4 new files | None | M |
| T-002 | IMPLEMENT | Validation utilities | Pure validation functions for all settings fields | 1 new file | None | S |
| T-003 | IMPLEMENT | TestConnectionResult type + IPC stub update | Add shared type; update IPC handlers to return structured response | 2 modified files | None | S |

#### Wave 2 — State Management Hook
**Execution:** SEQUENTIAL (depends on Wave 1)

| Task ID | Type | Title | Description | Files | Depends On | Complexity |
|---------|------|-------|-------------|-------|------------|------------|
| T-004 | IMPLEMENT | useSettings hook | Custom hook: load settings via IPC, form state, dirty tracking, validation integration, save via IPC, test connection calls | 1 new file | T-001, T-002, T-003 | M |

#### Wave 3 — Section Components
**Execution:** PARALLEL (depends on T-004)

| Task ID | Type | Title | Description | Files | Depends On | Complexity |
|---------|------|-------|-------------|-------|------------|------------|
| T-005 | IMPLEMENT | AdoConnectionSection | Card with org URL, project, query ID, PAT fields + Test Connection button | 1 new file | T-001, T-004 | M |
| T-006 | IMPLEMENT | LlmProviderSection | Card with provider select, API key / Copilot status, chunk size + Test Connection button | 1 new file | T-001, T-004 | M |
| T-007 | IMPLEMENT | CategoriesSection | Card with categories textarea, reset button, info note | 1 new file | T-001, T-004 | S |

#### Wave 4 — Page Assembly
**Execution:** SEQUENTIAL (depends on Wave 3)

| Task ID | Type | Title | Description | Files | Depends On | Complexity |
|---------|------|-------|-------------|-------|------------|------------|
| T-008 | INTEGRATE | SettingsPage assembly | Compose all sections in SettingsPage, wire save button, success/error feedback banners, security note | 1 modified file | T-004, T-005, T-006, T-007 | M |

### Critical Path

T-001 → T-004 → T-005 → T-008 (4 tasks)

### Task Details

---

#### T-001: Form UI Components
- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Files:**
  - `src/renderer/src/components/ui/input.tsx` (new)
  - `src/renderer/src/components/ui/label.tsx` (new)
  - `src/renderer/src/components/ui/select.tsx` (new)
  - `src/renderer/src/components/ui/textarea.tsx` (new)
- **Implementation Notes:**
  1. Follow the existing `button.tsx` pattern — use `React.forwardRef`, `cn()`, `cva()` (if needed, or just className merge).
  2. **Input:** Standard `<input>` wrapper with `className` for Tailwind. Props: all HTMLInputAttributes. Base style: `flex h-9 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50`. Must support `type="password"` natively.
  3. **Label:** Standard `<label>` wrapper. Style: `text-sm font-medium text-gray-700`.
  4. **Select:** Standard `<select>` wrapper. Style consistent with Input. Props: all HTMLSelectAttributes.
  5. **Textarea:** Standard `<textarea>` wrapper. Style consistent with Input but with `min-h-[80px] resize-y`.
  6. All components use `cn()` from `@renderer/lib/utils` for className merging.
- **Acceptance Criteria:**
  - Each component renders correctly with default styles.
  - Each component accepts and merges custom `className` prop.
  - Each component forwards refs.
- **Testing Approach:** Visual verification in dev mode.
- **Output:** 4 component files in `components/ui/`.

---

#### T-002: Validation Utilities
- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Files:**
  - `src/renderer/src/lib/validation.ts` (new)
- **Implementation Notes:**
  1. Pure functions (no React imports) for testability.
  2. Functions to implement:
     - `validateOrgUrl(url: string): string | null` — Returns error message or null. Accepts `https://dev.azure.com/{org}` or `https://{org}.visualstudio.com` (with or without trailing slash). Rejects other URLs.
     - `validateRequired(value: string, fieldName: string): string | null` — Non-empty after trim.
     - `validateUUID(value: string): string | null` — Matches `^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$` after trim.
     - `validateIntRange(value: number, min: number, max: number, fieldName: string): string | null` — Must be integer in [min, max].
     - `validateApiKey(value: string | undefined, provider: LLMProviderType): string | null` — Required when provider is not `github-copilot`.
     - `validateSettings(settings: AppSettings): Record<string, string | null>` — Runs all validators, returns map of `{ fieldName: errorMessage | null }`.
     - `isSettingsValid(errors: Record<string, string | null>): boolean` — Returns true if all values are null.
  3. Import `LLMProviderType` and `AppSettings` from `@shared/types`.
- **Acceptance Criteria:**
  - `validateOrgUrl('https://dev.azure.com/myorg')` returns `null`.
  - `validateOrgUrl('https://myorg.visualstudio.com/')` returns `null`.
  - `validateOrgUrl('http://dev.azure.com/org')` returns an error (not HTTPS).
  - `validateOrgUrl('https://example.com')` returns an error.
  - `validateUUID('550e8400-e29b-41d4-a716-446655440000')` returns `null`.
  - `validateUUID('not-a-uuid')` returns an error.
  - `validateIntRange(20, 1, 200, 'topN')` returns `null`.
  - `validateIntRange(0, 1, 200, 'topN')` returns an error.
  - `validateIntRange(20.5, 1, 200, 'topN')` returns an error.
  - `validateApiKey('', 'openai')` returns an error.
  - `validateApiKey(undefined, 'github-copilot')` returns `null`.
- **Testing Approach:** Unit-testable pure functions. Can add test file in future if needed.
- **Output:** 1 utility file.

---

#### T-003: TestConnectionResult Type + IPC Stub Update
- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Files:**
  - `src/shared/types.ts` (modify — add `TestConnectionResult` interface)
  - `src/main/ipc-handlers.ts` (modify — update ADO and LLM test connection handlers)
- **Implementation Notes:**
  1. Add to `src/shared/types.ts`:
     ```ts
     export interface TestConnectionResult {
       success: boolean
       message: string
     }
     ```
  2. In `src/main/ipc-handlers.ts`, replace the `throw new Error('Not implemented — FT-03')` for `ADO_TEST_CONNECTION` with:
     ```ts
     ipcMain.handle(IPC_CHANNELS.ADO_TEST_CONNECTION, (): TestConnectionResult => {
       return { success: false, message: 'ADO connection test not yet implemented (FT-03)' }
     })
     ```
  3. Same for `LLM_TEST_CONNECTION`:
     ```ts
     ipcMain.handle(IPC_CHANNELS.LLM_TEST_CONNECTION, (): TestConnectionResult => {
       return { success: false, message: 'LLM connection test not yet implemented (FT-04)' }
     })
     ```
  4. This ensures the Renderer receives a structured response instead of an IPC error, enabling the UI feedback loop.
- **Acceptance Criteria:**
  - Calling `window.electronAPI.testAdoConnection()` returns `{ success: false, message: '...' }` without throwing.
  - Calling `window.electronAPI.testLlmConnection()` returns `{ success: false, message: '...' }` without throwing.
- **Testing Approach:** Manual IPC round-trip test in dev mode console.
- **Output:** 2 modified files.

---

#### T-004: useSettings Hook
- **Type:** IMPLEMENT
- **Wave:** 2 — SEQUENTIAL
- **Files:**
  - `src/renderer/src/hooks/useSettings.ts` (new)
- **Implementation Notes:**
  1. Custom React hook that encapsulates all settings state management.
  2. **State:**
     - `settings: AppSettings` — current form values
     - `originalSettings: AppSettings` — values as loaded from store (for dirty comparison)
     - `errors: Record<string, string | null>` — validation errors per field
     - `touched: Record<string, boolean>` — which fields have been interacted with
     - `loading: boolean` — true during initial load
     - `saving: boolean` — true during save IPC call
     - `saveResult: { type: 'success' | 'error', message: string } | null` — feedback after save
     - `testAdoResult: { type: 'success' | 'error', message: string, loading: boolean }`
     - `testLlmResult: { type: 'success' | 'error', message: string, loading: boolean }`
  3. **On mount:** Call `window.electronAPI.getSettings()`, populate `settings` and `originalSettings`. Set `loading = false`. On error: populate defaults, show error.
  4. **Field update:** `updateField(field: keyof AppSettings, value: unknown)` — updates `settings[field]`, marks field as `touched`, runs `validateSettings()` and updates `errors`.
  5. **Dirty check:** `isDirty` computed by shallow-comparing `settings` vs `originalSettings` (JSON.stringify for simplicity, given small object).
  6. **Save:** `save()` async — runs full validation, if valid calls `window.electronAPI.setSettings(settings)`, updates `originalSettings` on success, sets `saveResult`.
  7. **Test connections:**
     - `testAdoConnection()` — calls `window.electronAPI.testAdoConnection()`, with 5-second timeout via `Promise.race`. Updates `testAdoResult`.
     - `testLlmConnection()` — same pattern for LLM.
  8. **canSave:** `isDirty && isSettingsValid(errors) && !saving`
  9. **Categories helpers:**
     - `categoriesToText(categories: string[]): string` — join with newline
     - `textToCategories(text: string): string[]` — split by newline, trim, filter empty, deduplicate
     - `resetCategories()` — sets categories to `[]`
  10. **Return value:** `{ settings, errors, touched, loading, saving, saveResult, isDirty, canSave, updateField, save, clearSaveResult, testAdoConnection, testAdoResult, testLlmConnection, testLlmResult, resetCategories, categoriesToText, textToCategories }`
- **Acceptance Criteria:**
  - Hook loads settings from IPC on mount and populates form state.
  - `updateField` updates the correct field and triggers validation.
  - `isDirty` is true after a change, false after save.
  - `save()` calls IPC and returns success/error.
  - `canSave` is false when form is pristine or has validation errors.
  - Test connection calls return structured results with timeout handling.
- **Testing Approach:** Integration test by using the hook in SettingsPage.
- **Output:** 1 hook file.

**Exported interface for downstream tasks (T-005, T-006, T-007, T-008):**
```ts
interface UseSettingsReturn {
  settings: AppSettings
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  loading: boolean
  saving: boolean
  saveResult: { type: 'success' | 'error'; message: string } | null
  isDirty: boolean
  canSave: boolean
  updateField: (field: keyof AppSettings, value: unknown) => void
  save: () => Promise<void>
  clearSaveResult: () => void
  testAdoConnection: () => Promise<void>
  testAdoResult: { type: 'success' | 'error'; message: string } | null
  testAdoLoading: boolean
  testLlmConnection: () => Promise<void>
  testLlmResult: { type: 'success' | 'error'; message: string } | null
  testLlmLoading: boolean
  resetCategories: () => void
  categoriesToText: (categories: string[]) => string
  textToCategories: (text: string) => string[]
}
```

---

#### T-005: AdoConnectionSection Component
- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Files:**
  - `src/renderer/src/components/settings/AdoConnectionSection.tsx` (new)
- **Implementation Notes:**
  1. White card component (design: `bg-white rounded-lg border border-gray-200 shadow-sm p-6`).
  2. Section heading: "Azure DevOps Connection" with `Database` icon from lucide-react.
  3. Fields (using UI components from T-001):
     - Organization URL (`Input`, type="url")
     - Project Name (`Input`, type="text")
     - Saved Query ID (`Input`, type="text", placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx")
     - Top N Bugs (`Input`, type="number", min=1, max=200)
     - PAT (`Input`, type="password" with eye toggle button for visibility)
  4. Each field has a `Label` above and inline error text below (red-500, text-xs) shown only when `touched[field] && errors[field]`.
  5. "Test Connection" button (outline variant) at the bottom of the card. Shows spinner during `testAdoLoading`, result message after completion (green-600 for success, red-600 for error).
  6. **Props interface:**
     ```ts
     interface AdoConnectionSectionProps {
       settings: AppSettings
       errors: Record<string, string | null>
       touched: Record<string, boolean>
       onFieldChange: (field: keyof AppSettings, value: unknown) => void
       onTestConnection: () => Promise<void>
       testResult: { type: 'success' | 'error'; message: string } | null
       testLoading: boolean
     }
     ```
  7. Eye toggle for PAT: local `useState<boolean>` for `showPat`, toggles input type between "password" and "text". Toggle button uses `Eye` / `EyeOff` from lucide-react.
  8. Layout: 2-column grid for Organization URL (full width), Project + Query ID (side by side on md+), Top N + PAT (side by side on md+).
- **Acceptance Criteria:**
  - All ADO-related fields render with correct labels and placeholders.
  - Validation errors display inline only for touched fields.
  - PAT visibility toggles correctly.
  - Test Connection button triggers callback, shows loading and result states.
- **Testing Approach:** Visual verification in dev mode.
- **Output:** 1 component file.

---

#### T-006: LlmProviderSection Component
- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Files:**
  - `src/renderer/src/components/settings/LlmProviderSection.tsx` (new)
- **Implementation Notes:**
  1. White card component (same design as T-005).
  2. Section heading: "LLM Provider" with `Bot` icon from lucide-react.
  3. Fields:
     - Provider (`Select` with options: OpenAI, Anthropic Claude, GitHub Copilot, Gemini)
     - **Conditional section (provider !== 'github-copilot'):** API Key (`Input`, type="password" with eye toggle). Label changes based on provider (e.g., "OpenAI API Key", "Anthropic API Key", "Gemini API Key").
     - **Conditional section (provider === 'github-copilot'):** Auth status badge. Display `copilotAuthStatus` as a colored badge: `authenticated` → green badge, `unauthenticated` → red badge, `unknown` → gray badge. Read-only, informational text explaining Copilot uses GitHub session.
     - Chunk Size (`Input`, type="number", min=5, max=30)
  4. "Test Connection" button (outline variant). Same loading/result pattern as ADO section.
  5. **Props interface:**
     ```ts
     interface LlmProviderSectionProps {
       settings: AppSettings
       errors: Record<string, string | null>
       touched: Record<string, boolean>
       onFieldChange: (field: keyof AppSettings, value: unknown) => void
       onTestConnection: () => Promise<void>
       testResult: { type: 'success' | 'error'; message: string } | null
       testLoading: boolean
     }
     ```
  6. Eye toggle for API key: local state, same pattern as PAT in T-005.
  7. When provider changes, API key value is preserved in form state (just hidden, not cleared).
- **Acceptance Criteria:**
  - Provider select renders all 4 options.
  - Switching to `github-copilot` hides API key field and shows auth status badge.
  - Switching back to `openai` restores API key field with preserved value.
  - Chunk size field validates in range 5–30.
  - Test Connection button works with loading/result states.
- **Testing Approach:** Visual verification; test provider switching manually.
- **Output:** 1 component file.

---

#### T-007: CategoriesSection Component
- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Files:**
  - `src/renderer/src/components/settings/CategoriesSection.tsx` (new)
- **Implementation Notes:**
  1. White card component (same design pattern).
  2. Section heading: "Categories" with `Tags` icon from lucide-react.
  3. Textarea (from T-001) where each line = one category. Populated via `categoriesToText(settings.categories)`. On change, update local textarea value; on blur or parent save, convert back via `textToCategories(text)`.
  4. "Reset to default" button (outline variant, destructive text color). On click: `window.confirm('Reset categories to default (empty)? The LLM will auto-generate categories.')` → if confirmed, call `resetCategories()`.
  5. Info note below textarea: light blue info box (`bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800`) with `Info` icon: "When categories are empty, the LLM will auto-generate categories based on the bugs."
  6. **Props interface:**
     ```ts
     interface CategoriesSectionProps {
       categories: string[]
       onCategoriesChange: (categories: string[]) => void
       onReset: () => void
       categoriesToText: (categories: string[]) => string
       textToCategories: (text: string) => string[]
     }
     ```
  7. Internal state: `textValue: string` initialized from `categoriesToText(categories)`. Synced on prop change (categories update from parent). On textarea change, update `textValue`. On blur, call `onCategoriesChange(textToCategories(textValue))`.
- **Acceptance Criteria:**
  - Categories display as newline-separated text in textarea.
  - Editing and blurring updates parent state with cleaned array.
  - Reset button clears textarea after confirmation.
  - Info note is always visible.
- **Testing Approach:** Visual verification; test add/remove/reset flow.
- **Output:** 1 component file.

---

#### T-008: SettingsPage Assembly
- **Type:** INTEGRATE
- **Wave:** 4 — SEQUENTIAL
- **Files:**
  - `src/renderer/src/pages/SettingsPage.tsx` (modify — replace placeholder)
- **Implementation Notes:**
  1. Replace the existing placeholder with the full settings page.
  2. Import and call `useSettings()` hook.
  3. **Loading state:** While `loading` is true, show a centered spinner or skeleton.
  4. **Page layout:**
     ```
     <div className="p-6 max-w-4xl mx-auto space-y-6">
       <!-- Page header -->
       <div>
         <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
         <p className="text-sm text-gray-500 mt-1">Configure Azure DevOps connection and LLM provider</p>
       </div>

       <!-- Security note -->
       <InfoBanner />

       <!-- Save result feedback (success/error) -->
       <FeedbackBanner />

       <!-- Section cards -->
       <AdoConnectionSection ... />
       <LlmProviderSection ... />
       <CategoriesSection ... />

       <!-- Action bar -->
       <div className="flex justify-end gap-3">
         <Button variant="default" disabled={!canSave} onClick={save}>
           {saving ? <Loader2 className="animate-spin" /> : null} Save Settings
         </Button>
       </div>
     </div>
     ```
  5. **Security note:** Inline info box at the top: `bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800` with `Shield` icon: "Credentials are stored locally in encrypted form using machine-specific keys."
  6. **Save feedback:** Conditional banner below the heading. `saveResult?.type === 'success'` → green banner, auto-dismiss after 3 seconds via `setTimeout` + `clearSaveResult()`. `saveResult?.type === 'error'` → red banner with dismiss X button.
  7. **Wire props:** Pass `settings`, `errors`, `touched`, `updateField` to each section. Pass test connection handlers and results to their respective sections. Pass categories helpers to CategoriesSection.
  8. The categories `onCategoriesChange` calls `updateField('categories', newCategories)`.
  9. Save button uses `Loader2` spinner from lucide-react when `saving` is true.
- **Acceptance Criteria:**
  - Page loads settings from IPC and populates all sections.
  - All validation errors display inline.
  - Save button is disabled when form is pristine or invalid.
  - Save button triggers IPC save and shows feedback.
  - Test Connection buttons in both sections trigger IPC calls and show results.
  - Security note and categories info note are always visible.
  - Page matches design reference visual style (white cards on gray-50, Inter font, compact density).
- **Testing Approach:** Full end-to-end manual test in dev mode: load → edit → validate → save → reload → verify persistence.
- **Output:** 1 modified file.

---

### Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Form state complexity leads to stale/inconsistent state | Medium | Low | Single `useSettings` hook as single source of truth; no duplicated state in section components |
| Validation regex for ADO URL too strict (rejects valid org URLs) | Low | Medium | Accept both known formats; document that unusual URLs may need adjustment |
| Provider switch loses API key value | Medium | Low | Preserve API key in state regardless of provider; only hide the field |
| IPC error during save not surfaced to user | High | Low | Wrap all IPC calls in try/catch; show error banner with details |
| Test Connection timeout not handled | Medium | Low | 5-second `Promise.race` timeout in hook; show timeout-specific error message |
| electron-store default values differ from form defaults | Low | Low | FT-01 already set defaults in store schema; hook falls back to defaults on load error |
| Categories textarea performance with very large lists | Low | Very Low | Textarea is fine for hundreds of lines; no virtualization needed |

---

### File Inventory

| File | Action | Task |
|------|--------|------|
| `src/renderer/src/components/ui/input.tsx` | Create | T-001 |
| `src/renderer/src/components/ui/label.tsx` | Create | T-001 |
| `src/renderer/src/components/ui/select.tsx` | Create | T-001 |
| `src/renderer/src/components/ui/textarea.tsx` | Create | T-001 |
| `src/renderer/src/lib/validation.ts` | Create | T-002 |
| `src/shared/types.ts` | Modify | T-003 |
| `src/main/ipc-handlers.ts` | Modify | T-003 |
| `src/renderer/src/hooks/useSettings.ts` | Create | T-004 |
| `src/renderer/src/components/settings/AdoConnectionSection.tsx` | Create | T-005 |
| `src/renderer/src/components/settings/LlmProviderSection.tsx` | Create | T-006 |
| `src/renderer/src/components/settings/CategoriesSection.tsx` | Create | T-007 |
| `src/renderer/src/pages/SettingsPage.tsx` | Modify | T-008 |

**Total: 10 new files, 2 modified files**

---

### Completeness Assessment

- **Functional coverage:** High — All PRD requirements mapped to FRs, all FRs mapped to tasks.
- **Non-functional coverage:** High — Security (NFR-SEC), performance (NFR-PERF), maintainability (NFR-MAINT) addressed.
- **Task-to-requirement mapping:** Complete — every FR is covered by at least one task.

| Requirement | Task(s) |
|-------------|---------|
| FR-FORM-001..009 | T-001, T-005, T-006 |
| FR-CAT-001..003 | T-007 |
| FR-PERSIST-001..003 | T-004, T-008 |
| FR-TEST-001..003 | T-003, T-004, T-005, T-006 |
| FR-UX-001..004 | T-001, T-002, T-004, T-005, T-006, T-007, T-008 |

### Status

**READY FOR APPROVAL**

---

## Execution Summary

- **Agent:** Spec-Planner
- **Phase:** Requirements & Planning
- **Status:** READY FOR APPROVAL
- **Iterations:** 1
- **Requirements:** Functional: 16, Non-Functional: 5, Edge Cases: 11
- **Tasks:** 8 total, 6 parallelizable, 4 waves
- **Critical Path:** 4 tasks (T-001 → T-004 → T-005 → T-008)
- **Files:** 10 new, 2 modified (12 total)
- **Key Decisions:**
  - Categories as textarea (one line per category) rather than interactive list — simpler, sufficient for flat string list
  - Single `useSettings` hook as state management layer — avoids prop-drilling complexity while keeping sections stateless
  - Test Connection stubs return `{ success: false, message }` instead of throwing — enables UI feedback loop without FT-03/FT-04
  - API key preserved in form state across provider switches — better UX, no data loss
  - No new npm dependencies — all UI built with existing Tailwind + shadcn pattern + lucide-react icons
  - Client-side validation only (Renderer) — Main Process is a trusted store in FT-02 scope
- **Artifacts Produced:**
  - Combined Spec + Plan document
  - `feature/feature-2/spec-plan.md`
- **Notes for Next Phase:**
  - Dispatch Wave 1 tasks (T-001, T-002, T-003) immediately — fully parallel, no dependencies
  - Wave 2 (T-004) is the critical dependency — dispatch as soon as Wave 1 completes
  - Wave 3 tasks (T-005, T-006, T-007) can be dispatched in parallel after T-004
  - T-008 is the final integration task — should be last
  - The `useSettings` hook interface (documented in T-004) is the contract for all section components — implementers of T-005/T-006/T-007 should reference it
