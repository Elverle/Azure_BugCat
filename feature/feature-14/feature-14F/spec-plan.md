## Spec-Planner — Iteration 1

### Feature Context

- **Feature:** Parità provider e modalità auth per Analisi
- **Feature #:** FT-14F
- **Feature Type:** full-stack

---

## Part 1: Requirements

### Functional Requirements

#### Provider Selection & Resolution

- **FR-PROV-001:** Provider Selection for Non-Auto LLM Providers
  - Description: When `llmProvider` is `generic`, `gemini`, or `openrouter`, the user must be able to choose among `claude-sdk`, `codex-sdk`, `copilot-sdk`, or `none` as the agent provider.
  - Acceptance Criteria: Given LLM provider is `gemini`, When user opens Settings → Agent Provider section, Then a dropdown with all four options is visible and selectable.
  - Priority: Must-Have
  - **Status:** Already implemented in `AgentProviderSection.tsx`. No changes needed.

- **FR-PROV-002:** Copilot Subscription vs BYOK Distinction
  - Description: When `copilot-sdk` is selected, the UI must clearly distinguish between Copilot subscription mode (uses logged-in user) and BYOK mode (dedicated provider + API key + base URL).
  - Acceptance Criteria: Given agentProvider is `copilot-sdk`, When user views settings, Then radio buttons for "Abbonamento Copilot" and "BYOK" are visible, and selecting BYOK reveals provider, API key, and base URL fields.
  - Priority: Must-Have
  - **Status:** Already implemented. No changes needed.

- **FR-PROV-003:** Dedicated Credentials for Claude/Codex (Non-Auto Mapping)
  - Description: When Claude or Codex are chosen as agent provider outside auto-mapping (i.e., `llmProvider` is NOT `anthropic`/`openai`), the config must use the dedicated `agentApiKey` field. For Claude, this field is optional (can use local Claude Code config); for Codex, it is required.
  - Acceptance Criteria: Given `llmProvider='gemini'` and `agentProvider='codex-sdk'`, When `agentApiKey` is empty, Then validation fails with error "Agent API Key is required". Given `agentProvider='claude-sdk'`, When `agentApiKey` is empty, Then validation passes (field marked optional).
  - Priority: Must-Have
  - **Status:** Already implemented in `validation.ts`. No changes needed.

- **FR-PROV-004:** Agent Sessions Disabled When `agentProvider = none`
  - Description: When the effective agent provider resolves to `none`, Agent Sessions must be explicitly disabled. The Analyze button must not be clickable, and a clear message explains why.
  - Acceptance Criteria: Given `llmProvider='gemini'` and `agentProvider='none'`, When user views a bug detail drawer, Then the Analyze button is replaced with a disabled state and message "Agent Sessions disabilitato. Configura un provider agente in Settings."
  - Priority: Must-Have
  - **Status:** Partially implemented. `createRunner` throws `AgentNotConfiguredError` but there's NO proactive UI blocking — error only surfaces after attempting start. **Needs implementation.**

- **FR-PROV-005:** Blocking Session Start on Incomplete Configuration
  - Description: The system must block session start with a human-readable message when:
    - (a) Codex binary is not installed
    - (b) Dedicated API key is missing for codex-sdk (non-auto)
    - (c) BYOK config incomplete for Copilot (missing provider, key, or base URL when required)
    - (d) Agent provider is `none`
  - Acceptance Criteria: Given `agentProvider='codex-sdk'` and codex CLI not found, When session start is attempted, Then an error with message "Codex CLI non trovato. Installa con: npm i -g @openai/codex" is returned before attempting to spawn the runner.
  - Priority: Must-Have
  - **Status:** Partially implemented. BYOK and missing-key checks exist in IPC handler. Missing: Codex binary preflight at start time, proactive renderer-side blocking. **Needs implementation.**

#### Preflight & Blocking UI

- **FR-BLOCK-001:** Renderer-Side Agent Availability Check
  - Description: A helper function `checkAgentAvailability(settings)` determines whether agent sessions can start, returning either `{ available: true }` or `{ available: false, reason: string }`. This is used by `AnalyzeStartPanel` and `BugDetailDrawer` to show/disable the Analyze action proactively.
  - Acceptance Criteria: Given settings with `agentProvider='none'`, When `checkAgentAvailability` is called, Then it returns `{ available: false, reason: '...' }`. The Analyze button is disabled with the reason shown.
  - Priority: Must-Have
  - **Status:** Not implemented. **Needs implementation.**

