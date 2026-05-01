## Spec-Planner — Iteration 1

### Feature Context

- **Feature:** Replace CopilotProvider with GenericProvider (OpenAI-compatible REST API)
- **Feature #:** feature-8
- **Feature Type:** full-stack

---

## Part 1: Requirements

### Functional Requirements

#### Provider Type System

- **FR-TYP-001:** Replace `'github-copilot'` with `'generic'` in `LLMProviderType`
  - Description: The shared union type `LLMProviderType` must remove the `'github-copilot'` variant and add `'generic'`.
  - Acceptance Criteria: Given the type definition in `src/shared/types.ts`, when inspected, then `LLMProviderType` is `'openai' | 'anthropic' | 'generic' | 'gemini'`.
  - Priority: Must-Have

- **FR-TYP-002:** Add `baseUrl` field to `AppSettings`
  - Description: `AppSettings` must include an optional `baseUrl?: string` field for the generic provider's endpoint.
  - Acceptance Criteria: Given `AppSettings`, when a generic provider is configured, then `baseUrl` holds the user-provided URL string.
  - Priority: Must-Have

- **FR-TYP-003:** Remove `copilotAuthStatus` from `AppSettings`
  - Description: The `copilotAuthStatus` property and its associated type (`'authenticated' | 'unauthenticated' | 'unknown'`) must be removed from `AppSettings`.
  - Acceptance Criteria: Given the `AppSettings` interface, when inspected, then `copilotAuthStatus` does not exist.
  - Priority: Must-Have

- **FR-TYP-004:** Add `baseUrl` to `LLMProviderConfig`
  - Description: The `LLMProviderConfig` interface must include an optional `baseUrl?: string` field so the provider factory can pass it to `GenericProvider`.
  - Acceptance Criteria: Given `LLMProviderConfig`, when constructing a GenericProvider, then `baseUrl` can be provided.
  - Priority: Must-Have

#### Generic Provider Implementation

- **FR-GEN-001:** Create `GenericProvider` class implementing `LLMProvider`
  - Description: A new `GenericProvider` class that calls any OpenAI-compatible API endpoint using raw `fetch()` — no SDK dependency. The endpoint is `POST {baseUrl}/chat/completions` with standard OpenAI chat completions request format.
  - Acceptance Criteria:
    - Given a valid `baseUrl` and `apiKey`, when `chat()` is called, then it sends a POST to `{baseUrl}/chat/completions` with `Authorization: Bearer {apiKey}`, `Content-Type: application/json`, and a body containing `model`, `messages` (system + user), and `temperature: 0.2`.
    - Given a successful response, when the response body contains `choices[0].message.content`, then the content string is returned.
  - Priority: Must-Have

- **FR-GEN-002:** GenericProvider must require both `apiKey` and `baseUrl` at construction
  - Description: Constructor must throw `LLM_AUTH_ERROR` if `apiKey` is missing/empty and a descriptive error if `baseUrl` is missing/empty.
  - Acceptance Criteria: Given missing `apiKey` or `baseUrl`, when the constructor is invoked, then an `AppError` is thrown with appropriate code and message.
  - Priority: Must-Have

- **FR-GEN-003:** GenericProvider error handling
  - Description: The provider must map HTTP error codes to `AppError` codes: 401/403 → `LLM_AUTH_ERROR`, 429 → `LLM_RATE_LIMIT`, timeout/AbortError → `LLM_TIMEOUT`, empty response body → `LLM_PARSE_ERROR`, other errors → `UNKNOWN_ERROR`.
  - Acceptance Criteria: Given each error scenario, when `chat()` encounters the condition, then the correct `AppError` code is thrown.
  - Priority: Must-Have

- **FR-GEN-004:** GenericProvider must support request timeout
  - Description: Use `AbortController` with a 60-second default timeout (or `config.timeout`), consistent with existing providers.
  - Acceptance Criteria: Given a request exceeding the timeout, when the abort fires, then `LLM_TIMEOUT` is thrown.
  - Priority: Must-Have

