# Spec-Planner — Iteration 1

## Feature Context

- **Feature:** Workspace Sessioni Agente avanzato e persistenza
- **Feature #:** FT-14E
- **Feature Type:** full-stack

---

## Part 1: Requirements

### Functional Requirements

#### Multi-Session Management (Main Process)

- **FR-MS-001:** Multi-Session Concurrency
  - Description: SessionManager must manage multiple concurrent sessions up to `settings.maxConcurrentSessions`.
  - Acceptance Criteria: Given maxConcurrentSessions=3 and 3 sessions running, When a 4th start is requested, Then it is rejected with an explicit error message.
  - Priority: Must-Have

- **FR-MS-002:** Session Registry
  - Description: SessionManager maintains an in-memory map of all sessions (running + recently completed within retention window).
  - Acceptance Criteria: Given 5 sessions in various states, When `getAllSessions()` is called, Then all 5 are returned with correct status.
  - Priority: Must-Have

- **FR-MS-003:** Session Get by ID
  - Description: SessionManager exposes `getSession(id)` for fetching a specific session's full state.
  - Acceptance Criteria: Given a session with id X, When `getSession(X)` is called, Then the full AgentSession object is returned.
  - Priority: Must-Have

- **FR-MS-004:** Abort by Session ID
  - Description: Any running session can be aborted by its ID regardless of how many are active.
  - Acceptance Criteria: Given sessions A (running) and B (running), When abort(A) is called, Then only A becomes `aborted` and B continues.
  - Priority: Must-Have

#### Persistence

- **FR-PS-001:** Persist Completed Sessions
  - Description: Sessions with terminal status (completed/error/aborted) are persisted to electron-store immediately upon reaching terminal state.
  - Acceptance Criteria: Given a session completes, When app restarts, Then the session appears in the session list.
  - Priority: Must-Have

- **FR-PS-002:** 24h Retention
  - Description: Persisted sessions older than 24h (based on `completedAt`) are pruned at startup and periodically.
  - Acceptance Criteria: Given a session completed 25h ago, When the app starts, Then it is not loaded into the session list.
  - Priority: Must-Have

- **FR-PS-003:** Stale Running → Aborted on Restart
  - Description: Any session persisted with status `running` must be set to `aborted` with `completedAt = now` upon app startup.
  - Acceptance Criteria: Given a session saved as `running` (crash scenario), When app restarts, Then its status is `aborted`.
  - Priority: Must-Have

- **FR-PS-004:** Chunk Trimming on Persist
  - Description: Persisted sessions store at most the last 200 chunks to limit store size.
  - Acceptance Criteria: Given a session with 450 chunks completes, When persisted, Then only the last 200 chunks are saved.
  - Priority: Should-Have

#### IPC Layer

- **FR-IPC-001:** List Sessions Channel
  - Description: New IPC channel `AGENT_LIST_SESSIONS` returns all in-memory sessions (active + persisted within retention).
  - Acceptance Criteria: Renderer calls `agentListSessions()` and receives an array of AgentSession objects.
  - Priority: Must-Have

- **FR-IPC-002:** Get Session Channel (Existing - Modify)
  - Description: Existing `AGENT_GET_SESSION` is modified to accept an optional `sessionId` parameter. Without parameter it returns the legacy "current" (first running) for backwards compat; with parameter it returns that specific session.
  - Acceptance Criteria: `agentGetSession(id)` returns the session with that ID or null.
  - Priority: Must-Have

- **FR-IPC-003:** Session Persisted Event
  - Description: New IPC push channel `AGENT_SESSION_UPDATED` sent whenever a session transitions status, so renderer can update its list reactively.
  - Acceptance Criteria: When a running session completes, renderer receives an `AGENT_SESSION_UPDATED` event with the session's id and new status.
  - Priority: Must-Have

#### Renderer — Session Workspace UI

- **FR-UI-001:** Session List Panel
  - Description: Left panel in Sessions tab showing all sessions sorted by `startedAt` desc, with status badge, provider badge, MCP badge, secondary count badge.
  - Acceptance Criteria: User sees a scrollable list of sessions with visual badges for each metadata dimension.
  - Priority: Must-Have

