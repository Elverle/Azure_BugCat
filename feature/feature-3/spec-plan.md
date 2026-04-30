# Spec-Planner — Iteration 1

## Feature Context

- **Feature:** Recupero Bug da Azure DevOps
- **Feature #:** feature-3
- **Feature ID:** FT-03
- **Feature Type:** backend (Main Process)

---

## Part 1: Requirements

### Functional Requirements

#### ADO Query Execution

- **FR-ADO-001:** Execute Saved Query via WIQL endpoint
  - Description: Call `GET {orgUrl}/{projectName}/_apis/wit/wiql/{queryId}?api-version=7.0` using stored settings (orgUrl, projectName, queryId) to retrieve the list of Work Item IDs.
  - Acceptance Criteria: Given a valid PAT + queryId, When fetchBugs is invoked, Then the handler returns the list of work item IDs from the query result.
  - Priority: Must-Have

- **FR-ADO-002:** Fetch Work Item details in batches of 200
  - Description: Call `GET {orgUrl}/{projectName}/_apis/wit/workitems?ids={csv}&fields={fields}&api-version=7.0` with up to 200 IDs per request. Loop until all IDs are fetched.
  - Acceptance Criteria: Given 450 work item IDs, When batch fetch executes, Then 3 HTTP calls are made (200+200+50) and all items are returned.
  - Priority: Must-Have

- **FR-ADO-003:** Respect Top N limit
  - Description: Before batching, truncate the work item ID list to `topN` (from settings). Never fetch more IDs than configured.
  - Acceptance Criteria: Given topN=20 and query returns 500 IDs, When fetchBugs executes, Then only 20 work items are fetched.
  - Priority: Must-Have

- **FR-ADO-004:** Map ADO fields to BugItem
  - Description: Map the following ADO fields to `BugItem`: System.Id → id, System.Title → title, System.State → state, System.AssignedTo → assignee (display name or null), System.AreaPath → areaPath, System.Description → description (after HTML→text), Microsoft.VSTS.Common.Priority → priority, System.CreatedDate → createdDate, System.ChangedDate → updatedDate, System.Tags → tags (split by "; "). Tags are also used downstream as category hints.
  - Fields list (ADO_FIELDS constant): `System.Id`, `System.Title`, `System.State`, `System.AssignedTo`, `System.AreaPath`, `System.Description`, `Microsoft.VSTS.Common.Priority`, `System.CreatedDate`, `System.ChangedDate`, `System.Tags`
  - Acceptance Criteria: Given a raw ADO work item response, When mapped, Then all BugItem fields are correctly populated including tags split from the semicolon-separated string.
  - Priority: Must-Have