- **FR-BLOCK-002:** Codex Binary Preflight at Session Start
  - Description: When the effective provider is `codex-sdk`, the `AGENT_START` IPC handler must verify Codex CLI binary availability before creating the runner. If missing, throw `AGENT_BINARY_MISSING` error with actionable message.
  - Acceptance Criteria: Given effective provider is `codex-sdk` and `codex --version` fails, When `agent:start` is invoked, Then error with code `AGENT_BINARY_MISSING` and message "Codex CLI non trovato..." is returned.
  - Priority: Must-Have
  - **Status:** Not implemented in AGENT_START handler (only exists as a standalone UI check button). **Needs implementation.**

- **FR-BLOCK-003:** Readable Blocking Messages (Not Silent Failures)
  - Description: All configuration incompleteness must surface as user-readable messages in the renderer. Messages must be in Italian and indicate what action the user should take.
  - Acceptance Criteria: All blocking paths produce Italian-language messages referencing Settings or installation commands.
  - Priority: Must-Have
  - **Status:** Partially done. Some messages exist. Need to standardize and ensure coverage.

### Non-Functional Requirements

- **NFR-TEST-001:** Unit test coverage for all provider resolution branches in `runner-factory.ts` and `resolveAgentApiKey` in `ipc-handlers.ts`.
- **NFR-TEST-002:** Renderer component tests for conditional rendering in `AnalyzeStartPanel` (disabled state when agent unavailable).
- **NFR-TEST-003:** Validation tests for all provider × auth-mode combinations.
- **NFR-COMPAT-001:** Changes must not break existing auto-derived paths (Anthropic→Claude, OpenAI→Codex).

### Constraints

- Runners already exist and work. No runner implementation changes.
- MCP configuration stays as-is (file-based for Claude/Codex, programmatic for Copilot).
- No Fix mode enablement.
- Must not break existing tests or flows.

### Assumptions

- The Codex binary check (`codex --version`) is reliable and completes within 5s timeout.
- Copilot subscription validation cannot be done upfront without making an API call — relying on SDK failure with good error messaging is acceptable.
- Claude local config (no API key) is a valid path — the runner handles this internally.

### Out of Scope

- Fix mode activation
- Advanced runtime hardening (CLI crashes, timeout tuning)
- Definitive CLI pinning/versioning
- MCP changes
- Cross-repo changes
- Session workspace/persistence changes

### Edge Cases

| Scenario                                                                    | Expected Behavior                                                                                                          | Related Requirement |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `llmProvider='anthropic'` + `agentProvider='codex-sdk'` (contradictory)     | Auto-derivation wins: Claude runner used, agentProvider field ignored                                                      | FR-PROV-001         |
| `agentProvider='copilot-sdk'` + `copilotByokEnabled=true` + empty fields    | Settings validation blocks save; if somehow saved, AGENT_START blocks with readable error                                  | FR-PROV-005         |
| `agentProvider='claude-sdk'` + no `agentApiKey` + no local Claude config    | Runner will fail at runtime with SDK error; system does not block upfront (acceptable — local config check is impractical) | FR-PROV-003         |
| `agentProvider='codex-sdk'` + binary installed but wrong version            | Allow start — version incompatibility is runtime, not preflight                                                            | FR-BLOCK-002        |
| `agentProvider='none'` + user tries to start from SessionWorkspace directly | Same blocking applies everywhere the Analyze action exists                                                                 | FR-BLOCK-001        |
| `llmProvider='openai'` switching to `llmProvider='gemini'` mid-session      | No active session protection needed; settings save sanitizes irrelevant fields                                             | FR-PROV-004         |
| Settings saved with valid config, then Codex binary uninstalled             | Preflight at AGENT_START catches it; renderer-side check is best-effort (cached or skipped)                                | FR-BLOCK-002        |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 9
- **Parallelizable:** 6 (67%)
- **Execution Waves:** 4

### Execution Waves

#### Wave 1 — Shared Utilities & Contracts

**Execution:** PARALLEL