- **FR-GEN-005:** GenericProvider `testConnection()` method
  - Description: Must send a lightweight chat request (same pattern as other providers) to verify connectivity.
  - Acceptance Criteria: Given valid credentials and endpoint, when `testConnection()` is called, then no error is thrown. Given invalid credentials, when `testConnection()` is called, then the appropriate `AppError` is thrown.
  - Priority: Must-Have

#### Provider Factory

- **FR-FAC-001:** Update factory to instantiate `GenericProvider`
  - Description: The `createLLMProvider` switch must replace the `'github-copilot'` case with `'generic'` and instantiate `GenericProvider`, passing `baseUrl` from config.
  - Acceptance Criteria: Given `type = 'generic'` and a config with `apiKey` and `baseUrl`, when `createLLMProvider` is called, then a `GenericProvider` instance is returned with `name === 'generic'`.
  - Priority: Must-Have

#### LLM Service

- **FR-SVC-001:** Pass `baseUrl` from settings to provider config
  - Description: `categorizeBugs()` must include `settings.baseUrl` in the config object passed to `createLLMProvider`.
  - Acceptance Criteria: Given settings with `llmProvider = 'generic'` and a `baseUrl`, when `categorizeBugs` is called, then the config passed to the factory includes `baseUrl`.
  - Priority: Must-Have

#### Settings UI

- **FR-UI-001:** Show "Generico" option in provider dropdown
  - Description: The `<Select>` in `LlmProviderSection` must replace the `"GitHub Copilot"` option with `"Generico"` (`value="generic"`).
  - Acceptance Criteria: Given the Settings page, when the user opens the provider dropdown, then "Generico" appears and "GitHub Copilot" does not.
  - Priority: Must-Have

- **FR-UI-002:** Show Base URL input when "Generico" is selected
  - Description: When `llmProvider === 'generic'`, display a "Base URL" text input field in addition to the API Key field.
  - Acceptance Criteria: Given `llmProvider = 'generic'`, when the section renders, then both "Base URL" and "API Key" input fields are visible. Given any other provider, when the section renders, then the "Base URL" field is not visible.
  - Priority: Must-Have

- **FR-UI-003:** Remove Copilot authentication status UI
  - Description: Remove the authentication badge, status text, and copilot-specific conditional rendering from `LlmProviderSection`.
  - Acceptance Criteria: Given any provider selection, when the section renders, then no "Authentication Status" label, badge, or "GitHub Copilot uses your GitHub session" text appears.
  - Priority: Must-Have

- **FR-UI-004:** Base URL field binds to `settings.baseUrl`
  - Description: Changes to the Base URL input must call `onFieldChange('baseUrl', value)` and display validation errors from `errors.baseUrl`.
  - Acceptance Criteria: Given user types in Base URL field, when `onChange` fires, then `onFieldChange` is called with `('baseUrl', <typed-value>)`.
  - Priority: Must-Have

#### Validation

- **FR-VAL-001:** Require `apiKey` for the generic provider
  - Description: `validateApiKey` must require an API key when `provider === 'generic'` (the existing copilot exemption is removed).
  - Acceptance Criteria: Given `provider = 'generic'` and empty `apiKey`, when validated, then error `'API Key is required for this provider'` is returned.
  - Priority: Must-Have

- **FR-VAL-002:** Add `validateBaseUrl` function
  - Description: A new validation function that checks the base URL is a valid URL (using `URL` constructor) and uses `https:` protocol. Required only when `provider === 'generic'`.
  - Acceptance Criteria:
    - Given `provider = 'generic'` and empty baseUrl → `'Base URL is required for Generic provider'`
    - Given `provider = 'generic'` and `baseUrl = 'not-a-url'` → `'Must be a valid URL'`
    - Given `provider = 'generic'` and `baseUrl = 'http://example.com'` → `'Base URL must use HTTPS'`
    - Given `provider = 'generic'` and `baseUrl = 'https://api.example.com/v1'` → `null`
    - Given `provider = 'openai'` → `null` (not validated)
  - Priority: Must-Have