- **FR-UI-002:** Status Filter
  - Description: Filter bar above session list: All / Running / Completed / Failed / Aborted.
  - Acceptance Criteria: Selecting "Running" shows only sessions with `status === 'running'`.
  - Priority: Must-Have

- **FR-UI-003:** Session Detail Panel
  - Description: Right panel showing log + report for the selected session (same content as current SessionsPanel but scoped to selection).
  - Acceptance Criteria: Clicking a session in the list loads its log and report in the detail area.
  - Priority: Must-Have

- **FR-UI-004:** Active Sessions Badge on Tab
  - Description: The "Sessioni" tab button shows a count badge with the number of currently running sessions.
  - Acceptance Criteria: With 2 sessions running, tab shows "Sessioni (2)".
  - Priority: Must-Have

- **FR-UI-005:** New Session Button
  - Description: A "Nuova Sessione" button in the Sessions tab header opens the AnalyzeStartPanel dialog.
  - Acceptance Criteria: Clicking "Nuova Sessione" opens the existing start dialog, and upon submission a new session starts.
  - Priority: Must-Have

- **FR-UI-006:** Concurrency Limit Feedback
  - Description: When max concurrency is reached, the New Session button is disabled with a tooltip explaining the limit.
  - Acceptance Criteria: With 5/5 sessions running (maxConcurrentSessions=5), button is disabled with tooltip text.
  - Priority: Must-Have

- **FR-UI-007:** Report Actions
  - Description: Completed sessions show action buttons: Copy Report, Save as .md, Open Bug in ADO.
  - Acceptance Criteria: "Copy Report" copies markdown to clipboard; "Save as .md" triggers a save dialog; "Open Bug in ADO" opens the bug URL externally.
  - Priority: Must-Have

- **FR-UI-008:** Turn-Based Progress Bar
  - Description: Running sessions show a progress indicator based on chunk count or turn progress heuristic.
  - Acceptance Criteria: A running session's list item and detail header show an animated progress bar.
  - Priority: Should-Have

#### Renderer — Hook Refactor

- **FR-HK-001:** useAgentSessions Hook (Multi)
  - Description: New hook `useAgentSessions` manages the full session list, subscribes to multi-session IPC events, and exposes session CRUD.
  - Acceptance Criteria: Hook returns `{ sessions, selectedSession, selectSession, startSession, abortSession, filterByStatus }`.
  - Priority: Must-Have

### Non-Functional Requirements

- **NFR-PERF-001:** Session list rendering must remain smooth with up to 50 sessions (virtual scroll not required at this scale).
- **NFR-PERF-002:** Persisting a session must not block the main process event loop for >50ms.
- **NFR-SEC-001:** Session chunks persisted to electron-store inherit the existing encryption (encryptionKey already in place).
- **NFR-SEC-002:** Report "Save as .md" must use Electron's dialog.showSaveDialog — no arbitrary path writes.
- **NFR-COMPAT-001:** Existing single-session entry point from BugDetailDrawer must continue to work without changes to its API surface (backwards compat via hook abstraction).
- **NFR-MIGR-001:** Store migration version 5 adds `agentSessions: []` key; existing stores upgrade seamlessly.

### Constraints

- Electron-store is synchronous for reads/writes — persist calls must be batched or deferred to avoid blocking.
- The 500-chunk in-memory cap per session remains; persistence further trims to 200.
- IPC events are per-BrowserWindow; multi-window is not supported (single window assumption).
- No new npm dependencies required (existing react-markdown, lucide-react, electron-store suffice).

### Assumptions

- `maxConcurrentSessions` has already been added to `AppSettings` type and store defaults by FT-14A (confirmed in codebase: default 1 in store, type declares `maxConcurrentSessions: number`).
- The `AnalyzeStartPanel` dialog can be reused as-is for the "New Session" flow.
- Bug data is always available in the session store when a session references a `bugId`.
- The user confirmed store default for `maxConcurrentSessions` should be raised from 1 to 5 as part of this feature (aligning with feature brief).

### Out of Scope

- Fix mode sessions
- Shell blocklist / command filtering
- Token usage expansion (done in min-08)
- Advanced session search (full-text)
- Session export/import
- Multi-window IPC sync
- Virtual scrolling for session list

### Edge Cases

