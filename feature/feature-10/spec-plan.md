## Spec-Planner — Iteration 1

### Feature Context

- **Feature:** AI Cluster — Similar Bug Detection
- **Feature #:** feature-10
- **Feature Type:** full-stack (Electron main + React renderer)

---

## Part 1: Requirements

### Functional Requirements

#### Navigation & Access

- **FR-NAV-001:** AI Cluster Tab in Topbar
  - Description: A new "AI Cluster" navigation link appears in the Topbar between Dashboard and Settings.
  - Acceptance Criteria: Given the app is loaded, When the user sees the Topbar, Then an "AI Cluster" NavLink is visible at route `/ai-cluster`.
  - Priority: Must-Have

- **FR-NAV-002:** Tab Availability Gate
  - Description: The AI Cluster tab is always visible in navigation but the page shows an empty state when no categorized data exists. The "Analyze" action is disabled until categorization is complete (`categorizedAt` is truthy and at least one bug has a non-empty `macroCategory`).
  - Acceptance Criteria: Given no session or session without `categorizedAt`, When navigating to `/ai-cluster`, Then the page shows a message "Categorization required — run categorization from the Dashboard first" and the analyze button is disabled.
  - Priority: Must-Have

#### Similarity Analysis

- **FR-SIM-001:** Trigger Similarity Analysis
  - Description: User clicks an "Analyze Similarities" button to start the per-group analysis. The analysis groups categorized bugs by `macroCategory` and sends each group (with ≥2 bugs) to the LLM using the similar-bugs prompts/schema.
  - Acceptance Criteria: Given categorized bugs exist, When the user clicks "Analyze Similarities", Then the main process iterates over each macroCategory group, calls the LLM, and returns aggregated results.
  - Priority: Must-Have

- **FR-SIM-002:** Per-Group LLM Call
  - Description: For each macroCategory with ≥2 bugs, the handler calls `chatWithRetry` with `buildSimilarBugsSystemPrompt()`, `buildSimilarBugsUserMessage(groupBugs)`, and `{ responseSchema: 'similar-bugs' }`. Groups with <2 bugs are skipped.
  - Acceptance Criteria: Given a category "Costi" with 5 bugs, When analysis runs, Then one LLM call is made for that group with those 5 bugs.
  - Priority: Must-Have

- **FR-SIM-003:** Progress Reporting
  - Description: The main process sends progress events to the renderer as each macroCategory group completes (analogous to `LLM_CATEGORIZE_PROGRESS`).
  - Acceptance Criteria: Given 4 macroCategory groups to analyze, When analysis is in progress, Then the renderer receives progress updates `{ total: 4, completed: N, currentGroup: string }`.
  - Priority: Must-Have

- **FR-SIM-004:** Result Persistence
  - Description: Results are persisted in the session store so they survive page navigation. Stored under `session.similarityResults`.
  - Acceptance Criteria: Given analysis completes successfully, When the user navigates away and back to AI Cluster, Then the results are still displayed without re-running analysis.
  - Priority: Must-Have

- **FR-SIM-005:** Re-run Analysis
  - Description: User can re-run analysis at any time. A new run replaces previous results.
  - Acceptance Criteria: Given results exist, When the user clicks "Analyze Similarities" again, Then the old results are replaced with new ones.
  - Priority: Must-Have

#### Results Display

- **FR-UI-001:** Results Grouped by Category
  - Description: Results are displayed organized by macroCategory. Each category section shows the similarity groups found within that category.
  - Acceptance Criteria: Given analysis completed with results for 3 categories, When the page renders, Then 3 expandable sections are shown, one per category.
  - Priority: Must-Have

- **FR-UI-002:** Similarity Group Card
  - Description: Each similarity group shows: similarity score (as percentage badge), reason text, and list of bug IDs with their titles. Score badge is color-coded (green ≥0.9, yellow ≥0.7, orange ≥0.5).
  - Acceptance Criteria: Given a group `{ similarityScore: 0.85, reason: "Same modal error", bugIds: [101, 102] }`, When rendered, Then a card shows "85%" in yellow, the reason text, and bug 101/102 titles.
  - Priority: Must-Have

- **FR-UI-003:** Bug Detail Access
  - Description: Clicking a bug ID/title in a similarity group opens the BugDetailDrawer (existing component) for that bug.
  - Acceptance Criteria: Given a similarity group listing bug 101, When the user clicks bug 101, Then the BugDetailDrawer opens showing bug 101 details.
  - Priority: Should-Have