| Task ID | Type      | Title                                     | Description                                            | Files                                        | Depends On | Complexity |
| ------- | --------- | ----------------------------------------- | ------------------------------------------------------ | -------------------------------------------- | ---------- | ---------- |
| T-001   | IMPLEMENT | Agent availability checker (renderer lib) | Create `checkAgentAvailability()` in renderer lib      | `src/renderer/src/lib/agent-availability.ts` | None       | S          |
| T-002   | IMPLEMENT | Codex binary preflight in AGENT_START     | Add binary check before runner creation in IPC handler | `src/main/ipc-handlers.ts`                   | None       | S          |

#### Wave 2 — Renderer Integration

**Execution:** PARALLEL

| Task ID | Type      | Title                                | Description                                                  | Files                                                                                                   | Depends On | Complexity |
| ------- | --------- | ------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ---------- | ---------- |
| T-003   | IMPLEMENT | AnalyzeStartPanel blocking UI        | Integrate availability check, show disabled state + message  | `src/renderer/src/components/dashboard/AnalyzeStartPanel.tsx`                                           | T-001      | M          |
| T-004   | IMPLEMENT | BugDetailDrawer blocking propagation | Pass agent availability state to AnalyzeStartPanel           | `src/renderer/src/components/dashboard/BugDetailDrawer.tsx`, `src/renderer/src/pages/DashboardPage.tsx` | T-001      | S          |
| T-005   | IMPLEMENT | SessionWorkspace blocking            | Apply same blocking in SessionWorkspace's inline start panel | `src/renderer/src/components/dashboard/SessionWorkspace.tsx`                                            | T-001      | S          |

#### Wave 3 — Tests

**Execution:** PARALLEL

| Task ID | Type | Title                                         | Description                                         | Files                                       | Depends On | Complexity |
| ------- | ---- | --------------------------------------------- | --------------------------------------------------- | ------------------------------------------- | ---------- | ---------- |
| T-006   | TEST | Agent availability checker tests              | Unit tests for all provider × config combinations   | `tests/renderer/agent-availability.spec.ts` | T-001      | M          |
| T-007   | TEST | Codex preflight IPC test                      | Test AGENT_START blocks when codex binary missing   | `tests/main/ipc-handlers.spec.ts`           | T-002      | S          |
| T-008   | TEST | AnalyzeStartPanel conditional rendering tests | Test disabled state, message display, button states | `tests/renderer/AnalyzeStartPanel.spec.tsx` | T-003      | M          |

#### Wave 4 — Validation & Cleanup

**Execution:** SEQUENTIAL

| Task ID | Type      | Title                               | Description                                       | Files   | Depends On                               | Complexity |
| ------- | --------- | ----------------------------------- | ------------------------------------------------- | ------- | ---------------------------------------- | ---------- |
| T-009   | INTEGRATE | End-to-end validation & wiki update | Verify all paths work together, update wiki pages | `wiki/` | T-003, T-004, T-005, T-006, T-007, T-008 | S          |

### Critical Path

T-001 → T-003 → T-008 → T-009 (critical path: 4 tasks)

### Task Details

#### T-001: Agent Availability Checker (renderer lib)

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Create `src/renderer/src/lib/agent-availability.ts`
  2. Export `checkAgentAvailability(settings: AppSettings): { available: true } | { available: false; reason: string }`
  3. Logic:
     - If `llmProvider` is `anthropic` or `openai` → always `{ available: true }` (auto-derived provider)
     - If `agentProvider === 'none'` → `{ available: false, reason: 'Agent Sessions disabilitato. Configura un provider agente in Settings.' }`
     - If `agentProvider === 'codex-sdk'` and `!agentApiKey?.trim()` → `{ available: false, reason: 'API Key agente richiesta per Codex. Configurala in Settings.' }`
     - If `agentProvider === 'copilot-sdk'` and `copilotByokEnabled` and (!`copilotByokProvider` or !`copilotByokApiKey?.trim()`) → `{ available: false, reason: 'Configurazione BYOK Copilot incompleta. Verifica in Settings.' }`
     - If no projects configured → `{ available: false, reason: 'Nessun progetto configurato. Aggiungi almeno un progetto in Settings.' }`
     - Otherwise → `{ available: true }`
  4. Pure function, no side effects, easily testable.