| Scenario                                             | Expected Behavior                                                                      | Related Requirement  |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------- |
| App crashes with 3 running sessions                  | All 3 marked `aborted` on next startup                                                 | FR-PS-003            |
| Session completes but electron-store write fails     | Error logged, session stays in memory but won't survive restart                        | FR-PS-001            |
| User starts session for same bugId already running   | Allowed (separate session ID); no dedup enforced                                       | FR-MS-001            |
| All sessions in list are >24h old                    | List shows empty state with message                                                    | FR-PS-002, FR-UI-001 |
| User aborts session that already completed (race)    | Abort returns false, no state change                                                   | FR-MS-004            |
| maxConcurrentSessions changed while sessions running | New limit checked only on next start attempt; running sessions not killed              | FR-MS-001            |
| Session with 0 chunks completes (immediate error)    | Persisted with empty chunks array; displayed normally                                  | FR-PS-004            |
| Renderer reconnects (page reload) mid-session        | Lists all sessions via AGENT_LIST_SESSIONS; running sessions continue streaming chunks | FR-IPC-001           |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 14
- **Parallelizable:** 8 (57%)
- **Execution Waves:** 5

### Execution Waves

#### Wave 1 — Shared Types & Store Schema

**Execution:** PARALLEL

| Task ID | Type  | Title                                  | Files                                               | Depends On | Complexity |
| ------- | ----- | -------------------------------------- | --------------------------------------------------- | ---------- | ---------- |
| T-001   | SETUP | Extend shared types & IPC channels     | `src/shared/types.ts`, `src/shared/ipc-channels.ts` | None       | S          |
| T-002   | SETUP | Store migration v5 — agentSessions key | `src/main/store-migration.ts`, `src/main/store.ts`  | None       | S          |

#### Wave 2 — Main Process Core

**Execution:** SEQUENTIAL (T-003 depends on T-001/T-002; T-004 depends on T-003)

| Task ID | Type      | Title                                    | Files                                         | Depends On   | Complexity |
| ------- | --------- | ---------------------------------------- | --------------------------------------------- | ------------ | ---------- |
| T-003   | IMPLEMENT | Refactor SessionManager to multi-session | `src/main/agent/session-manager.ts`           | T-001, T-002 | L          |
| T-004   | IMPLEMENT | Session persistence layer                | `src/main/agent/session-persistence.ts` (new) | T-003, T-002 | M          |

#### Wave 3 — IPC + Preload + Main Tests

**Execution:** PARALLEL (T-005 ∥ T-006 ∥ T-007)

| Task ID | Type      | Title                                             | Files                                               | Depends On   | Complexity |
| ------- | --------- | ------------------------------------------------- | --------------------------------------------------- | ------------ | ---------- |
| T-005   | IMPLEMENT | IPC handlers for multi-session                    | `src/main/ipc-handlers.ts`                          | T-003, T-004 | M          |
| T-006   | IMPLEMENT | Preload API for multi-session                     | `src/preload/index.ts`, `src/preload/index.d.ts`    | T-001        | S          |
| T-007   | TEST      | Main process tests (SessionManager + persistence) | `tests/main/agent-session-manager.spec.ts` (extend) | T-003, T-004 | M          |

#### Wave 4 — Renderer Hooks + UI

**Execution:** PARALLEL (T-008 ∥ T-009 after T-006; T-010, T-011, T-012 after T-008)

| Task ID | Type      | Title                                                      | Files                                                                                                          | Depends On   | Complexity |
| ------- | --------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------ | ---------- |
| T-008   | IMPLEMENT | useAgentSessions hook                                      | `src/renderer/src/hooks/useAgentSessions.ts` (new)                                                             | T-006        | M          |
| T-009   | REFACTOR  | Adapt useAgentSession for backwards compat                 | `src/renderer/src/hooks/useAgentSession.ts`                                                                    | T-008        | S          |
| T-010   | IMPLEMENT | SessionListPanel component                                 | `src/renderer/src/components/dashboard/SessionListPanel.tsx` (new)                                             | T-008        | M          |
| T-011   | IMPLEMENT | SessionDetailPanel component (refactor from SessionsPanel) | `src/renderer/src/components/dashboard/SessionDetailPanel.tsx` (new)                                           | T-008        | M          |
| T-012   | IMPLEMENT | SessionWorkspace layout + DashboardPage integration        | `src/renderer/src/components/dashboard/SessionWorkspace.tsx` (new), `src/renderer/src/pages/DashboardPage.tsx` | T-010, T-011 | M          |