- **FR-ADO-005:** Convert HTML description to semantically-formatted plain text
  - Description: Preserve semantic structure during HTML→text conversion. Block-level tags (`<p>`, `<div>`, `<br>`, `<h1>`-`<h6>`) → `\n`. List items `<li>` → `\n- ` (bullet). `<pre>` and `<code>` blocks → content preserved verbatim with surrounding newlines. Tables: each `<td>`/`<th>` separated by `|`, rows separated by `\n`. Strip remaining inline tags. Decode common HTML entities (&amp; &lt; &gt; &quot; &#39; &nbsp; + numeric entities). Normalize consecutive blank lines to max double newline. Trim result.
  - Acceptance Criteria: Given `<p>Hello &amp; <b>World</b></p><pre>code here</pre>`, When converted, Then result preserves paragraph break and code block formatting.
  - Priority: Must-Have

- **FR-ADO-006:** Authenticate with Basic auth
  - Description: All ADO API calls include header `Authorization: Basic base64(':' + PAT)`. PAT is read from encrypted store at call time.
  - Acceptance Criteria: Given a stored PAT, When an API call is made, Then the Authorization header contains the correct Basic token.
  - Priority: Must-Have

#### ADO Test Connection

- **FR-ADO-007:** Test Connection endpoint
  - Description: IPC handler `ado:test-connection` validates connectivity by executing the WIQL query endpoint and returning success/failure with a human-readable message.
  - Acceptance Criteria: Given valid settings, When testAdoConnection is invoked, Then `{ success: true, message: 'Connessione riuscita — N bug trovati' }` is returned.
  - Priority: Must-Have

#### Error Handling

- **FR-ERR-001:** PAT invalid (HTTP 401/403) → AppError with code `ADO_AUTH_ERROR`
  - Description: If ADO returns 401 or 403, throw AppError `{ code: 'ADO_AUTH_ERROR', message: 'PAT non valido o scaduto' }`.
  - Acceptance Criteria: Given an invalid PAT, When fetchBugs is invoked, Then AppError with code ADO_AUTH_ERROR is returned.
  - Priority: Must-Have

- **FR-ERR-002:** Query not found (HTTP 404) → AppError with code `ADO_NOT_FOUND`
  - Description: If WIQL endpoint returns 404, throw AppError `{ code: 'ADO_NOT_FOUND', message: 'Query non trovata nel progetto' }`.
  - Acceptance Criteria: Given a non-existent queryId, When fetchBugs is invoked, Then AppError with code ADO_NOT_FOUND is returned.
  - Priority: Must-Have

- **FR-ERR-003:** Empty result → AppError with code `ADO_EMPTY`
  - Description: If query returns 0 work items, throw AppError `{ code: 'ADO_EMPTY', message: 'Nessun bug trovato nella query' }`.
  - Acceptance Criteria: Given a query that returns 0 results, When fetchBugs is invoked, Then AppError with code ADO_EMPTY is returned.
  - Priority: Must-Have

- **FR-ERR-004:** Network/timeout → AppError with code `ADO_TIMEOUT`
  - Description: If fetch fails due to network error or exceeds 30s timeout, throw AppError `{ code: 'ADO_TIMEOUT', message: 'Impossibile contattare Azure DevOps' }`.
  - Acceptance Criteria: Given a network failure, When fetchBugs is invoked, Then AppError with code ADO_TIMEOUT is returned.
  - Priority: Must-Have

#### Architecture — Query Strategy

- **FR-ARCH-001:** QueryStrategy interface definition
  - Description: Define a `QueryStrategy` interface with method `getWorkItemIds(settings): Promise<number[]>`. Implement `SavedQueryStrategy` for v1. The interface enables future `CustomWIQLStrategy`.
  - Acceptance Criteria: The interface exists and `SavedQueryStrategy` implements it.
  - Priority: Should-Have

---

### Non-Functional Requirements

- **NFR-PERF-001:** 200 bugs fetched in < 10 seconds on standard broadband connection.
- **NFR-SEC-001:** PAT is never logged, never sent to Renderer, never included in error details.
- **NFR-SEC-002:** All API calls use HTTPS only (orgUrl must start with `https://`).
- **NFR-REL-001:** Timeout of 30 seconds per individual HTTP request (AbortController).
- **NFR-MAINT-001:** ADO service module is a standalone file (`src/main/ado-service.ts`) with no Electron imports — testable in isolation.
- **NFR-MAINT-002:** HTML→text utility is a standalone file (`src/main/utils/html-to-text.ts`) — pure function, no side effects.

---

### Constraints

- Electron 30+ provides native `fetch` — no external HTTP library needed.
- Main Process only — no network calls from Renderer or Preload.
- ADO REST API version 7.0.
- Batch size is fixed at 200 (ADO API limit for work items endpoint).
- No new npm dependencies.

---

### Assumptions

- The user has a valid Azure DevOps PAT with `Work Items (Read)` scope.
- The `orgUrl` stored in settings includes the organization (e.g., `https://dev.azure.com/myorg`).
- The Saved Query referenced by `queryId` returns flat results (not tree/hierarchical).
- Electron's Node.js runtime provides native `fetch` with `AbortSignal` support.

---

### Out of Scope

- UI changes (buttons, loading states, error toasts) — already wired.
- Rich HTML parsing (tables, images, lists) — deferred to v2.
- Custom WIQL query execution — interface only, no implementation.
- Retry logic — not in v1 scope.
- Pagination of work items endpoint itself (it returns all requested IDs in one call, up to 200).
- Work item link/relation traversal.
- Caching of ADO responses.

---

### Edge Cases

| Scenario                                                 | Expected Behavior                                                 | Related Requirement    |
| -------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------- |
| PAT has expired                                          | AppError ADO_AUTH_ERROR returned                                  | FR-ERR-001             |
| queryId is empty string                                  | Validation error before API call                                  | FR-ERR-002             |
| orgUrl missing trailing slash or has one                 | Normalize URL (strip trailing slash)                              | FR-ADO-006             |
| Query returns exactly 200 items, topN=200                | Single batch call, all items returned                             | FR-ADO-002, FR-ADO-003 |
| Query returns 1 item                                     | Single batch call with 1 ID                                       | FR-ADO-002             |
| Description field is null/undefined                      | description set to empty string                                   | FR-ADO-004             |
| Description contains only HTML tags (no text)            | description set to empty string after strip                       | FR-ADO-005             |
| Tags field is null or empty string                       | tags set to empty array                                           | FR-ADO-004             |
| AssignedTo is unassigned                                 | assignee set to null                                              | FR-ADO-004             |
| orgUrl does not start with https://                      | AppError or validation failure                                    | NFR-SEC-002            |
| ADO returns partial batch failure (e.g., 1 item deleted) | Skip missing items, return available ones                         | FR-ADO-002             |
| topN = 0                                                 | Treat as "fetch all" or throw validation error (recommend: throw) | FR-ADO-003             |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 8
- **Parallelizable:** 4 (50%)
- **Execution Waves:** 4

---

### Execution Waves

#### Wave 1 — Foundation (Types & Utilities)

**Execution:** PARALLEL

| Task ID | Type      | Title                               | Files                            | Depends On | Complexity |
| ------- | --------- | ----------------------------------- | -------------------------------- | ---------- | ---------- |
| T-001   | IMPLEMENT | HTML-to-text utility                | `src/main/utils/html-to-text.ts` | None       | S          |
| T-002   | IMPLEMENT | QueryStrategy interface + ADO types | `src/main/ado/types.ts`          | None       | S          |

#### Wave 2 — Core Service

**Execution:** SEQUENTIAL

| Task ID | Type      | Title                                                | Files                         | Depends On          | Complexity |
| ------- | --------- | ---------------------------------------------------- | ----------------------------- | ------------------- | ---------- |
| T-003   | IMPLEMENT | ADO HTTP client (low-level fetch wrapper)            | `src/main/ado/ado-client.ts`  | T-002               | M          |
| T-004   | IMPLEMENT | ADO Service (orchestration: query + batch + mapping) | `src/main/ado/ado-service.ts` | T-001, T-002, T-003 | L          |

#### Wave 3 — IPC Integration

**Execution:** SEQUENTIAL

| Task ID | Type      | Title                            | Files                      | Depends On | Complexity |
| ------- | --------- | -------------------------------- | -------------------------- | ---------- | ---------- |
| T-005   | INTEGRATE | Wire IPC handlers to ADO service | `src/main/ipc-handlers.ts` | T-004      | M          |

#### Wave 4 — Testing

**Execution:** PARALLEL

| Task ID | Type | Title                                   | Files                                           | Depends On | Complexity |
| ------- | ---- | --------------------------------------- | ----------------------------------------------- | ---------- | ---------- |
| T-006   | TEST | Unit tests — html-to-text               | `src/main/utils/__tests__/html-to-text.test.ts` | T-001      | S          |
| T-007   | TEST | Unit tests — ADO service (mocked fetch) | `src/main/ado/__tests__/ado-service.test.ts`    | T-004      | M          |
| T-008   | TEST | Unit tests — ADO client error mapping   | `src/main/ado/__tests__/ado-client.test.ts`     | T-003      | S          |

---

### Critical Path

T-002 → T-003 → T-004 → T-005 (critical path: 4 tasks)

---

### Task Details

#### T-001: HTML-to-text utility (semantic preservation)

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Files:** `src/main/utils/html-to-text.ts`
- **Implementation Notes:**
  1. Export function `htmlToText(html: string | null | undefined): string`
  2. Return empty string if input is null/undefined/empty
  3. Extract and preserve `<pre>` / `<code>` blocks verbatim (placeholder, then re-insert after processing)
  4. Replace block-level closing/self-closing tags with `\n`:
     - `<br>`, `<br/>`, `<br />` → `\n`
     - `</p>`, `</div>`, `</h1>`..`</h6>` → `\n\n`
     - `<li>` → `\n- ` (bullet point)
     - `</tr>` → `\n` (table row separator)
     - `<td>`, `<th>` (not first in row) → `|` (cell separator)
  5. Strip all remaining HTML tags via regex `/<[^>]*>/g`
  6. Decode HTML entities: `&amp;` → `&`, `&lt;` → `<`, `&gt;` → `>`, `&quot;` → `"`, `&#39;` → `'`, `&nbsp;` → ` `, `&#xNN;` / `&#NNN;` numeric entities
  7. Re-insert preserved `<pre>`/`<code>` content (already decoded entities inside)
  8. Normalize multiple consecutive spaces (not newlines) to single space per line
  9. Normalize 3+ consecutive newlines to double newline
  10. Trim result
- **Acceptance Criteria:** Pure function, no dependencies, handles null input, preserves semantic structure (paragraphs, lists, code blocks, basic tables), decodes entities.
- **Testing Approach:** TDD-friendly — unit test covers various HTML snippets including ADO-typical descriptions with tables, code blocks, and lists.
- **Output:** `src/main/utils/html-to-text.ts`

---

#### T-002: QueryStrategy interface + ADO types

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Files:** `src/main/ado/types.ts`
- **Implementation Notes:**
  1. Define `QueryStrategy` interface:
     ```typescript
     export interface QueryStrategy {
       getWorkItemIds(config: AdoConnectionConfig): Promise<number[]>
     }
     ```
  2. Define `AdoConnectionConfig`:
     ```typescript
     export interface AdoConnectionConfig {
       orgUrl: string
       projectName: string
       queryId: string
       pat: string
       topN: number
     }
     ```
  3. Define ADO API response types:
     ```typescript
     export interface WiqlResponse {
       workItems: Array<{ id: number; url: string }>
     }
     export interface WorkItemResponse {
       count: number
       value: Array<WorkItemRaw>
     }
     export interface WorkItemRaw {
       id: number
       fields: Record<string, unknown>
     }
     ```
  4. Define constant `ADO_FIELDS` — array of field reference names needed.
  5. Define constant `ADO_BATCH_SIZE = 200`.
- **Acceptance Criteria:** All types exported, no runtime logic, no external dependencies.
- **Testing Approach:** N/A (type definitions).
- **Output:** `src/main/ado/types.ts`

---

#### T-003: ADO HTTP client

- **Type:** IMPLEMENT
- **Wave:** 2 — SEQUENTIAL
- **Files:** `src/main/ado/ado-client.ts`
- **Implementation Notes:**
  1. Export class `AdoClient` (or plain functions — functions preferred for simplicity).
  2. Internal helper `buildAuthHeader(pat: string): string` → `Basic ${Buffer.from(':' + pat).toString('base64')}`
  3. Internal helper `buildBaseUrl(orgUrl: string, projectName: string): string` — normalizes trailing slash.
  4. Export `async function fetchWiqlQuery(config: AdoConnectionConfig): Promise<WiqlResponse>`
     - URL: `{baseUrl}/{project}/_apis/wit/wiql/{queryId}?api-version=7.0`
     - Method: GET
     - Headers: Authorization + Accept: application/json
     - Timeout: 30s via AbortController + setTimeout
     - Error mapping: 401/403 → ADO_AUTH_ERROR, 404 → ADO_NOT_FOUND, timeout/network → ADO_TIMEOUT
  5. Export `async function fetchWorkItemsBatch(config: AdoConnectionConfig, ids: number[], fields: string[]): Promise<WorkItemRaw[]>`
     - URL: `{baseUrl}/{project}/_apis/wit/workitems?ids={csv}&fields={csv}&api-version=7.0`
     - Same auth, timeout, error mapping
  6. All functions throw `AppError` on failure (imported from shared/types).
  7. Validate `orgUrl` starts with `https://` before any call.
- **Acceptance Criteria:** Functions perform HTTP calls with correct URL construction, auth header, timeout, and error mapping.
- **Dependencies:** T-002 (types)
- **Testing Approach:** Unit test with mocked global `fetch`.
- **Output:** `src/main/ado/ado-client.ts`

---

#### T-004: ADO Service (orchestration)

- **Type:** IMPLEMENT
- **Wave:** 2 — SEQUENTIAL (after T-003)
- **Files:** `src/main/ado/ado-service.ts`
- **Implementation Notes:**
  1. Export `async function fetchBugsFromQuery(settings: AppSettings): Promise<BugItem[]>`
  2. Build `AdoConnectionConfig` from `AppSettings`.
  3. Validate required fields (orgUrl, projectName, queryId, pat) — throw AppError if missing.
  4. Implement `SavedQueryStrategy`:
     - Call `fetchWiqlQuery` → get IDs
     - If 0 IDs → throw ADO_EMPTY
     - Slice to `topN` (if topN > 0)
     - Chunk IDs into batches of `ADO_BATCH_SIZE`
     - For each batch, call `fetchWorkItemsBatch`
     - Flatten results
  5. Map each `WorkItemRaw` → `BugItem` using `mapWorkItemToBug()` helper:
     - Use `htmlToText()` for description
     - Parse tags string by `"; "` delimiter → string[]
     - AssignedTo: extract `displayName` from identity object, or null
     - Handle null/undefined fields gracefully
  6. Return `BugItem[]`
  7. Export `async function testAdoConnection(settings: AppSettings): Promise<TestConnectionResult>`
     - Calls `fetchWiqlQuery`
     - Returns `{ success: true, message: 'Connessione riuscita — N bug trovati' }` with actual count
     - On error: returns `{ success: false, message: error.message }`
- **Acceptance Criteria:** Full orchestration working, batching correct, mapping correct, errors propagated.
- **Dependencies:** T-001, T-002, T-003
- **Testing Approach:** Unit test with mocked `ado-client` functions.
- **Output:** `src/main/ado/ado-service.ts`

---

#### T-005: Wire IPC handlers to ADO service

- **Type:** INTEGRATE
- **Wave:** 3 — SEQUENTIAL
- **Files:** `src/main/ipc-handlers.ts`
- **Implementation Notes:**
  1. Import `fetchBugsFromQuery` and `testAdoConnection` from `./ado/ado-service`
  2. Replace `ADO_FETCH_BUGS` placeholder:
     ```typescript
     ipcMain.handle(IPC_CHANNELS.ADO_FETCH_BUGS, async () => {
       const settings = store.get('settings') as AppSettings
       return fetchBugsFromQuery(settings)
     })
     ```
  3. Replace `ADO_TEST_CONNECTION` placeholder:
     ```typescript
     ipcMain.handle(IPC_CHANNELS.ADO_TEST_CONNECTION, async () => {
       const settings = store.get('settings') as AppSettings
       return testAdoConnection(settings)
     })
     ```
  4. IPC handlers catch `AppError` and re-throw (Electron serializes errors across IPC). Alternatively, wrap in try/catch and return `{ error: AppError }` pattern if needed by the Renderer. Decision: let errors propagate — Renderer already handles rejected promises.
- **Acceptance Criteria:** Both IPC channels delegate to ADO service; no more "Not implemented" errors.
- **Dependencies:** T-004
- **Testing Approach:** Integration test (or manual verification in dev mode).
- **Output:** Modified `src/main/ipc-handlers.ts`

---

#### T-006: Unit tests — html-to-text

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Files:** `src/main/utils/__tests__/html-to-text.test.ts`
- **Implementation Notes:**
  Test cases:
  1. Null/undefined input → empty string
  2. Plain text (no HTML) → unchanged
  3. Simple tags `<p>Hello</p>` → `Hello`
  4. Nested tags `<div><p><b>Bold</b></p></div>` → `Bold`
  5. `<br>` variants → newline
  6. Entity decoding: `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&nbsp;`
  7. Numeric entities: `&#169;` → ©
  8. Mixed content with whitespace normalization
  9. Empty tags only → empty string
  10. Real-world ADO description HTML
- **Acceptance Criteria:** All cases pass.
- **Dependencies:** T-001
- **Testing Approach:** Vitest / Jest (whatever test runner is configured).
- **Output:** `src/main/utils/__tests__/html-to-text.test.ts`

---

#### T-007: Unit tests — ADO service

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Files:** `src/main/ado/__tests__/ado-service.test.ts`
- **Implementation Notes:**
  Test cases:
  1. Happy path: mock WIQL returns 5 IDs, mock workitems returns 5 items → 5 BugItems
  2. topN limiting: mock WIQL returns 100 IDs, topN=10 → only 10 fetched
  3. Batching: mock WIQL returns 450 IDs → 3 batch calls (200+200+50)
  4. Empty result → ADO_EMPTY error
  5. Mapping: verify all BugItem fields from mock WorkItemRaw
  6. testAdoConnection success path
  7. testAdoConnection error path
- **Acceptance Criteria:** All cases pass with mocked HTTP layer.
- **Dependencies:** T-004
- **Testing Approach:** Mock `ado-client` module.
- **Output:** `src/main/ado/__tests__/ado-service.test.ts`

---

#### T-008: Unit tests — ADO client error mapping

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Files:** `src/main/ado/__tests__/ado-client.test.ts`
- **Implementation Notes:**
  Test cases:
  1. 401 response → AppError ADO_AUTH_ERROR
  2. 403 response → AppError ADO_AUTH_ERROR
  3. 404 response → AppError ADO_NOT_FOUND
  4. Network error (fetch throws TypeError) → AppError ADO_TIMEOUT
  5. Timeout (AbortError) → AppError ADO_TIMEOUT
  6. 200 response → parsed JSON returned
  7. Invalid orgUrl (not https) → throws before fetch
- **Acceptance Criteria:** All error mappings verified.
- **Dependencies:** T-003
- **Testing Approach:** Mock global `fetch`.
- **Output:** `src/main/ado/__tests__/ado-client.test.ts`

---

### Risk Register

| Risk                                                        | Impact | Likelihood | Mitigation                                                                              |
| ----------------------------------------------------------- | ------ | ---------- | --------------------------------------------------------------------------------------- |
| ADO WIQL GET endpoint may require POST for some query types | High   | Low        | v1 uses Saved Query (GET works). If fails, switch to POST with `{ query: "..." }` body. |
| Electron 30 fetch may not support AbortSignal.timeout()     | Medium | Low        | Use manual AbortController + setTimeout pattern instead.                                |
| Large query (>20k items) causes slow ID slicing             | Low    | Low        | topN slicing happens before batch, so max IDs processed = topN.                         |
| ADO rate limiting on batch calls                            | Medium | Low        | 200-per-batch is within ADO limits. Add small delay between batches if needed.          |
| AssignedTo field shape varies (string vs identity object)   | Medium | Medium     | Handle both: if string return as-is, if object extract displayName.                     |

---

### File Structure (New Files)

```
src/main/
├── ado/
│   ├── types.ts           (T-002)
│   ├── ado-client.ts      (T-003)
│   ├── ado-service.ts     (T-004)
│   └── __tests__/
│       ├── ado-client.test.ts   (T-008)
│       └── ado-service.test.ts  (T-007)
└── utils/
    ├── html-to-text.ts    (T-001)
    └── __tests__/
        └── html-to-text.test.ts (T-006)
```

---

### Completeness Assessment

- Functional coverage: **High** — all PRD requirements mapped to tasks
- Non-functional coverage: **High** — security, performance, maintainability addressed
- Task-to-requirement mapping: **Complete**
  - FR-ADO-001 → T-003, T-004
  - FR-ADO-002 → T-003, T-004
  - FR-ADO-003 → T-004
  - FR-ADO-004 → T-004
  - FR-ADO-005 → T-001
  - FR-ADO-006 → T-003
  - FR-ADO-007 → T-004, T-005
  - FR-ERR-001..004 → T-003
  - FR-ARCH-001 → T-002
  - NFR-\* → T-001 (pure function), T-003 (https validation, timeout), T-004 (no Electron imports)

---

### Status

**READY FOR APPROVAL**

---

## Execution Summary

- **Agent:** Spec-Planner
- **Phase:** Requirements & Planning
- **Status:** READY FOR APPROVAL
- **Iterations:** 1
- **Requirements:** Functional: 11, Non-Functional: 6, Edge Cases: 12
- **Tasks:** 8 total, 4 parallelizable (Wave 1: 2, Wave 4: 3), 4 waves
- **Critical Path:** 4 tasks (T-002 → T-003 → T-004 → T-005)
- **Key Decisions:**
  - Functional module approach (exported functions) over class-based service — simpler, easier to test/mock
  - Manual AbortController + setTimeout for timeout (broader compatibility)
  - Let AppError propagate through IPC (Electron serializes thrown errors)
  - `src/main/ado/` directory for all ADO-related modules (clean separation)
  - HTML→text as standalone utility in `src/main/utils/` (reusable, pure)
- **Artifacts Produced:**
  - Combined Spec + Plan document
  - `feature/feature-3/spec-plan.md`
- **Notes for Next Phase:**
  - Dispatch Wave 1 tasks (T-001, T-002) in parallel immediately
  - Wave 2 tasks are sequential — T-003 first, then T-004
  - Wave 4 tests can start as soon as their implementation dependency completes
  - No external dependency resolution needed (no new packages)