- **FR-VAL-003:** Include `baseUrl` in `validateSettings`
  - Description: `validateSettings` must call `validateBaseUrl` and include the result in the returned errors object.
  - Acceptance Criteria: Given settings with `llmProvider = 'generic'` and invalid `baseUrl`, when `validateSettings` is called, then `errors.baseUrl` contains the validation message.
  - Priority: Must-Have

#### IPC Handlers

- **FR-IPC-001:** Remove Copilot-specific auth check in LLM test connection handler
  - Description: The `LLM_TEST_CONNECTION` handler has a special case for `github-copilot` checking `copilotAuthStatus`. This must be removed.
  - Acceptance Criteria: Given any provider, when `LLM_TEST_CONNECTION` is invoked, then no `copilotAuthStatus` check occurs. The generic provider follows the standard `!settings.apiKey?.trim()` check.
  - Priority: Must-Have

- **FR-IPC-002:** Pass `baseUrl` in LLM connection test
  - Description: The LLM test connection handler must include `baseUrl` from settings in the provider config.
  - Acceptance Criteria: Given settings with `llmProvider = 'generic'` and a `baseUrl`, when the test connection handler constructs the provider, then `baseUrl` is available.
  - Priority: Should-Have (already handled if FR-SVC-001 is correct, since `testLLMConnection` reuses the service)

#### Store Migration

- **FR-MIG-001:** Migrate existing `github-copilot` provider setting to `openai`
  - Description: A new migration (version 2) must check if `settings.llmProvider === 'github-copilot'` and change it to `'openai'`. Must also remove `copilotAuthStatus` from settings.
  - Acceptance Criteria:
    - Given stored settings with `llmProvider: 'github-copilot'`, when migration runs, then `llmProvider` becomes `'openai'` and `copilotAuthStatus` is removed.
    - Given stored settings with `llmProvider: 'openai'`, when migration runs, then settings remain unchanged.
  - Priority: Must-Have

- **FR-MIG-002:** Bump `CURRENT_SCHEMA_VERSION` to 2
  - Description: The schema version constant must be updated to 2 to trigger the new migration.
  - Acceptance Criteria: Given `CURRENT_SCHEMA_VERSION`, when inspected, then it equals `2`.
  - Priority: Must-Have

#### Cleanup

- **FR-CLN-001:** Delete `copilot-provider.ts` file
  - Description: The file `src/main/llm/providers/copilot-provider.ts` must be deleted.
  - Acceptance Criteria: The file no longer exists on disk.
  - Priority: Must-Have

- **FR-CLN-002:** Remove `@github/copilot-sdk` from `package.json`
  - Description: The dependency `@github/copilot-sdk` must be removed from `package.json`.
  - Acceptance Criteria: Given `package.json`, when inspected, then `@github/copilot-sdk` does not appear in `dependencies` or `devDependencies`.
  - Priority: Must-Have

### Non-Functional Requirements

- **NFR-SEC-001:** The GenericProvider must only allow `https:` base URLs (enforced by validation).
- **NFR-SEC-002:** API key must not be logged or included in error messages.
- **NFR-PERF-001:** GenericProvider `fetch` timeout must be configurable (default 60s), matching existing provider behavior.
- **NFR-COMPAT-001:** The OpenAI-compatible request format must follow the standard: `POST /chat/completions` with `model`, `messages`, `temperature` fields.
- **NFR-MAINT-001:** GenericProvider must follow existing provider patterns (same error mapping, same `isAppError` guard, same `throwAppError` helper).

### Constraints

- No new npm dependencies for the generic provider (raw `fetch` only).
- Must preserve the existing Strategy + Factory pattern.
- Store migration must be backward-compatible (users on schema v1 upgrade cleanly).
- Italian error messages must be used for consistency with existing providers.