- **Acceptance Criteria:** Function returns correct availability/reason for all documented edge cases.
- **Testing Approach:** TDD (T-006)
- **Output:** `src/renderer/src/lib/agent-availability.ts`

#### T-002: Codex Binary Preflight in AGENT_START

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. In `src/main/ipc-handlers.ts`, inside the `AGENT_START` handler, after resolving `agentProvider` and before `createRunner()`:
  2. If `agentProvider === 'codex-sdk'`, call `execFile('codex', ['--version'], { timeout: 5000 })` (reuse existing pattern from `AGENT_CHECK_BINARY` handler).
  3. If error → throw `{ code: 'AGENT_BINARY_MISSING', message: 'Codex CLI non trovato. Installa con: npm i -g @openai/codex' }`
  4. Wrap in a helper `async function checkCodexBinary(): Promise<void>` to keep handler clean.
- **Acceptance Criteria:** `agent:start` with `codex-sdk` provider fails with `AGENT_BINARY_MISSING` when codex is not installed.
- **Testing Approach:** Post-implementation (T-007)
- **Output:** Modified `src/main/ipc-handlers.ts`

#### T-003: AnalyzeStartPanel Blocking UI

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Add new prop `agentAvailability: { available: true } | { available: false; reason: string }` to `AnalyzeStartPanelProps`.
  2. When `!agentAvailability.available`:
     - Replace the normal panel content with a disabled state message block showing the `reason`.
     - Use `AlertTriangle` icon + text in amber/gray styling.
     - No button rendered (or fully disabled with cursor-not-allowed).
  3. Keeps existing behavior when `available: true`.
- **Acceptance Criteria:** When availability check fails, panel shows reason message and no clickable Analyze button.
- **Testing Approach:** Post-implementation (T-008)
- **Output:** Modified `src/renderer/src/components/dashboard/AnalyzeStartPanel.tsx`

#### T-004: BugDetailDrawer Blocking Propagation

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. In `DashboardPage.tsx`, compute `agentAvailability` using the settings already loaded in component state and the `checkAgentAvailability` function.
  2. Pass `agentAvailability` through `BugDetailDrawer` → `AnalyzeStartPanel`.
  3. In `BugDetailDrawer.tsx`, add `agentAvailability` prop and pass through to `AnalyzeStartPanel`.
  4. Settings are already loaded in `DashboardPage` (projects, maxConcurrentSessions come from settings IPC).
  5. Need to also load `llmProvider`, `agentProvider`, `agentApiKey`, `copilotByokEnabled`, `copilotByokProvider`, `copilotByokApiKey` fields — extend the existing settings fetch in DashboardPage.
- **Acceptance Criteria:** BugDetailDrawer correctly passes availability to AnalyzeStartPanel; disabled state shows when agent unavailable.
- **Testing Approach:** Manual verification + T-008 covers the final rendering.
- **Output:** Modified `src/renderer/src/pages/DashboardPage.tsx`, `src/renderer/src/components/dashboard/BugDetailDrawer.tsx`

#### T-005: SessionWorkspace Blocking

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. In `SessionWorkspace.tsx`, identify where `AnalyzeStartPanel` is rendered with `isAnalyzing={false}`.
  2. Pass the same `agentAvailability` prop.
  3. The component needs access to settings (or receive the computed availability as prop from parent).
- **Acceptance Criteria:** SessionWorkspace's inline start panel respects agent availability.
- **Testing Approach:** Manual verification.
- **Output:** Modified `src/renderer/src/components/dashboard/SessionWorkspace.tsx`

#### T-006: Agent Availability Checker Tests

- **Type:** TEST
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Create `tests/renderer/agent-availability.spec.ts`
  2. Test cases:
     - `llmProvider='anthropic'` → available (regardless of agentProvider)
     - `llmProvider='openai'` → available (regardless of agentProvider)
     - `llmProvider='gemini'`, `agentProvider='none'` → not available, correct reason
     - `llmProvider='generic'`, `agentProvider='codex-sdk'`, no API key → not available
     - `llmProvider='generic'`, `agentProvider='codex-sdk'`, with API key → available
     - `llmProvider='generic'`, `agentProvider='claude-sdk'`, no API key → available (optional)
     - `llmProvider='gemini'`, `agentProvider='copilot-sdk'`, BYOK enabled, missing fields → not available
     - `llmProvider='gemini'`, `agentProvider='copilot-sdk'`, BYOK enabled, complete → available
     - `llmProvider='gemini'`, `agentProvider='copilot-sdk'`, subscription mode → available
     - Empty projects → not available
