## Spec-Planner — Iteration 1

### Feature Context

- **Feature:** LLM Provider Abstraction e Categorizzazione
- **Feature #:** feature-4
- **Feature Type:** backend (Main Process only)

---

## Part 1: Requirements

### Functional Requirements

#### Provider Abstraction

- **FR-LLM-001:** LLM Provider Interface
  - Description: Define a TypeScript interface `LLMProvider` with method `categorizeBugChunk(bugs: BugItem[], categories?: string[]): Promise<LLMCategorizeResult[]>` that all concrete providers must implement.
  - Acceptance Criteria: Given a provider implementing the interface, When `categorizeBugChunk` is called with a list of bugs, Then it returns results conforming to `LLMCategorizeResult[]` schema.
  - Priority: Must-Have

- **FR-LLM-002:** OpenAI Provider Implementation
  - Description: Concrete provider using the `openai` npm package. Uses `chat.completions.create` with the system prompt and user message per chunk. Model configurable (default: `gpt-4o`).
  - Acceptance Criteria: Given valid API key and bugs, When categorizing, Then returns valid `LLMCategorizeResult[]`.
  - Priority: Must-Have

- **FR-LLM-003:** Anthropic Provider Implementation
  - Description: Concrete provider using the `@anthropic-ai/sdk` package. Uses `messages.create` with system prompt and user message. Model configurable (default: `claude-sonnet-4-20250514`).
  - Acceptance Criteria: Given valid API key and bugs, When categorizing, Then returns valid `LLMCategorizeResult[]`.
  - Priority: Must-Have

- **FR-LLM-004:** GitHub Copilot Provider Implementation
  - Description: Concrete provider using `@github/copilot-sdk` with `CopilotClient()`. Authentication via already-authenticated GitHub user. Model configurable (default: `gpt-4.1`).
  - Acceptance Criteria: Given authenticated Copilot session, When categorizing, Then returns valid `LLMCategorizeResult[]`.
  - Priority: Must-Have

- **FR-LLM-005:** Gemini Provider Implementation
  - Description: Concrete provider using `@google/genai` package. Uses `generateContent` with system instruction and user message. Model configurable (default: `gemini-2.0-flash`).
  - Acceptance Criteria: Given valid API key and bugs, When categorizing, Then returns valid `LLMCategorizeResult[]`.
  - Priority: Must-Have

- **FR-LLM-006:** Provider Factory
  - Description: Factory function `createLLMProvider(settings: AppSettings): LLMProvider` that instantiates the correct provider based on `settings.llmProvider` and `settings.apiKey`.
  - Acceptance Criteria: Given settings with `llmProvider: 'openai'` and valid apiKey, When factory is called, Then returns an OpenAIProvider instance ready to use.
  - Priority: Must-Have

#### Prompt Engineering

- **FR-PROMPT-001:** System Prompt with Categories Constraint
  - Description: When `categories` array is non-empty, system prompt instructs LLM to use ONLY those categories as macroCategory values.
  - Acceptance Criteria: Given categories `['UI', 'Backend']`, When prompt is built, Then system prompt includes "Use ONLY these categories: UI, Backend".
  - Priority: Must-Have

- **FR-PROMPT-002:** System Prompt without Categories (Free Mode)
  - Description: When `categories` is empty or undefined, system prompt instructs LLM to freely assign categories based on content.
  - Acceptance Criteria: Given empty categories, When prompt is built, Then system prompt includes "Assign categories freely based on content".
  - Priority: Must-Have

- **FR-PROMPT-003:** User Message Format
  - Description: User message contains only the bug data as JSON array with fields `id`, `title`, `description` for each bug in the chunk.
  - Acceptance Criteria: Given bugs with id/title/description, When user message is built, Then it's a valid JSON array with only those fields.
  - Priority: Must-Have

#### Chunking & Orchestration

- **FR-CHUNK-001:** Chunk Splitting
  - Description: Utility function `splitIntoChunks<T>(items: T[], chunkSize: number): T[][]` splits input array into sub-arrays of at most `chunkSize` elements.
  - Acceptance Criteria: Given 33 bugs and chunkSize 15, When split, Then returns 3 chunks of sizes [15, 15, 3].
  - Priority: Must-Have