### Assumptions

- `fetch` is available globally in the Electron main process (Node 18+ / Electron 28+). **[Validated: Electron apps based on electron-vite typically use modern Node.]**
- The default model for GenericProvider can be `'gpt-4o'` (same as OpenAI), since the user connects to an OpenAI-compatible endpoint.
- The `baseUrl` should NOT include `/chat/completions` — the provider appends that path.

### Out of Scope

- Model selection dropdown in the UI (future feature).
- Custom headers or authentication schemes beyond Bearer token.
- WebSocket/streaming support for the generic provider.
- Updating the PRD document (`content/bug-categorizer-prd.md`).

### Edge Cases

| Scenario                                              | Expected Behavior                                                               | Related Requirement |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------- |
| User had `github-copilot` selected, upgrades app      | Migration sets provider to `openai`, removes `copilotAuthStatus`                | FR-MIG-001          |
| `baseUrl` has trailing slash                          | Provider normalizes: strips trailing slash before appending `/chat/completions` | FR-GEN-001          |
| `baseUrl` is empty for non-generic provider           | No validation error (baseUrl only validated for generic)                        | FR-VAL-002          |
| Generic provider returns non-JSON response            | `LLM_PARSE_ERROR` thrown                                                        | FR-GEN-003          |
| Generic provider returns JSON without `choices` array | `LLM_PARSE_ERROR` thrown                                                        | FR-GEN-003          |
| User switches from generic to openai                  | Base URL field disappears, `baseUrl` value preserved in settings (no data loss) | FR-UI-002           |
| Base URL with `http://` scheme                        | Validation rejects with "Base URL must use HTTPS"                               | FR-VAL-002          |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 12
- **Parallelizable:** 8 (67%)
- **Execution Waves:** 4

### Execution Waves

#### Wave 1 — Type System & Shared Foundation

**Execution:** SEQUENTIAL (single task, foundational)

| Task ID | Type     | Title               | Description                                                                                                                                                                       | Files                                          | Depends On | Complexity |
| ------- | -------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------- | ---------- |
| T-001   | REFACTOR | Update shared types | Replace `'github-copilot'` → `'generic'` in `LLMProviderType`, add `baseUrl?: string` to `AppSettings`, remove `copilotAuthStatus`, add `baseUrl?: string` to `LLMProviderConfig` | `src/shared/types.ts`, `src/main/llm/types.ts` | None       | S          |

#### Wave 2 — Core Implementation (parallel)

**Execution:** PARALLEL

| Task ID | Type      | Title                                  | Description                                                                                              | Files                                                               | Depends On | Complexity |
| ------- | --------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------- | ---------- |
| T-002   | IMPLEMENT | Create GenericProvider                 | Implement `GenericProvider` class with `fetch`-based OpenAI-compatible chat completions                  | `src/main/llm/providers/generic-provider.ts`                        | T-001      | M          |
| T-003   | REFACTOR  | Update provider factory                | Replace CopilotProvider import/case with GenericProvider, pass `baseUrl`                                 | `src/main/llm/provider-factory.ts`                                  | T-001      | S          |
| T-004   | REFACTOR  | Update LLM service                     | Pass `baseUrl` from settings into provider config                                                        | `src/main/llm/llm-service.ts`                                       | T-001      | S          |
| T-005   | REFACTOR  | Update validation                      | Remove copilot exemption from `validateApiKey`, add `validateBaseUrl`, update `validateSettings`         | `src/renderer/src/lib/validation.ts`                                | T-001      | S          |
| T-006   | REFACTOR  | Update Settings UI                     | Replace Copilot option/UI with Generic option + Base URL field, remove copilot status badge              | `src/renderer/src/components/settings/LlmProviderSection.tsx`       | T-001      | M          |
| T-007   | REFACTOR  | Update store migration                 | Add migration v2 (copilot → openai, remove copilotAuthStatus), bump schema version                       | `src/main/store-migration.ts`                                       | T-001      | S          |
| T-008   | REFACTOR  | Update IPC handlers & useSettings hook | Remove copilot-specific auth check in LLM test handler, remove `copilotAuthStatus` from default settings | `src/main/ipc-handlers.ts`, `src/renderer/src/hooks/useSettings.ts` | T-001      | S          |