#### Wave 5 — Renderer Tests + Polish

**Execution:** PARALLEL

| Task ID | Type      | Title                                     | Files                                                                                             | Depends On   | Complexity |
| ------- | --------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------ | ---------- |
| T-013   | TEST      | Renderer tests (hook + components)        | `tests/renderer/useAgentSessions.spec.ts` (new), `tests/renderer/SessionListPanel.spec.tsx` (new) | T-008, T-010 | M          |
| T-014   | INTEGRATE | Report actions (copy, save .md, open ADO) | `src/renderer/src/components/dashboard/SessionDetailPanel.tsx`, `src/main/ipc-handlers.ts`        | T-011, T-005 | S          |

### Critical Path

T-001 → T-003 → T-004 → T-005 → T-012 (critical path: 5 tasks)

### Task Details

#### T-001: Extend shared types & IPC channels

- **Type:** SETUP
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. In `src/shared/ipc-channels.ts`: add `AGENT_LIST_SESSIONS: 'agent:list-sessions'` and `AGENT_SESSION_UPDATED: 'agent:session-updated'` and `AGENT_SAVE_REPORT: 'agent:save-report'`.
  2. In `src/shared/types.ts`: add `AgentSessionSummary` (lightweight list item without full chunks), `AgentSessionFilter` type, `AgentSessionUpdatedPayload` interface.
  3. Add `PersistedAgentSession` type (AgentSession with `persistedAt` field, chunks trimmed to 200).
- **Acceptance Criteria:** Types compile; no runtime behavior change.
- **Testing Approach:** Type-check only (tsc --noEmit).
- **Output:** Updated `src/shared/types.ts`, `src/shared/ipc-channels.ts`.

#### T-002: Store migration v5 — agentSessions key

- **Type:** SETUP
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. In `src/main/store-migration.ts`: bump `CURRENT_SCHEMA_VERSION` to 5.
  2. Add migration v5: adds `agentSessions: []` to store data if missing.
  3. In `src/main/store.ts`: add `agentSessions: []` to defaults; update `maxConcurrentSessions` default from 1 to 5.
- **Acceptance Criteria:** Fresh store has `agentSessions: []`; migrated store gains the key.
- **Testing Approach:** Unit test the migration function.
- **Output:** Updated `src/main/store-migration.ts`, `src/main/store.ts`.

#### T-003: Refactor SessionManager to multi-session

- **Type:** IMPLEMENT
- **Wave:** 2 — SEQUENTIAL
- **Implementation Notes:**
  1. Replace `private currentSession: AgentSession | null` with `private sessions: Map<string, AgentSession>` and `private abortControllers: Map<string, AbortController>`.
  2. Add `private maxConcurrent: number` (passed via constructor or setter from settings).
  3. `start()` checks `runningCount < maxConcurrent` instead of `isRunning()`.
  4. `getSession(id)` returns from map.
  5. `getAllSessions()` returns Array from map values.
  6. `getRunningCount()` returns count of sessions with status `running`.
  7. `abort(sessionId)` targets the specific controller.
  8. `clear()` becomes `clearCompleted()` — removes non-running sessions from memory.
  9. `removeSession(id)` for manual removal.
  10. Add `restoreSessions(sessions: AgentSession[])` for startup hydration.
  11. Add `markStaleAsAborted()` — iterates sessions with `running` status and marks them `aborted`.
  12. Each `runSession` call operates on its own session within the map.
  13. Maintain the `secondaryProjects` per-session (move to session-scoped state or inline map).
- **Acceptance Criteria:** Multiple sessions can run concurrently; abort targets correct session; old single-session callers still work via `start()`.
- **Testing Approach:** TDD — extend existing `agent-session-manager.spec.ts`.
- **Output:** Refactored `src/main/agent/session-manager.ts`.

#### T-004: Session persistence layer