- **FR-UI-004:** Empty State per Category
  - Description: If a category has no similarity groups detected, show "No similar bugs detected in this category".
  - Acceptance Criteria: Given a category "Generico" analyzed with 0 groups returned, When displayed, Then the section shows the empty message.
  - Priority: Must-Have

- **FR-UI-005:** Summary Statistics
  - Description: At the top of the results, show: total groups found, total bugs involved in at least one group, analyzed at timestamp.
  - Acceptance Criteria: Given 5 groups involving 12 unique bugs analyzed at 14:30, When the page loads, Then the summary shows "5 groups · 12 bugs involved · Analyzed at 14:30".
  - Priority: Should-Have

### Non-Functional Requirements

- **NFR-PERF-001:** Analysis should process each category group in parallel (max 2 concurrent to avoid rate limits), with overall completion within acceptable time based on LLM response speed.
- **NFR-UX-001:** Progress indicator must update in real time (event-driven, not polling).
- **NFR-SEC-001:** No raw API keys or sensitive data must flow through the renderer process (follow existing preload bridge pattern).
- **NFR-COMPAT-001:** Must work with all existing LLM providers (OpenAI, Anthropic, Gemini, Generic).
- **NFR-DATA-001:** Results serialized to electron-store must not exceed reasonable size (the schema is compact — group count bounded by bug count).

### Constraints

- Must follow existing IPC pattern: channel → handler → preload → hook → page.
- Must not modify existing `DashboardPage` or `SettingsPage` code.
- Must use existing `buildSimilarBugsSystemPrompt()`, `buildSimilarBugsUserMessage()`, `SIMILAR_BUGS_SCHEMA`.
- Must use Tailwind CSS and lucide-react for UI consistency.
- TypeScript strict mode throughout.

### Assumptions