- **FR-CHUNK-002:** Progressive IPC Updates
  - Description: After each chunk is categorized, Main Process sends `ChunkProgress` to Renderer via `webContents.send(LLM_CATEGORIZE_PROGRESS, progress)` using the IPC event sender.
  - Acceptance Criteria: Given 3 chunks, When categorization runs, Then Renderer receives 3 progress events with increasing `completed` count.
  - Priority: Must-Have

- **FR-CHUNK-003:** IPC Categorize Handler
  - Description: The `LLM_CATEGORIZE` handler reads settings and session from store, splits bugs into chunks, processes each chunk sequentially via the provider, sends progress updates, and returns the full `CategorizedBug[]` array.
  - Acceptance Criteria: Given stored session with bugs, When handler is invoked, Then all bugs are categorized and returned as `CategorizedBug[]`.
  - Priority: Must-Have

- **FR-CHUNK-004:** Session Update After Categorization
  - Description: After all chunks complete, the session in store is updated with categorized bugs and `categorizedAt` timestamp.
  - Acceptance Criteria: Given successful categorization, When complete, Then store session has `categorizedAt` and bugs have category fields populated.
  - Priority: Must-Have

#### Response Validation

- **FR-VALID-001:** JSON Parse with Fallback
  - Description: If LLM response cannot be parsed as JSON, all bugs in that chunk are assigned macroCategory `'Non categorizzato'`, subCategory `'Errore parsing'`, categoryReason indicating parse failure.
  - Acceptance Criteria: Given malformed JSON response, When parsing, Then bugs in chunk get fallback categories without crashing.
  - Priority: Must-Have

- **FR-VALID-002:** Schema Validation
  - Description: Each item in `results` must have `bugId` (number), `macroCategory` (string), `subCategory` (string), `categoryReason` (string). Missing `bugId` → skip item with console warning. Empty string → replaced with `'N/D'`.
  - Acceptance Criteria: Given response with missing bugId in one item, When validated, Then that item is skipped, others are kept. Given empty `macroCategory`, Then replaced with `'N/D'`.
  - Priority: Must-Have

- **FR-VALID-003:** Unmatched Bugs Handling
  - Description: Bugs in the chunk that have no matching result from LLM (bugId not returned) are assigned fallback category `'Non categorizzato'` / `'Nessuna risposta LLM'`.
  - Acceptance Criteria: Given 5 bugs in chunk but LLM returns only 4 results, When merging, Then the missing bug gets fallback categories.
  - Priority: Must-Have

#### Error Handling

- **FR-ERR-001:** Rate Limit Retry with Backoff
  - Description: On HTTP 429 or rate-limit error from provider SDK, retry the chunk request up to 3 times with exponential backoff (delays: 2s, 4s, 8s).
  - Acceptance Criteria: Given 429 on first attempt and success on second, When categorizing, Then chunk succeeds after retry without user intervention.
  - Priority: Must-Have

- **FR-ERR-002:** Authentication Error
  - Description: On HTTP 401/403 or SDK auth error, throw AppError with code `LLM_AUTH_ERROR` and message `"Autenticazione non valida per {provider}"`.
  - Acceptance Criteria: Given invalid API key, When categorizing, Then IPC returns error with `LLM_AUTH_ERROR` code.
  - Priority: Must-Have

- **FR-ERR-003:** Timeout Handling
  - Description: Each LLM request has a 60-second timeout. On timeout, throw AppError with code `LLM_TIMEOUT` and message `"Timeout LLM su chunk {X}/{N}"`.
  - Acceptance Criteria: Given provider that doesn't respond within 60s, When categorizing, Then timeout error is thrown with chunk identification.
  - Priority: Must-Have

- **FR-ERR-004:** Copilot Unauthenticated
  - Description: When GitHub Copilot provider detects unauthenticated session, throw AppError with code `LLM_AUTH_ERROR` and specific message about Copilot authentication.
  - Acceptance Criteria: Given Copilot session not authenticated, When categorizing, Then error message mentions "Autenticazione GitHub Copilot richiesta".
  - Priority: Must-Have

#### Test Connection