- **Type:** IMPLEMENT
- **Wave:** 2 — SEQUENTIAL
- **Implementation Notes:**
  1. Create `src/main/agent/session-persistence.ts`.
  2. `persistSession(session: AgentSession)`: trim chunks to last 200, write to store `agentSessions` array (append or replace by id).
  3. `loadPersistedSessions(): AgentSession[]`: read from store, filter out sessions older than 24h.
  4. `pruneExpiredSessions()`: remove sessions from store where `completedAt` is >24h ago.
  5. `markStaleRunning(sessions: AgentSession[]): AgentSession[]`: mark any `running` as `aborted`.
  6. Use `store.get('agentSessions')` / `store.set('agentSessions', ...)`.
  7. Integrate with SessionManager: call `persistSession` when a session reaches terminal state.
- **Acceptance Criteria:** Sessions survive restart; expired sessions are pruned; stale running are aborted.
- **Testing Approach:** Unit test with mocked store.
- **Output:** New `src/main/agent/session-persistence.ts`.

#### T-005: IPC handlers for multi-session

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Add handler for `AGENT_LIST_SESSIONS`: returns `sessionManager.getAllSessions()` (without full chunks — map to summary).
  2. Modify `AGENT_GET_SESSION` handler to accept optional `sessionId` param.
  3. Modify `AGENT_START` handler: remove single-session guard, use concurrency check from SessionManager.
  4. After each session state transition (complete/error/abort), send `AGENT_SESSION_UPDATED` push event.
  5. Add handler for `AGENT_SAVE_REPORT`: accept `{ sessionId, defaultFilename }`, show save dialog, write report .md.
  6. On app startup (in `registerIpcHandlers` or a new init function): call persistence restore + markStale + prune.
- **Acceptance Criteria:** All new channels respond correctly; existing AGENT_START/ABORT/GET_SESSION still work.
- **Testing Approach:** Extend `tests/main/ipc-handlers.spec.ts`.
- **Output:** Updated `src/main/ipc-handlers.ts`.

#### T-006: Preload API for multi-session

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Add `agentListSessions: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_LIST_SESSIONS)`.
  2. Add `agentSaveReport: (payload) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_SAVE_REPORT, payload)`.
  3. Add `onAgentSessionUpdated: (callback) => { ... subscribe/unsubscribe pattern }`.
  4. Modify `agentGetSession` to accept optional `sessionId` param.
  5. Update `index.d.ts` type augmentation accordingly.
- **Acceptance Criteria:** New APIs are exposed to renderer.
- **Testing Approach:** Covered by renderer integration tests.
- **Output:** Updated `src/preload/index.ts`, `src/preload/index.d.ts`.

#### T-007: Main process tests (SessionManager + persistence)

- **Type:** TEST
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Extend `tests/main/agent-session-manager.spec.ts`:
     - Test concurrent session start up to limit.
     - Test rejection at concurrency limit.
     - Test abort targets correct session.
     - Test `getAllSessions()` returns all.
     - Test `restoreSessions()` hydration.
     - Test `markStaleAsAborted()`.
  2. Create `tests/main/agent-session-persistence.spec.ts`:
     - Test `persistSession` writes to store.
     - Test `loadPersistedSessions` filters by 24h.
     - Test `pruneExpiredSessions` removes old entries.
     - Test chunk trimming to 200.
     - Test stale running → aborted.
- **Acceptance Criteria:** All tests pass; coverage for SessionManager and persistence at >90%.
- **Testing Approach:** Vitest, mock electron-store.
- **Output:** Updated + new spec files.

#### T-008: useAgentSessions hook

- **Type:** IMPLEMENT
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Create `src/renderer/src/hooks/useAgentSessions.ts`.
  2. State: `sessions: AgentSession[]`, `selectedSessionId: string | null`, `statusFilter: AgentSessionStatus | 'all'`.
  3. On mount: call `agentListSessions()` to hydrate.
  4. Subscribe to `onAgentChunk`, `onAgentCompleted`, `onAgentError`, `onAgentSessionUpdated` — update corresponding session in list.
  5. For chunks: only update the session matching `chunk.sessionId`.
  6. Expose: `sessions` (filtered by statusFilter), `allSessions`, `selectedSession`, `runningCount`, `selectSession(id)`, `setStatusFilter(status)`, `startSession(...)`, `abortSession(id)`, `copyReport(id)`, `saveReport(id)`, `openBugInAdo(bugId)`.
  7. `startSession` delegates to existing `agentStart` preload call.
  8. Compute `runningCount` from sessions with status `running`.