#### Wave 3 — Cleanup & Dependency Removal

**Execution:** PARALLEL

| Task ID | Type     | Title                               | Description                                                                    | Files                                                                 | Depends On | Complexity |
| ------- | -------- | ----------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ---------- | ---------- |
| T-009   | REFACTOR | Delete CopilotProvider & remove SDK | Delete `copilot-provider.ts`, remove `@github/copilot-sdk` from `package.json` | `src/main/llm/providers/copilot-provider.ts` (DELETE), `package.json` | T-003      | S          |

#### Wave 4 — Test Updates

**Execution:** PARALLEL

| Task ID | Type | Title                         | Description                                                                                                                                  | Files                                                                                                                   | Depends On          | Complexity |
| ------- | ---- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------- |
| T-010   | TEST | Update provider factory tests | Replace copilot test with generic provider test, add baseUrl test                                                                            | `tests/main/llm-provider-factory.spec.ts`                                                                               | T-003               | S          |
| T-011   | TEST | Update renderer tests         | Update `LlmProviderSection.spec.tsx`, `validation.spec.ts`, `useSettings.spec.ts` to reflect generic provider and removed copilot references | `tests/renderer/LlmProviderSection.spec.tsx`, `tests/renderer/validation.spec.ts`, `tests/renderer/useSettings.spec.ts` | T-005, T-006, T-008 | M          |
| T-012   | TEST | Update store migration tests  | Add test for migration v2 (copilot → openai conversion), update schema version assertions                                                    | `tests/main/store-migration.spec.ts`                                                                                    | T-007               | S          |

### Critical Path

T-001 → T-002 → T-003 → T-009 → T-010 (critical path: 5 tasks)

### Task Details

#### T-001: Update shared types

- **Type:** REFACTOR
- **Wave:** 1 — SEQUENTIAL
- **Implementation Notes:**
  1. In `src/shared/types.ts`:
     - Change `LLMProviderType` to `'openai' | 'anthropic' | 'generic' | 'gemini'`
     - Add `baseUrl?: string` to `AppSettings`
     - Remove `copilotAuthStatus?: 'authenticated' | 'unauthenticated' | 'unknown'`
  2. In `src/main/llm/types.ts`:
     - Add `baseUrl?: string` to `LLMProviderConfig`
- **Acceptance Criteria:** TypeScript compiles with updated types; no references to `'github-copilot'` or `copilotAuthStatus` in type definitions.
- **Testing Approach:** Compile-time verification (type errors caught by TS). Existing tests will break — fixed in Wave 4.
- **Output:** `src/shared/types.ts`, `src/main/llm/types.ts`

#### T-002: Create GenericProvider

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `src/main/llm/providers/generic-provider.ts`
  2. Class `GenericProvider implements LLMProvider` with `readonly name = 'generic'`
  3. Constructor: validate `apiKey` (throw `LLM_AUTH_ERROR` if missing) and `baseUrl` (throw `UNKNOWN_ERROR` if missing)
  4. `chat()` method:
     - Normalize `baseUrl`: strip trailing slash
     - Build URL: `${baseUrl}/chat/completions`
     - Use `AbortController` with timeout (default 60s)
     - `fetch(url, { method: 'POST', headers: { Authorization: 'Bearer {apiKey}', 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: [{role:'system', content: systemPrompt}, {role:'user', content: userMessage}], temperature: 0.2 }), signal })`
     - Parse response: check `response.ok`, then extract `choices[0].message.content`
     - Error mapping: 401/403 → `LLM_AUTH_ERROR`, 429 → `LLM_RATE_LIMIT`, AbortError → `LLM_TIMEOUT`, empty content → `LLM_PARSE_ERROR`
  5. `testConnection()`: call `chat()` with standard test prompt
  6. Use `isAppError` and `throwAppError` helpers (same pattern as OpenAI provider)