- **Acceptance Criteria:** All 10+ test cases pass.
- **Testing Approach:** Direct unit tests (Vitest, jsdom).
- **Output:** `tests/renderer/agent-availability.spec.ts`

#### T-007: Codex Preflight IPC Test

- **Type:** TEST
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. In `tests/main/ipc-handlers.spec.ts`, add test case for codex binary preflight.
  2. Mock `execFile` to simulate failure → expect AGENT_BINARY_MISSING error.
  3. Mock `execFile` to simulate success → expect normal flow continues.
  4. Follow existing test patterns in the file (mock electron, store, etc.).
- **Acceptance Criteria:** Tests verify both success and failure paths of codex preflight.
- **Testing Approach:** Unit test with mocked child_process.
- **Output:** Modified `tests/main/ipc-handlers.spec.ts`

#### T-008: AnalyzeStartPanel Conditional Rendering Tests

- **Type:** TEST
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Create `tests/renderer/AnalyzeStartPanel.spec.tsx`
  2. Test cases:
     - `agentAvailability.available = true` → renders normal panel with Analyze button
     - `agentAvailability.available = false` → renders disabled message, no button
     - Various reasons display correctly
     - projects=[] still shows its own message (existing behavior preserved)
  3. Use `@testing-library/react` and jsdom.
- **Acceptance Criteria:** All rendering states are covered.
- **Testing Approach:** Component render tests.
- **Output:** `tests/renderer/AnalyzeStartPanel.spec.tsx`

#### T-009: End-to-End Validation & Wiki Update

- **Type:** INTEGRATE
- **Wave:** 4 — SEQUENTIAL
- **Implementation Notes:**
  1. Run full test suite: `npm run test`
  2. Verify no regressions in existing tests.
  3. Update `wiki/` pages affected by FT-14F changes (agent sessions architecture, settings, configuration matrix).
  4. Update `feature-index.md` with FT-14F entry.
- **Acceptance Criteria:** All tests pass; wiki reflects current state; feature-index updated.
- **Testing Approach:** Integration.
- **Output:** Updated wiki pages + feature-index.md

### Risk Register

| Risk                                                                | Impact | Likelihood | Mitigation                                                                  |
| ------------------------------------------------------------------- | ------ | ---------- | --------------------------------------------------------------------------- |
| Codex binary check adds latency to session start                    | Low    | Medium     | 5s timeout already exists; check is fast on success                         |
| DashboardPage doesn't currently load all agent settings fields      | Medium | High       | T-004 extends the existing settings fetch; minor but must be verified       |
| SessionWorkspace may have complex prop threading                    | Low    | Low        | Follow existing patterns; component already receives settings-derived props |
| BYOK validation edge case: provider set but no base URL for generic | Medium | Low        | Validation already handles this; preflight mirrors validation logic         |

---

### Completeness Assessment

- Functional coverage: **High** — All 5 FRs from the brief are addressed
- Non-functional coverage: **High** — Test tasks cover all implementation tasks
- Task-to-requirement mapping: **Complete**
  - FR-PROV-001, FR-PROV-002, FR-PROV-003: Already implemented, verified by T-006
  - FR-PROV-004: T-001 + T-003 + T-004 + T-005
  - FR-PROV-005: T-001 + T-002 + T-003

### Status

**READY FOR APPROVAL**

---

## Questions for User

1. **Codex binary check caching**: Should the renderer cache the binary check result (e.g., check once per settings load) to avoid calling IPC each time the drawer opens, or is it acceptable to rely solely on the main-process preflight at session start?

2. **Copilot subscription "soft" preflight**: The Copilot subscription mode can't be validated upfront without an API call. Is it acceptable that subscription validity is only validated at runner execution time (with a clear error message), or should we add a "Test Copilot connection" button similar to the existing "Test ADO connection"?

3. **Claude with empty API key hint**: When Claude is selected manually and no API key is provided, should the blocking message say something like "Assicurati che Claude Code sia configurato localmente" (informational, non-blocking), or should it remain completely silent/non-blocking as it is now?