- **Acceptance Criteria:** Hook manages multi-session state reactively.
- **Testing Approach:** Unit test with mocked electronAPI.
- **Output:** New `src/renderer/src/hooks/useAgentSessions.ts`.

#### T-009: Adapt useAgentSession for backwards compat

- **Type:** REFACTOR
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. `useAgentSession` can remain as a thin wrapper or be deprecated.
  2. Option A (minimal): keep `useAgentSession` unchanged — it tracks a single session via `sessionIdRef`. This still works because IPC events carry `sessionId` and the hook filters.
  3. Option B (delegate): make `useAgentSession` internally use `useAgentSessions` and expose the first/last started session.
  4. Recommend Option A — no change needed. Mark with `@deprecated` comment pointing to `useAgentSessions`.
- **Acceptance Criteria:** BugDetailDrawer's "Analizza" flow still works without changes.
- **Testing Approach:** Existing tests must still pass.
- **Output:** Minimal annotation in `src/renderer/src/hooks/useAgentSession.ts`.

#### T-010: SessionListPanel component

- **Type:** IMPLEMENT
- **Wave:** 4 — PARALLEL (after T-008)
- **Implementation Notes:**
  1. Create `src/renderer/src/components/dashboard/SessionListPanel.tsx`.
  2. Props: `sessions`, `selectedId`, `onSelect`, `statusFilter`, `onStatusFilterChange`, `runningCount`, `onNewSession`.
  3. Render filter tabs (All / Running / Completed / Failed / Aborted).
  4. Render session items: status badge (colored dot + label), provider badge (icon), MCP badge (icon if available), secondary count badge, bug ID, startedAt relative time.
  5. Selected item gets highlight ring.
  6. Empty state when no sessions match filter.
  7. "Nuova Sessione" button at top — disabled with tooltip when `runningCount >= maxConcurrentSessions`.
- **Acceptance Criteria:** List renders correctly, filtering works, selection emits callback.
- **Testing Approach:** Snapshot + interaction tests.
- **Output:** New component file.

#### T-011: SessionDetailPanel component

- **Type:** IMPLEMENT
- **Wave:** 4 — PARALLEL (after T-008)
- **Implementation Notes:**
  1. Create `src/renderer/src/components/dashboard/SessionDetailPanel.tsx`.
  2. Refactor from existing `SessionsPanel.tsx` — extract the log/report/stats rendering.
  3. Props: `session: AgentSession | null`, `mcpStatus`, `onAbort`, `onCopyReport`, `onSaveReport`, `onOpenBug`.
  4. Add action bar below report: Copy Report button, Save .md button, Open Bug in ADO button.
  5. Add turn-based progress bar in header for running sessions (estimate: chunk count / 50 capped at 95%).
  6. Keep the same visual structure: header, error, log accordion, report accordion, stats accordion.
- **Acceptance Criteria:** Detail panel displays selected session's data; actions trigger callbacks.
- **Testing Approach:** Unit test with mock session data.
- **Output:** New component file.

#### T-012: SessionWorkspace layout + DashboardPage integration

- **Type:** IMPLEMENT
- **Wave:** 4 — SEQUENTIAL (after T-010, T-011)
- **Implementation Notes:**
  1. Create `src/renderer/src/components/dashboard/SessionWorkspace.tsx`.
  2. Two-column layout: `SessionListPanel` (left, ~320px) + `SessionDetailPanel` (right, flex).
  3. Wire `useAgentSessions` hook.
  4. Pass `maxConcurrentSessions` from settings (already available in DashboardPage via useDashboard or a new settings read).
  5. In `DashboardPage.tsx`: replace the `viewMode === 'sessions'` branch that currently renders `<SessionsPanel>` with `<SessionWorkspace>`.
  6. Update tab badge: show running count next to "Sessioni" label.
  7. Remove `useAgentSession` usage from DashboardPage if fully replaced; or keep for non-session-tab usage.
- **Acceptance Criteria:** Sessions tab renders the workspace layout; tab badge shows running count.
- **Testing Approach:** Integration test via DashboardPage render.
- **Output:** New `SessionWorkspace.tsx`, updated `DashboardPage.tsx`.

#### T-013: Renderer tests (hook + components)