- **Acceptance Criteria:** Provider instantiates, sends correct HTTP request format, maps all error codes correctly.
- **Testing Approach:** Post-implementation (Wave 4 or dedicated unit test if needed).
- **Output:** `src/main/llm/providers/generic-provider.ts`

#### T-003: Update provider factory

- **Type:** REFACTOR
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Remove `import { CopilotProvider }` from `./providers/copilot-provider`
  2. Add `import { GenericProvider }` from `./providers/generic-provider`
  3. Replace `case 'github-copilot': return new CopilotProvider(config)` with `case 'generic': return new GenericProvider(config)`
- **Acceptance Criteria:** `createLLMProvider('generic', { apiKey: 'x', baseUrl: 'https://...' })` returns a `GenericProvider` instance.
- **Testing Approach:** Updated in T-010.
- **Output:** `src/main/llm/provider-factory.ts`

#### T-004: Update LLM service

- **Type:** REFACTOR
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. In `categorizeBugs()`, add `baseUrl: settings.baseUrl` to the config object passed to `createLLMProvider`
  2. Check if `testLLMConnection` also needs the same update (it likely calls `createLLMProvider` internally)
- **Acceptance Criteria:** Config object passed to factory includes `baseUrl` when present in settings.
- **Testing Approach:** Existing integration tests.
- **Output:** `src/main/llm/llm-service.ts`

#### T-005: Update validation

- **Type:** REFACTOR
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. In `validateApiKey`: remove the `if (provider === 'github-copilot') return null` exemption — all providers now require API key
  2. Add `validateBaseUrl(value: string | undefined, provider: LLMProviderType): string | null`:
     - If `provider !== 'generic'` return `null`
     - If empty/undefined → `'Base URL is required for Generic provider'`
     - Try `new URL(value)` — if throws → `'Must be a valid URL'`
     - If `parsed.protocol !== 'https:'` → `'Base URL must use HTTPS'`
     - Otherwise `null`
  3. In `validateSettings`: add `baseUrl: validateBaseUrl(settings.baseUrl, settings.llmProvider)` to returned object
- **Acceptance Criteria:** Validation returns correct errors for all generic provider field combinations.
- **Testing Approach:** Updated in T-011.
- **Output:** `src/renderer/src/lib/validation.ts`

#### T-006: Update Settings UI

- **Type:** REFACTOR
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Replace `<option value="github-copilot">GitHub Copilot</option>` with `<option value="generic">Generico</option>`
  2. Remove `copilotStatus`, `statusBadge`, `badge` variables
  3. Remove the copilot branch of the conditional rendering (the `settings.llmProvider !== 'github-copilot'` ternary)
  4. API Key section: always show for all providers (no copilot exemption). Update the ternary to just always render the API Key input.
  5. Add conditional Base URL input: when `settings.llmProvider === 'generic'`, render a `<Label htmlFor="baseUrl">Base URL</Label>` + `<Input id="baseUrl" ...>` before the API Key field, bound to `settings.baseUrl`, with error display from `errors.baseUrl`
  6. Update `API_KEY_LABELS` to include `generic: 'API Key'`
  7. Remove import of `copilotAuthStatus` related references
- **Acceptance Criteria:** Dropdown shows "Generico", selecting it reveals Base URL + API Key fields. No Copilot UI remnants.
- **Testing Approach:** Updated in T-011.
- **Output:** `src/renderer/src/components/settings/LlmProviderSection.tsx`

#### T-007: Update store migration