- The LLM can handle category groups of up to ~50 bugs in a single call (prompt token budget). If groups exceed this, chunking will be needed (flagged as risk).
- The `chatWithRetry` function is reusable outside `categorizeBugs` (confirmed — it's a standalone function in llm-service.ts).
- `electron-store` schema doesn't enforce strict typing — extending `session` with a new field is safe.

### Out of Scope

- Cross-category similarity detection (only within same macroCategory).
- Manual grouping or user-defined clusters.
- Export of similarity results.
- Automatic merging/linking of bugs in ADO.
- Chunking large category groups (deferred to a follow-up if needed; noted in risks).

### Edge Cases

| Scenario                                                     | Expected Behavior                                                                        | Related Requirement |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------- |
| All categories have <2 bugs                                  | Show message "Not enough bugs per category to detect similarities (minimum 2 per group)" | FR-NAV-002          |
| LLM returns empty groups array for a category                | Show "No similar bugs detected" for that category                                        | FR-UI-004           |
| LLM call fails for one category                              | Show error for that category, continue with others, partial results displayed            | FR-SIM-001          |
| User navigates away during analysis                          | Analysis continues in main process; results saved on completion                          | FR-SIM-004          |
| Session cleared while on AI Cluster page                     | Page resets to empty state                                                               | FR-NAV-002          |
| A bug appears in multiple groups                             | Display it in each group — no deduplication of appearances                               | FR-UI-002           |
| Category group has >50 bugs                                  | Send full group (risk: may hit token limit — see Risk Register)                          | FR-SIM-002          |
| Results exist but session bugs change (new fetch/categorize) | Stale results remain until user re-runs analysis; show "Results may be outdated" warning | FR-SIM-005          |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 14
- **Parallelizable:** 9 (64%)
- **Execution Waves:** 5

### Execution Waves

#### Wave 1 — Foundation (Types, Channels, Store)

**Execution:** PARALLEL

| Task ID | Type  | Title               | Description                                                                                    | Files                        | Depends On | Complexity |
| ------- | ----- | ------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------- | ---------- | ---------- |
| T-001   | SETUP | Extend shared types | Add `SimilarityGroup`, `SimilarityResult`, `SimilarityProgress` types and extend `SessionData` | `src/shared/types.ts`        | None       | S          |
| T-002   | SETUP | Add IPC channels    | Add `LLM_FIND_SIMILAR`, `LLM_FIND_SIMILAR_PROGRESS` channels                                   | `src/shared/ipc-channels.ts` | None       | S          |

#### Wave 2 — Backend Logic

**Execution:** SEQUENTIAL (depends on Wave 1)

| Task ID | Type      | Title                                | Description                                                                                                        | Files                         | Depends On   | Complexity |
| ------- | --------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ------------ | ---------- |
| T-003   | IMPLEMENT | Similarity analysis service function | Create `findSimilarBugs()` in llm-service that groups by category, calls LLM per group, returns aggregated results | `src/main/llm/llm-service.ts` | T-001        | M          |
| T-004   | IMPLEMENT | IPC handler for similarity analysis  | Register handler for `LLM_FIND_SIMILAR` — loads session, calls service, sends progress, persists results           | `src/main/ipc-handlers.ts`    | T-002, T-003 | M          |
| T-005   | SETUP     | Export new service function          | Export `findSimilarBugs` from llm index                                                                            | `src/main/llm/index.ts`       | T-003        | S          |

#### Wave 3 — Preload Bridge + Frontend Foundation

**Execution:** PARALLEL

| Task ID | Type      | Title                  | Description                                                                                      | Files                                            | Depends On   | Complexity |
| ------- | --------- | ---------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ------------ | ---------- |
| T-006   | IMPLEMENT | Preload bridge methods | Add `findSimilarBugs()` invoke and `onFindSimilarProgress()` listener to preload                 | `src/preload/index.ts`, `src/preload/index.d.ts` | T-002        | S          |
| T-007   | IMPLEMENT | `useAiCluster` hook    | React hook managing state: analysis trigger, progress, results loading from session, error state | `src/renderer/src/hooks/useAiCluster.ts`         | T-001, T-006 | M          |
| T-008   | IMPLEMENT | AI Cluster page shell  | Create `AiClusterPage.tsx` with header, analyze button, progress bar, empty/gated states         | `src/renderer/src/pages/AiClusterPage.tsx`       | T-001        | M          |

#### Wave 4 — UI Components + Routing

**Execution:** PARALLEL

| Task ID | Type      | Title                              | Description                                                     | Files                                                                       | Depends On | Complexity |
| ------- | --------- | ---------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------- | ---------- |
| T-009   | IMPLEMENT | Category results section component | Expandable section per category showing similarity groups       | `src/renderer/src/components/ai-cluster/CategorySection.tsx`                | T-008      | M          |
| T-010   | IMPLEMENT | Similarity group card component    | Card showing score badge, reason, bug list with click-to-drawer | `src/renderer/src/components/ai-cluster/SimilarityGroupCard.tsx`            | T-008      | M          |
| T-011   | INTEGRATE | Wire routing and navigation        | Add route in `App.tsx`, NavLink in `Topbar.tsx`                 | `src/renderer/src/App.tsx`, `src/renderer/src/components/layout/Topbar.tsx` | T-008      | S          |

#### Wave 5 — Integration + Tests

**Execution:** PARALLEL

| Task ID | Type      | Title                                          | Description                                                                                                | Files                                                                          | Depends On                 | Complexity |
| ------- | --------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------- | ---------- |
| T-012   | INTEGRATE | Compose AiClusterPage with components and hook | Wire `useAiCluster` into page, render `CategorySection` + `SimilarityGroupCard`, connect `BugDetailDrawer` | `src/renderer/src/pages/AiClusterPage.tsx`                                     | T-007, T-009, T-010, T-011 | M          |
| T-013   | TEST      | Backend tests                                  | Unit tests for `findSimilarBugs` (mocked LLM), IPC handler test                                            | `tests/main/llm-similar-bugs.spec.ts`, `tests/main/ipc-handlers.spec.ts`       | T-003, T-004               | M          |
| T-014   | TEST      | Frontend tests                                 | Hook test for `useAiCluster`, component render tests for page and cards                                    | `tests/renderer/useAiCluster.spec.ts`, `tests/renderer/AiClusterPage.spec.tsx` | T-007, T-012               | M          |

### Critical Path

T-001 → T-003 → T-004 → T-006 → T-007 → T-012 (critical path: 6 tasks)

### Task Details

#### T-001: Extend Shared Types

- **Type:** SETUP
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Add to `src/shared/types.ts`:

     ```typescript
     export interface SimilarityGroup {
       similarityScore: number
       reason: string
       bugIds: number[]
     }

     export interface CategorySimilarityResult {
       macroCategory: string
       groups: SimilarityGroup[]
       error?: string // if LLM failed for this category
     }

     export interface SimilarityResult {
       categories: CategorySimilarityResult[]
       analyzedAt: string
     }

     export interface SimilarityProgress {
       total: number
       completed: number
       currentGroup: string
     }
     ```

  2. Extend `SessionData`:
     ```typescript
     export interface SessionData {
       bugs: CategorizedBug[]
       fetchedAt: string
       categorizedAt?: string
       similarityResults?: SimilarityResult // NEW
     }
     ```

- **Acceptance Criteria:** Types compile, existing code unaffected.
- **Testing Approach:** Type-check only (compile).
- **Output:** Updated `src/shared/types.ts`

#### T-002: Add IPC Channels

- **Type:** SETUP
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Add to `IPC_CHANNELS` in `src/shared/ipc-channels.ts`:
     ```typescript
     LLM_FIND_SIMILAR: 'llm:find-similar',
     LLM_FIND_SIMILAR_PROGRESS: 'llm:find-similar-progress',
     ```
- **Acceptance Criteria:** Channels defined, no runtime errors.
- **Testing Approach:** Compile check.
- **Output:** Updated `src/shared/ipc-channels.ts`

#### T-003: Similarity Analysis Service Function

- **Type:** IMPLEMENT
- **Wave:** 2 — SEQUENTIAL
- **Implementation Notes:**
  1. Add `findSimilarBugs` function to `src/main/llm/llm-service.ts` (or a new file `src/main/llm/similarity-service.ts` for separation of concerns).
  2. Signature:
     ```typescript
     export async function findSimilarBugs(
       settings: AppSettings,
       bugs: CategorizedBug[],
       onProgress: (progress: SimilarityProgress) => void
     ): Promise<SimilarityResult>
     ```
  3. Logic:
     - Group bugs by `macroCategory` (skip empty/falsy categories).
     - Filter groups to those with ≥2 bugs.
     - For each group:
       - Build prompts: `buildSimilarBugsSystemPrompt()`, `buildSimilarBugsUserMessage(groupBugs)`.
       - Call `chatWithRetry(provider, systemPrompt, userMessage, { responseSchema: 'similar-bugs' })`.
       - Parse response JSON, validate it has `groups` array.
       - Report progress.
       - On error: record error string in `CategorySimilarityResult.error`, continue.
     - Return aggregated `SimilarityResult` with `analyzedAt` timestamp.
  4. Process groups sequentially (avoid rate limit issues with parallel LLM calls).
- **Acceptance Criteria:** Function returns correct structure; errors per-group don't abort entire analysis.
- **Testing Approach:** TDD — unit test with mocked provider.
- **Output:** `src/main/llm/similarity-service.ts`

#### T-004: IPC Handler for Similarity Analysis

- **Type:** IMPLEMENT
- **Wave:** 2 — SEQUENTIAL
- **Implementation Notes:**
  1. In `src/main/ipc-handlers.ts`, add handler:

     ```typescript
     ipcMain.handle(IPC_CHANNELS.LLM_FIND_SIMILAR, async (event: IpcMainInvokeEvent) => {
       const settings = store.get('settings') as AppSettings | null
       if (!settings) throw { code: 'STORE_ERROR', message: 'Settings non configurate' }

       const session = store.get('session') as SessionData | null
       if (!session?.categorizedAt)
         throw { code: 'STORE_ERROR', message: 'Categorizzazione non eseguita' }

       const result = await findSimilarBugs(settings, session.bugs, (progress) => {
         event.sender.send(IPC_CHANNELS.LLM_FIND_SIMILAR_PROGRESS, progress)
       })

       // Persist results
       const updatedSession: SessionData = { ...session, similarityResults: result }
       store.set('session', updatedSession)

       return result
     })
     ```

  2. Import `findSimilarBugs` from llm module.

- **Acceptance Criteria:** Handler registered, responds correctly, persists results.
- **Testing Approach:** Integration test with mocked store and service.
- **Output:** Updated `src/main/ipc-handlers.ts`

#### T-005: Export New Service Function

- **Type:** SETUP
- **Wave:** 2 — SEQUENTIAL
- **Implementation Notes:**
  1. Add `export { findSimilarBugs } from './similarity-service'` to `src/main/llm/index.ts`.
- **Acceptance Criteria:** Import resolves correctly from `src/main/llm`.
- **Testing Approach:** Compile check.
- **Output:** Updated `src/main/llm/index.ts`

#### T-006: Preload Bridge Methods

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. In `src/preload/index.ts`, add to `electronAPI`:
     ```typescript
     findSimilarBugs: () => ipcRenderer.invoke(IPC_CHANNELS.LLM_FIND_SIMILAR),
     onFindSimilarProgress: (callback: (data: unknown) => void) => {
       const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
       ipcRenderer.on(IPC_CHANNELS.LLM_FIND_SIMILAR_PROGRESS, handler)
       return () => ipcRenderer.removeListener(IPC_CHANNELS.LLM_FIND_SIMILAR_PROGRESS, handler)
     },
     ```
  2. Update `src/preload/index.d.ts` type augmentation accordingly.
- **Acceptance Criteria:** Methods available on `window.electronAPI`, typed correctly.
- **Testing Approach:** Type check + manual verification.
- **Output:** Updated `src/preload/index.ts`, `src/preload/index.d.ts`

#### T-007: `useAiCluster` Hook

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Create `src/renderer/src/hooks/useAiCluster.ts`:
     ```typescript
     export interface UseAiClusterReturn {
       results: SimilarityResult | null
       loading: boolean
       analyzing: boolean
       progress: SimilarityProgress | null
       canAnalyze: boolean // true when categorizedAt exists
       isStale: boolean // true when categorizedAt > analyzedAt
       analyze: () => Promise<void>
     }
     ```
  2. On mount: load session, check `similarityResults`.
  3. `analyze()`: call `window.electronAPI.findSimilarBugs()`, subscribe to progress via `onFindSimilarProgress`, update state on completion.
  4. Cleanup progress listener on unmount.
  5. Compute `canAnalyze` from session having `categorizedAt` and at least one bug with `macroCategory`.
  6. Compute `isStale` by comparing `session.categorizedAt` > `results.analyzedAt`.
- **Acceptance Criteria:** Hook returns correct state transitions; progress updates reflected.
- **Testing Approach:** Unit test with mocked `window.electronAPI`.
- **Output:** `src/renderer/src/hooks/useAiCluster.ts`

#### T-008: AI Cluster Page Shell

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Create `src/renderer/src/pages/AiClusterPage.tsx`.
  2. Structure:
     - Header with title "AI Cluster" and subtitle.
     - "Analyze Similarities" button (disabled when `!canAnalyze`).
     - Progress bar when `analyzing` (showing `progress.completed / progress.total` and `progress.currentGroup`).
     - Empty state when no results and not analyzing.
     - Gate state when `!canAnalyze`.
     - Stale warning banner when `isStale`.
     - Results container (placeholder for T-012 composition).
  3. Use Tailwind classes consistent with DashboardPage styling.
  4. Use `Layers` icon from lucide-react for the page.
- **Acceptance Criteria:** Page renders all states correctly based on hook output.
- **Testing Approach:** Snapshot/render test with mocked hook.
- **Output:** `src/renderer/src/pages/AiClusterPage.tsx`

#### T-009: Category Results Section Component

- **Type:** IMPLEMENT
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Create `src/renderer/src/components/ai-cluster/CategorySection.tsx`.
  2. Props: `{ category: string; groups: SimilarityGroup[]; bugs: CategorizedBug[]; error?: string; onBugClick: (bugId: number) => void }`.
  3. Expandable/collapsible section (default expanded).
  4. Shows category name as heading with count badge ("3 groups").
  5. If `error`, show error alert instead of groups.
  6. If groups empty, show "No similar bugs detected" message.
  7. Renders list of `SimilarityGroupCard` for each group.
- **Acceptance Criteria:** Expands/collapses; renders groups or empty/error state.
- **Testing Approach:** Render tests with various props.
- **Output:** `src/renderer/src/components/ai-cluster/CategorySection.tsx`

#### T-010: Similarity Group Card Component

- **Type:** IMPLEMENT
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Create `src/renderer/src/components/ai-cluster/SimilarityGroupCard.tsx`.
  2. Props: `{ group: SimilarityGroup; bugs: CategorizedBug[]; onBugClick: (bugId: number) => void }`.
  3. Layout:
     - Score badge (color-coded): `≥0.9` green, `≥0.7` yellow, `≥0.5` orange.
     - Reason text.
     - List of bugs: each shows `#{id} — {title}` as clickable link.
  4. Resolve bug titles by looking up `bugIds` in the provided `bugs` array.
- **Acceptance Criteria:** Badge color matches score range; bug items are clickable.
- **Testing Approach:** Render test with mock data.
- **Output:** `src/renderer/src/components/ai-cluster/SimilarityGroupCard.tsx`

#### T-011: Wire Routing and Navigation

- **Type:** INTEGRATE
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. In `src/renderer/src/App.tsx`:
     - Import `AiClusterPage`.
     - Add route: `<Route path="/ai-cluster" element={<AiClusterPage />} />`.
  2. In `src/renderer/src/components/layout/Topbar.tsx`:
     - Import `Layers` from lucide-react.
     - Add NavLink to `/ai-cluster` between Dashboard and Settings.
- **Acceptance Criteria:** Navigation works; active state highlighted correctly.
- **Testing Approach:** Manual + routing render test.
- **Output:** Updated `App.tsx`, `Topbar.tsx`

#### T-012: Compose AiClusterPage

- **Type:** INTEGRATE
- **Wave:** 5 — PARALLEL
- **Implementation Notes:**
  1. Wire `useAiCluster` hook into `AiClusterPage`.
  2. Wire `useBugDrawer` for bug detail access.
  3. Render `CategorySection` for each `result.categories`.
  4. Pass `onBugClick` to open drawer.
  5. Render summary stats at top of results.
- **Acceptance Criteria:** Full flow works end-to-end: analyze → progress → results → click bug → drawer.
- **Testing Approach:** Integration render test.
- **Output:** Finalized `src/renderer/src/pages/AiClusterPage.tsx`

#### T-013: Backend Tests

- **Type:** TEST
- **Wave:** 5 — PARALLEL
- **Implementation Notes:**
  1. `tests/main/llm-similar-bugs.spec.ts`:
     - Test `findSimilarBugs` with mocked provider returning valid JSON.
     - Test grouping logic (correct grouping by macroCategory).
     - Test skipping groups with <2 bugs.
     - Test per-group error handling (one fails, others succeed).
     - Test progress callback invocations.
  2. Extend `tests/main/ipc-handlers.spec.ts`:
     - Test `LLM_FIND_SIMILAR` handler with mocked store/service.
     - Test error when no settings or no categorized session.
- **Acceptance Criteria:** All tests pass, coverage on new code ≥80%.
- **Testing Approach:** vitest with mocks.
- **Output:** `tests/main/llm-similar-bugs.spec.ts`, updated `tests/main/ipc-handlers.spec.ts`

#### T-014: Frontend Tests

- **Type:** TEST
- **Wave:** 5 — PARALLEL
- **Implementation Notes:**
  1. `tests/renderer/useAiCluster.spec.ts`:
     - Test initial load from session (with results, without results).
     - Test `analyze()` flow: sets analyzing, receives progress, resolves with results.
     - Test `canAnalyze` and `isStale` derivation.
  2. `tests/renderer/AiClusterPage.spec.tsx`:
     - Test gated state rendering.
     - Test results rendering with mock data.
     - Test progress bar during analysis.
- **Acceptance Criteria:** All tests pass.
- **Testing Approach:** vitest + @testing-library/react.
- **Output:** `tests/renderer/useAiCluster.spec.ts`, `tests/renderer/AiClusterPage.spec.tsx`

### Risk Register

| Risk                                            | Impact                               | Likelihood | Mitigation                                                                                          |
| ----------------------------------------------- | ------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------- |
| Large category groups exceed LLM token limit    | Analysis fails for that group        | Medium     | Record error per-group, continue with others. Future: add chunking for groups >30 bugs.             |
| Rate limiting with many categories              | Slow or failed analysis              | Low        | Sequential processing + existing `chatWithRetry` with backoff handles this.                         |
| LLM returns malformed JSON despite schema       | Parse error for a group              | Low        | Wrap JSON parse in try/catch, record error for that category, don't abort.                          |
| Session becomes stale (user re-categorizes)     | Results no longer match current bugs | Medium     | `isStale` flag warns user; re-run button available. Clear `similarityResults` on re-categorization. |
| Bug ID in results doesn't match current session | UI can't resolve bug title           | Low        | Gracefully show "Bug #{id} (not found)" if lookup fails.                                            |

---

### Completeness Assessment

- Functional coverage: **High** — all user-facing scenarios addressed.
- Non-functional coverage: **High** — performance, security, compatibility covered.
- Task-to-requirement mapping: **Complete** — every FR maps to at least one task.

### Status

**READY FOR APPROVAL**

---

## Questions for User

1. **Large group handling:** Should we implement chunking for macroCategory groups with >30 bugs now, or defer to a follow-up? (Current plan: send full group, rely on LLM context window.)
2. **Stale results clearing:** When the user re-runs categorization from Dashboard, should we automatically clear `similarityResults` from the session (forcing re-analysis), or just mark them as stale?
3. **Concurrency:** Should similarity analysis block other LLM operations (e.g., if user somehow triggers categorization while analysis is running), or is single-action-at-a-time enforcement already sufficient via the UI?