- **Type:** TEST
- **Wave:** 5 — PARALLEL
- **Implementation Notes:**
  1. `tests/renderer/useAgentSessions.spec.ts`:
     - Test initial load from `agentListSessions`.
     - Test chunk routing to correct session.
     - Test status filter.
     - Test `startSession` calls preload correctly.
     - Test `abortSession` calls preload correctly.
  2. `tests/renderer/SessionListPanel.spec.tsx`:
     - Test rendering sessions with various statuses.
     - Test filter tab switching.
     - Test selection callback.
     - Test disabled new-session button at limit.
  3. `tests/renderer/SessionDetailPanel.spec.tsx`:
     - Test report actions rendered for completed session.
     - Test abort button for running session.
     - Test progress bar visibility.
- **Acceptance Criteria:** All tests pass.
- **Testing Approach:** Vitest + jsdom + testing-library.
- **Output:** New spec files.

#### T-014: Report actions (copy, save .md, open ADO)

- **Type:** INTEGRATE
- **Wave:** 5 — PARALLEL
- **Implementation Notes:**
  1. In `SessionDetailPanel`: wire Copy Report → `navigator.clipboard.writeText(session.report)`.
  2. Save as .md → call `agentSaveReport({ sessionId, defaultFilename: 'bug-{bugId}-report.md' })`.
  3. In IPC handler for `AGENT_SAVE_REPORT`: `dialog.showSaveDialog(...)`, then `fs.writeFile(...)`.
  4. Open Bug in ADO → call `openExternal(buildAdoUrl(settings, bugId))` (construct URL from settings.orgUrl + projectName + bug ID).
  5. Build ADO URL helper: `https://{orgUrl}/{projectName}/_workitems/edit/{bugId}`.
- **Acceptance Criteria:** All three actions work end-to-end.
- **Testing Approach:** Mock dialog/clipboard in tests.
- **Output:** Updated `SessionDetailPanel.tsx`, updated `src/main/ipc-handlers.ts`.

### Risk Register

| Risk                                                                  | Impact | Likelihood | Mitigation                                                                     |
| --------------------------------------------------------------------- | ------ | ---------- | ------------------------------------------------------------------------------ |
| electron-store sync writes block main process with many sessions      | Medium | Medium     | Batch persistence: debounce writes, persist only on terminal state transitions |
| Memory growth with many concurrent sessions × 500 chunks each         | Medium | Low        | 500-chunk cap already exists; limit maxConcurrentSessions to 10                |
| Race condition: session completes between list fetch and detail fetch | Low    | Low        | Use in-memory map as single source of truth; push events for real-time sync    |
| Backwards compat break if useAgentSession is removed too early        | High   | Low        | Keep useAgentSession unchanged (Option A); only deprecate                      |
| Store schema migration failure on corrupt data                        | Medium | Low        | Migration wraps in try/catch, defaults to empty array on error                 |
| Chunk streaming to wrong session in renderer                          | Medium | Medium     | All IPC events carry `sessionId`; hook filters by it explicitly                |

---

### Completeness Assessment

- Functional coverage: **High** — all FR mapped to tasks
- Non-functional coverage: **High** — encryption, performance, migration covered
- Task-to-requirement mapping: **Complete**

| Requirement  | Tasks        |
| ------------ | ------------ |
| FR-MS-001    | T-003        |
| FR-MS-002    | T-003        |
| FR-MS-003    | T-003        |
| FR-MS-004    | T-003        |
| FR-PS-001    | T-004, T-005 |
| FR-PS-002    | T-004, T-005 |
| FR-PS-003    | T-004, T-005 |
| FR-PS-004    | T-004        |
| FR-IPC-001   | T-005, T-006 |
| FR-IPC-002   | T-005, T-006 |
| FR-IPC-003   | T-005, T-006 |
| FR-UI-001    | T-010        |
| FR-UI-002    | T-010        |
| FR-UI-003    | T-011        |
| FR-UI-004    | T-012        |
| FR-UI-005    | T-010, T-012 |
| FR-UI-006    | T-010        |
| FR-UI-007    | T-011, T-014 |
| FR-UI-008    | T-011        |
| FR-HK-001    | T-008        |
| NFR-MIGR-001 | T-002        |

### Status

**READY FOR APPROVAL**