- **Type:** REFACTOR
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Bump `CURRENT_SCHEMA_VERSION` to `2`
  2. Add migration `{ version: 2, up: (data) => { ... } }`:
     - If `data.settings` exists and `data.settings.llmProvider === 'github-copilot'`, set `data.settings.llmProvider = 'openai'`
     - Delete `data.settings.copilotAuthStatus` if present
     - Return `data`
- **Acceptance Criteria:** Migration converts copilot settings to openai and removes copilotAuthStatus.
- **Testing Approach:** Updated in T-012.
- **Output:** `src/main/store-migration.ts`

#### T-008: Update IPC handlers & useSettings hook

- **Type:** REFACTOR
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. In `src/main/ipc-handlers.ts` → `LLM_TEST_CONNECTION` handler:
     - Remove the `if (settings.llmProvider === 'github-copilot')` block that checks `copilotAuthStatus`
     - The `!settings.apiKey?.trim()` check already covers the generic provider
  2. In `src/renderer/src/hooks/useSettings.ts`:
     - Remove `copilotAuthStatus: 'unknown'` from `DEFAULT_SETTINGS`
  3. In `src/main/store.ts`:
     - Remove `copilotAuthStatus` from store defaults if present (it's not in current defaults, but verify)
- **Acceptance Criteria:** No copilot-specific logic in IPC handlers; default settings have no copilotAuthStatus.
- **Testing Approach:** Updated in T-011.
- **Output:** `src/main/ipc-handlers.ts`, `src/renderer/src/hooks/useSettings.ts`

#### T-009: Delete CopilotProvider & remove SDK

- **Type:** REFACTOR
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Delete file `src/main/llm/providers/copilot-provider.ts`
  2. In `package.json`: remove `"@github/copilot-sdk": "^0.3.0"` from dependencies
  3. Run `npm install` to update lockfile
- **Acceptance Criteria:** File deleted, dependency removed, no import errors.
- **Testing Approach:** Build verification.
- **Output:** `package.json` (modified), `copilot-provider.ts` (deleted)

#### T-010: Update provider factory tests

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Replace `it('creates Copilot provider')` with `it('creates Generic provider')`:
     - `createLLMProvider('generic', { apiKey: 'key', baseUrl: 'https://api.example.com' })` → `provider.name === 'generic'`
  2. Add test: `it('throws for Generic without API key')`: `createLLMProvider('generic', { baseUrl: 'https://...' })` → throws
  3. Add test: `it('throws for Generic without baseUrl')`: `createLLMProvider('generic', { apiKey: 'key' })` → throws
- **Acceptance Criteria:** All factory tests pass with updated provider set.
- **Testing Approach:** Direct vitest execution.
- **Output:** `tests/main/llm-provider-factory.spec.ts`

#### T-011: Update renderer tests

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. **`LlmProviderSection.spec.tsx`:**
     - Remove `copilotAuthStatus` from `baseSettings`
     - Replace copilot badge test with: selecting "generic" shows Base URL + API Key inputs
     - Test that Base URL input calls `onFieldChange('baseUrl', ...)`
     - Remove assertions about "Authenticated" badge and copilot text
  2. **`validation.spec.ts`:**
     - Remove `copilotAuthStatus` from `validSettings`
     - Replace `validateApiKey('', 'github-copilot')` test → `validateApiKey('', 'generic')` returns error
     - Add `validateBaseUrl` tests: required for generic, valid URL, HTTPS required, not required for other providers
     - Update `validateSettings` test to include `baseUrl` in result
  3. **`useSettings.spec.ts`:**
     - Remove `copilotAuthStatus` from `validSettings`
     - Update `DEFAULT_SETTINGS` expectations to not include `copilotAuthStatus`
- **Acceptance Criteria:** All renderer tests pass and cover new generic provider behavior.
- **Testing Approach:** Direct vitest execution.
- **Output:** `tests/renderer/LlmProviderSection.spec.tsx`, `tests/renderer/validation.spec.ts`, `tests/renderer/useSettings.spec.ts`

#### T-012: Update store migration tests

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Update `CURRENT_SCHEMA_VERSION` assertion to `2`
  2. Update migrations array length assertion to `2`
  3. Add test: `it('migration v2 converts github-copilot to openai')`:
     - Mock store with `settings: { llmProvider: 'github-copilot', copilotAuthStatus: 'authenticated' }` at schema v1
     - Run `migrateStore`
     - Assert `settings.llmProvider === 'openai'` and `copilotAuthStatus` removed
  4. Add test: `it('migration v2 leaves non-copilot providers unchanged')`:
     - Mock store with `settings: { llmProvider: 'anthropic' }` at schema v1
     - Assert settings unchanged after migration
- **Acceptance Criteria:** Migration tests cover both the conversion case and the no-op case.
- **Testing Approach:** Direct vitest execution.
- **Output:** `tests/main/store-migration.spec.ts`

### File Impact Summary

| File                                                          | Action | Task(s) |
| ------------------------------------------------------------- | ------ | ------- |
| `src/shared/types.ts`                                         | MODIFY | T-001   |
| `src/main/llm/types.ts`                                       | MODIFY | T-001   |
| `src/main/llm/providers/generic-provider.ts`                  | CREATE | T-002   |
| `src/main/llm/providers/copilot-provider.ts`                  | DELETE | T-009   |
| `src/main/llm/provider-factory.ts`                            | MODIFY | T-003   |
| `src/main/llm/llm-service.ts`                                 | MODIFY | T-004   |
| `src/renderer/src/lib/validation.ts`                          | MODIFY | T-005   |
| `src/renderer/src/components/settings/LlmProviderSection.tsx` | MODIFY | T-006   |
| `src/main/store-migration.ts`                                 | MODIFY | T-007   |
| `src/main/ipc-handlers.ts`                                    | MODIFY | T-008   |
| `src/renderer/src/hooks/useSettings.ts`                       | MODIFY | T-008   |
| `package.json`                                                | MODIFY | T-009   |
| `tests/main/llm-provider-factory.spec.ts`                     | MODIFY | T-010   |
| `tests/renderer/LlmProviderSection.spec.tsx`                  | MODIFY | T-011   |
| `tests/renderer/validation.spec.ts`                           | MODIFY | T-011   |
| `tests/renderer/useSettings.spec.ts`                          | MODIFY | T-011   |
| `tests/main/store-migration.spec.ts`                          | MODIFY | T-012   |

### Risk Register

| Risk                                                                             | Impact | Likelihood | Mitigation                                                                                                                         |
| -------------------------------------------------------------------------------- | ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `fetch` not available in Electron main process                                   | High   | Low        | Electron 28+ bundles Node 18+ with global fetch. Verify at build time. Fallback: `import { net } from 'electron'` for `net.fetch`. |
| Existing tests reference `'github-copilot'` type literal → TS errors after T-001 | Medium | High       | T-010/T-011/T-012 address all test updates. Run tests after Wave 4 only.                                                           |
| OpenAI-compatible endpoints vary in response format                              | Medium | Medium     | Stick to standard `choices[0].message.content` extraction. Log full response on parse failure for debugging.                       |
| Users with `github-copilot` in stored settings lose LLM config on upgrade        | Low    | Medium     | Migration gracefully defaults to `openai`, which requires API key — user will see validation error prompting them to configure.    |
| `baseUrl` trailing-slash inconsistency                                           | Low    | Medium     | Normalize in provider constructor: `baseUrl.replace(/\/+$/, '')`                                                                   |

---

### Completeness Assessment

- Functional coverage: **High** — All 20 functional requirements cover the full removal + replacement lifecycle.
- Non-functional coverage: **High** — Security (HTTPS-only), performance (timeout), compatibility (OpenAI format), and maintainability addressed.
- Task-to-requirement mapping: **Complete** — Every FR maps to at least one task; every task maps to at least one FR.

### Status

**READY FOR APPROVAL**