- **FR-TEST-001:** LLM Test Connection
  - Description: `LLM_TEST_CONNECTION` handler instantiates the configured provider and sends a minimal test request (e.g., categorize a single fake bug) to verify connectivity and authentication.
  - Acceptance Criteria: Given valid credentials, When test is invoked, Then returns `{ success: true, message: 'Connessione {provider} riuscita' }`.
  - Priority: Should-Have

### Non-Functional Requirements

- **NFR-PERF-001:** Each chunk request should complete within 60 seconds (timeout).
- **NFR-PERF-002:** Backoff delays should not exceed 30 seconds total per chunk (2+4+8=14s max wait).
- **NFR-SEC-001:** API keys must never be logged or sent to Renderer process. They remain in encrypted store and are used only in Main Process.
- **NFR-SEC-002:** Provider SDK instantiation should not cache credentials beyond the single operation.
- **NFR-MAINT-001:** Adding a new provider requires only: implementing the interface, adding to factory switch, updating `LLMProviderType` union.

### Constraints

- All LLM logic runs in Electron Main Process only (no network calls from Renderer).
- Must use native `fetch` with AbortController for providers that need raw HTTP (or SDK-provided timeout mechanisms).
- Progressive updates use `event.sender` (webContents from IPC event) — not stored window references.
- Functional architecture pattern (exported functions, not classes) to match existing `ado-client.ts` style.
- Exception: Provider implementations can use a simple class or object literal to satisfy the interface — the choice is pragmatic since SDKs are OOP-oriented.

### Assumptions

- `@github/copilot-sdk` is available on npm and works in Electron Node.js context (not browser-only). **[NEEDS VALIDATION — see Risk Register]**
- `@google/genai` is the correct current package name for Google's Gemini API SDK.
- All 4 provider SDKs support Node.js 20+ (Electron 30's embedded Node).
- The Renderer will handle the `ChunkProgress` events and update UI accordingly (out of scope for this feature).
- `settings.chunkSize` default is 15 (already in store defaults).

### Out of Scope

- UI changes in Renderer to display progress or errors (handled by other features).
- Custom model selection UI (model names are hardcoded defaults for now; can be made configurable later).
- Streaming/SSE responses from LLM (full response per chunk is sufficient).
- Cost estimation or token counting.
- Caching/deduplication of previously categorized bugs.

### Edge Cases

| Scenario                                                   | Expected Behavior                                          | Related Requirement |
| ---------------------------------------------------------- | ---------------------------------------------------------- | ------------------- |
| Zero bugs in session                                       | Handler returns empty array immediately, no LLM calls      | FR-CHUNK-003        |
| Single bug (chunk size > total)                            | One chunk of 1 bug, one progress event, result returned    | FR-CHUNK-001        |
| LLM returns extra bugIds not in chunk                      | Extra results are ignored silently                         | FR-VALID-002        |
| LLM returns duplicate bugIds                               | First occurrence wins, duplicates ignored                  | FR-VALID-002        |
| All 3 retries fail on rate limit                           | Throw `LLM_RATE_LIMIT` AppError after 3rd failure          | FR-ERR-001          |
| LLM returns valid JSON but wrong schema (no `results` key) | Treated as parse error, fallback applied                   | FR-VALID-001        |
| API key is empty string                                    | Throw `LLM_AUTH_ERROR` before making any request           | FR-ERR-002          |
| Chunk size is 0 or negative in settings                    | Default to 15; defensive check in chunking                 | FR-CHUNK-001        |
| Network disconnect mid-categorization                      | Timeout fires after 60s on current chunk, error propagated | FR-ERR-003          |
| Provider SDK throws unexpected error                       | Caught by generic try/catch, mapped to `UNKNOWN_ERROR`     | All                 |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 11
- **Parallelizable:** 6 (55%)
- **Execution Waves:** 4

### Execution Waves

#### Wave 1 — Setup & Foundation

**Execution:** PARALLEL

| Task ID | Type      | Title                                                       | Files                                                                          | Depends On | Complexity |
| ------- | --------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------- | ---------- |
| T-001   | SETUP     | Install LLM SDK dependencies                                | `package.json`                                                                 | None       | S          |
| T-002   | IMPLEMENT | Provider interface, types, prompt builder, chunking utility | `src/main/llm/types.ts`, `src/main/llm/prompts.ts`, `src/main/llm/chunking.ts` | None       | S          |

#### Wave 2 — Provider Implementations

**Execution:** PARALLEL

| Task ID | Type      | Title                   | Files                                          | Depends On | Complexity |
| ------- | --------- | ----------------------- | ---------------------------------------------- | ---------- | ---------- |
| T-003   | IMPLEMENT | OpenAI Provider         | `src/main/llm/providers/openai-provider.ts`    | T-002      | M          |
| T-004   | IMPLEMENT | Anthropic Provider      | `src/main/llm/providers/anthropic-provider.ts` | T-002      | M          |
| T-005   | IMPLEMENT | GitHub Copilot Provider | `src/main/llm/providers/copilot-provider.ts`   | T-002      | M          |
| T-006   | IMPLEMENT | Gemini Provider         | `src/main/llm/providers/gemini-provider.ts`    | T-002      | M          |

#### Wave 3 — Orchestration

**Execution:** SEQUENTIAL

| Task ID | Type      | Title                                                 | Files                                                                    | Depends On                 | Complexity |
| ------- | --------- | ----------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------- | ---------- |
| T-007   | IMPLEMENT | Provider factory + response validator                 | `src/main/llm/provider-factory.ts`, `src/main/llm/response-validator.ts` | T-003, T-004, T-005, T-006 | M          |
| T-008   | IMPLEMENT | LLM Service (categorization orchestration with retry) | `src/main/llm/llm-service.ts`                                            | T-007, T-002               | L          |

#### Wave 4 — Integration

**Execution:** SEQUENTIAL

| Task ID | Type      | Title                                     | Files                      | Depends On   | Complexity |
| ------- | --------- | ----------------------------------------- | -------------------------- | ------------ | ---------- |
| T-009   | INTEGRATE | Wire IPC handlers to LLM service          | `src/main/ipc-handlers.ts` | T-008        | M          |
| T-010   | IMPLEMENT | LLM barrel export (index)                 | `src/main/llm/index.ts`    | T-007, T-008 | S          |
| T-011   | TEST      | Manual integration verification checklist | (documentation only)       | T-009        | S          |

### Critical Path

T-002 → T-003 (any provider) → T-007 → T-008 → T-009 (critical path: 5 tasks)

### Task Details

---

#### T-001: Install LLM SDK Dependencies

- **Type:** SETUP
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Run `npm install openai @anthropic-ai/sdk @google/genai @github/copilot-sdk`
  2. Verify packages resolve correctly in `node_modules`
  3. If `@github/copilot-sdk` is unavailable, document in risk register and stub with raw HTTP calls
- **Acceptance Criteria:** All 4 packages in `dependencies` section of package.json, `npm install` succeeds
- **Testing Approach:** Post-implementation: `npm ls openai @anthropic-ai/sdk @google/genai @github/copilot-sdk`
- **Output:** Updated `package.json`, `package-lock.json`

---

#### T-002: Provider Interface, Types, Prompt Builder, Chunking Utility

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Create `src/main/llm/types.ts`:
     - `LLMProvider` interface with `categorizeBugChunk(bugs: BugItem[], categories?: string[]): Promise<LLMCategorizeResult[]>`
     - `LLMProviderConfig` type: `{ apiKey: string; model?: string; timeout?: number }`
  2. Create `src/main/llm/prompts.ts`:
     - `buildSystemPrompt(categories?: string[]): string` — standard system prompt with conditional categories constraint
     - `buildUserMessage(bugs: BugItem[]): string` — JSON array of `{ id, title, description }` per bug
  3. Create `src/main/llm/chunking.ts`:
     - `splitIntoChunks<T>(items: T[], chunkSize: number): T[][]`
     - Defensive: if chunkSize <= 0, default to 15
- **Acceptance Criteria:**
  - Interface compiles correctly
  - `buildSystemPrompt(['UI','Backend'])` includes the categories constraint text
  - `buildSystemPrompt([])` includes free-categorization text
  - `splitIntoChunks([1..33], 15)` returns `[[1..15],[16..30],[31..33]]`
- **Testing Approach:** Verify via TypeScript compilation + unit logic check
- **Output:** `src/main/llm/types.ts`, `src/main/llm/prompts.ts`, `src/main/llm/chunking.ts`

---

#### T-003: OpenAI Provider

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `src/main/llm/providers/openai-provider.ts`
  2. Import `OpenAI` from `openai` SDK
  3. Implement `LLMProvider` interface:
     - Constructor: instantiate `OpenAI({ apiKey })` client
     - `categorizeBugChunk`: call `client.chat.completions.create` with model (default `gpt-4o`), system message from `buildSystemPrompt`, user message from `buildUserMessage`, `response_format: { type: 'json_object' }`, timeout via AbortController
  4. Error mapping: catch SDK errors, map `status === 401` → `LLM_AUTH_ERROR`, `status === 429` → `LLM_RATE_LIMIT`, timeout → `LLM_TIMEOUT`
  5. Parse `response.choices[0].message.content` as JSON, return `results` array
- **Acceptance Criteria:** Given valid API key and bugs, provider returns parsed `LLMCategorizeResult[]`
- **Testing Approach:** Manual test with real API key
- **Output:** `src/main/llm/providers/openai-provider.ts`

---

#### T-004: Anthropic Provider

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `src/main/llm/providers/anthropic-provider.ts`
  2. Import `Anthropic` from `@anthropic-ai/sdk`
  3. Implement `LLMProvider` interface:
     - Constructor: instantiate `Anthropic({ apiKey })` client
     - `categorizeBugChunk`: call `client.messages.create` with model (default `claude-sonnet-4-20250514`), `system` parameter for system prompt, `messages: [{ role: 'user', content: userMessage }]`, `max_tokens: 4096`
  4. Error mapping: `status === 401` → `LLM_AUTH_ERROR`, `status === 429` → `LLM_RATE_LIMIT`, `status === 529` → `LLM_RATE_LIMIT`
  5. Parse `response.content[0].text` as JSON, return `results` array
- **Acceptance Criteria:** Given valid API key and bugs, provider returns parsed `LLMCategorizeResult[]`
- **Testing Approach:** Manual test with real API key
- **Output:** `src/main/llm/providers/anthropic-provider.ts`

---

#### T-005: GitHub Copilot Provider

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `src/main/llm/providers/copilot-provider.ts`
  2. Import from `@github/copilot-sdk` (CopilotClient or equivalent)
  3. Implement `LLMProvider` interface:
     - Constructor: instantiate `CopilotClient()` — uses ambient GitHub auth
     - `categorizeBugChunk`: call appropriate chat method with system+user messages, model `gpt-4.1`
  4. Authentication check: if client reports unauthenticated, throw `LLM_AUTH_ERROR` with message "Autenticazione GitHub Copilot richiesta"
  5. Parse response content as JSON, return `results` array
  6. **NOTE:** If SDK is unavailable or doesn't work in Electron context, implement as stub that throws `LLM_AUTH_ERROR` with message about SDK unavailability, and document in comments what to replace when SDK becomes available
- **Acceptance Criteria:** Given authenticated Copilot session, provider returns parsed `LLMCategorizeResult[]`. Given unauthenticated session, throws `LLM_AUTH_ERROR`.
- **Testing Approach:** Manual test with authenticated GitHub session (or verify stub behavior)
- **Output:** `src/main/llm/providers/copilot-provider.ts`

---

#### T-006: Gemini Provider

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `src/main/llm/providers/gemini-provider.ts`
  2. Import `GoogleGenAI` from `@google/genai`
  3. Implement `LLMProvider` interface:
     - Constructor: instantiate `GoogleGenAI({ apiKey })` client
     - `categorizeBugChunk`: call `client.models.generateContent` with model (default `gemini-2.0-flash`), system instruction from `buildSystemPrompt`, user content from `buildUserMessage`, `responseMimeType: 'application/json'`
  4. Error mapping: map auth errors → `LLM_AUTH_ERROR`, 429 → `LLM_RATE_LIMIT`
  5. Parse `response.text` as JSON, return `results` array
- **Acceptance Criteria:** Given valid API key and bugs, provider returns parsed `LLMCategorizeResult[]`
- **Testing Approach:** Manual test with real API key
- **Output:** `src/main/llm/providers/gemini-provider.ts`

---

#### T-007: Provider Factory + Response Validator

- **Type:** IMPLEMENT
- **Wave:** 3 — SEQUENTIAL
- **Implementation Notes:**
  1. Create `src/main/llm/provider-factory.ts`:
     - `createLLMProvider(settings: AppSettings): LLMProvider`
     - Switch on `settings.llmProvider`: instantiate correct provider with `settings.apiKey`
     - Validate apiKey not empty for openai/anthropic/gemini (throw `LLM_AUTH_ERROR` if missing)
     - For github-copilot: no apiKey needed, but validate copilotAuthStatus if available
  2. Create `src/main/llm/response-validator.ts`:
     - `parseAndValidateLLMResponse(raw: string, chunkBugIds: number[]): LLMCategorizeResult[]`
     - Try `JSON.parse(raw)` → on failure, return fallback results for all bugs
     - Validate `results` array exists
     - For each item: skip if no `bugId`, replace empty strings with `'N/D'`
     - For bugs in chunk with no matching result: add fallback entry
- **Acceptance Criteria:**
  - Factory returns correct provider type for each `llmProvider` value
  - Validator handles: valid JSON, malformed JSON, missing fields, extra items, missing items
- **Testing Approach:** Unit-level verification of validator logic with various malformed inputs
- **Output:** `src/main/llm/provider-factory.ts`, `src/main/llm/response-validator.ts`

---

#### T-008: LLM Service (Categorization Orchestration with Retry)

- **Type:** IMPLEMENT
- **Wave:** 3 — SEQUENTIAL
- **Implementation Notes:**
  1. Create `src/main/llm/llm-service.ts`:
  2. Export `async function categorizeBugs(settings: AppSettings, bugs: BugItem[], sendProgress: (progress: ChunkProgress) => void): Promise<CategorizedBug[]>`
  3. Implementation flow:
     - Create provider via factory
     - Split bugs into chunks using `splitIntoChunks(bugs, settings.chunkSize)`
     - For each chunk:
       a. Call `retryWithBackoff(() => provider.categorizeBugChunk(chunk, settings.categories), 3)`
       b. Validate response via `parseAndValidateLLMResponse`
       c. Merge results with original bug data → `CategorizedBug[]` (add `categorizedAt` timestamp)
       d. Call `sendProgress({ total: chunks.length, completed: i+1, currentChunk: categorizedChunk })`
     - Return all `CategorizedBug[]` concatenated
  4. `retryWithBackoff` helper:
     - Catches errors with code `LLM_RATE_LIMIT`
     - Retries up to `maxRetries` with delays [2000, 4000, 8000] ms
     - On final failure: re-throw the error
     - Non-rate-limit errors: re-throw immediately (no retry)
  5. Export `async function testLLMConnection(settings: AppSettings): Promise<TestConnectionResult>`
     - Instantiate provider, send a minimal single-bug test request
     - Return `{ success: true, message }` or `{ success: false, message }` with error detail
- **Acceptance Criteria:**
  - Full flow: bugs in → CategorizedBug[] out with progress callbacks
  - Rate limit on chunk 2 of 3: retries chunk 2, then continues to chunk 3
  - Auth error: immediately propagated, no retry
  - Parse error: chunk bugs get fallback, processing continues to next chunk
- **Testing Approach:** Integration test with mock provider
- **Output:** `src/main/llm/llm-service.ts`

---

#### T-009: Wire IPC Handlers to LLM Service

- **Type:** INTEGRATE
- **Wave:** 4 — SEQUENTIAL
- **Implementation Notes:**
  1. Modify `src/main/ipc-handlers.ts`:
  2. Import `categorizeBugs`, `testLLMConnection` from `./llm/llm-service`
  3. Replace `LLM_CATEGORIZE` stub:
     - Get settings from store
     - Get session from store (extract `bugs: BugItem[]`)
     - Validate: settings exist, session has bugs
     - Use `event.sender` (webContents) to send progress: `const sendProgress = (p) => event.sender.send(IPC_CHANNELS.LLM_CATEGORIZE_PROGRESS, p)`
     - Call `categorizeBugs(settings, bugs, sendProgress)`
     - Update store session with categorized results and `categorizedAt`
     - Return categorized bugs
  4. Replace `LLM_TEST_CONNECTION` stub:
     - Get settings from store
     - Call `testLLMConnection(settings)`
     - Return result
  5. Update IPC handler signature: `ipcMain.handle` callback receives `(event, ...args)` — use `event` parameter (currently `_event` in ADO handlers pattern, but we need it here)
- **Acceptance Criteria:**
  - Invoking `categorizeBugs()` from Renderer triggers full categorization flow
  - Progress events arrive in Renderer during processing
  - Session is updated in store after completion
  - Errors propagate as AppError objects
- **Testing Approach:** End-to-end manual test
- **Output:** Modified `src/main/ipc-handlers.ts`

---

#### T-010: LLM Barrel Export

- **Type:** IMPLEMENT
- **Wave:** 4 — PARALLEL with T-009
- **Implementation Notes:**
  1. Create `src/main/llm/index.ts` barrel file
  2. Re-export public API: `categorizeBugs`, `testLLMConnection`, `createLLMProvider`, `splitIntoChunks`
  3. Keep internal modules (providers, validator, prompts) non-exported to limit surface area
- **Acceptance Criteria:** `import { categorizeBugs, testLLMConnection } from './llm'` works from ipc-handlers
- **Testing Approach:** TypeScript compilation
- **Output:** `src/main/llm/index.ts`

---

#### T-011: Integration Verification Checklist

- **Type:** TEST
- **Wave:** 4 — SEQUENTIAL (after T-009)
- **Implementation Notes:**
  Manual verification scenarios:
  1. Configure OpenAI API key → fetch bugs → categorize → verify progressive updates + final result
  2. Configure invalid API key → categorize → verify `LLM_AUTH_ERROR` message
  3. Configure Gemini → categorize → verify same schema output
  4. Simulate rate limit (reduce quota) → verify retry + eventual success/failure
  5. Verify `chunkSize` setting is respected (change to 5, check progress events count)
  6. Verify JSON parse fallback: (force malformed response via network intercept or mock)
- **Acceptance Criteria:** All 6 scenarios pass as described
- **Testing Approach:** Manual integration testing
- **Output:** Test results documented

---

### Risk Register

| Risk                                                                      | Impact                            | Likelihood | Mitigation                                                                                                                         |
| ------------------------------------------------------------------------- | --------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `@github/copilot-sdk` not available on npm or incompatible with Electron  | Cannot implement Copilot provider | Medium     | Implement as documented stub; explore alternative: raw HTTP to Copilot API endpoint with GitHub token                              |
| `@google/genai` package name incorrect or API changed                     | Gemini provider fails to compile  | Low        | Fallback to `@google/generative-ai` (older package name); check npm registry before install                                        |
| LLM SDKs bundle browser-only code incompatible with Electron main process | Runtime errors                    | Low        | All 3 major SDKs (openai, anthropic, google) officially support Node.js; test at install time                                      |
| Rate limit backoff insufficient for OpenAI heavy usage                    | Persistent 429 errors             | Medium     | User can reduce chunk parallelism; consider making max retries configurable in future                                              |
| Large bug descriptions exceed LLM context window                          | Truncated or failed responses     | Medium     | Add description truncation in `buildUserMessage` (e.g., max 500 chars per bug); document as future enhancement if not critical now |

---

### Completeness Assessment

- Functional coverage: **High** — All PRD requirements mapped to specific FRs
- Non-functional coverage: **High** — Security, performance, maintainability addressed
- Task-to-requirement mapping: **Complete** — Every FR has at least one task implementing it

### Status

**READY FOR APPROVAL**

---

## Questions for User

1. **Copilot SDK availability:** Is `@github/copilot-sdk` confirmed available on npm for Node.js/Electron usage, or should we plan a fallback approach (e.g., raw GitHub API with token-based auth)?

2. **Description truncation:** Should we truncate bug descriptions in the user message to prevent context window overflow (e.g., max 500 characters per bug), or send full descriptions and let the LLM handle truncation?

3. **Error recovery granularity:** On a chunk timeout/failure (non-rate-limit), should categorization abort entirely, or should it continue with remaining chunks and mark the failed chunk's bugs as 'Non categorizzato'?
