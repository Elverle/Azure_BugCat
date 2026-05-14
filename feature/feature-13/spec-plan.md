## Spec-Planner — Iteration 2

### Feature Context

- **Feature:** Storico Chiusi — KPI Page for Closed/Done Bugs
- **Feature #:** feature-13
- **Feature Type:** full-stack

### Iteration History

- **Iteration 1:** Complete spec+plan with dashboard-tab architecture. All requirements validated except navigation approach.
- **Iteration 2 (this):** Architecture change — "Storico Chiusi" is now a **separate top-level page** at the same navigation level as Dashboard and Settings, not a tab inside DashboardPage. DashboardPage.tsx is NOT modified. Navigation uses `react-router-dom` (`HashRouter` + `NavLink` in `Topbar.tsx`).

---

## Part 1: Requirements

### Functional Requirements

#### Navigation & Routing

- **FR-NAV-001:** Top-level "Storico Chiusi" page route
  - Description: Add a new route `/closed-bugs` in `App.tsx` that renders `ClosedBugsPage`. The route is a sibling of `/` (Dashboard) and `/settings` (Settings) inside the existing `AppLayout`.
  - Acceptance Criteria: Given the app is running, When the user navigates to `/#/closed-bugs`, Then the `ClosedBugsPage` is rendered inside the `AppLayout` shell (Topbar + main area).
  - Priority: Must-Have

- **FR-NAV-002:** Navigation link in Topbar
  - Description: Add a third `NavLink` in `Topbar.tsx` pointing to `/closed-bugs` with the label "Storico Chiusi". It uses the same active/inactive styling as the existing Dashboard and Settings links. An `Archive` icon (from lucide-react) is shown inline with the label.
  - Acceptance Criteria: Given any page is active, When the user looks at the top bar, Then three navigation links are visible: "Dashboard", "Storico Chiusi", "Settings". The active link has the blue-700 underline accent.
  - Priority: Must-Have

- **FR-NAV-003:** DashboardPage remains unmodified
  - Description: No tabs, view modes, hooks, or imports are added to `DashboardPage.tsx` for this feature. The closed-bug functionality lives entirely in its own page.
  - Acceptance Criteria: `DashboardPage.tsx` has zero diff from its current state after FT-13 is implemented.
  - Priority: Must-Have

#### Data Layer

- **FR-DATA-001:** New IPC channel `catalog:get-closed`
  - Description: Expose a new IPC channel that reads `bugCatalog` from electron-store and returns only entries where `closedAt !== null`. The main process filters and returns a `CatalogBug[]` array. This avoids sending the full catalog (including open entries) to the renderer and keeps the contract explicit.
  - Acceptance Criteria: Given a catalog with 10 open and 5 closed bugs, When renderer invokes `catalog:get-closed`, Then it receives exactly 5 `CatalogBug` items.
  - Priority: Must-Have

- **FR-DATA-002:** Renderer must not receive open catalog entries through this channel
  - Description: The closed-bugs page operates exclusively on bugs with a non-null `closedAt`. Bugs currently in the active session/query must not appear in the closed-bug KPIs.
  - Acceptance Criteria: Given a bug that is still in the current ADO query (open), When KPIs are computed, Then that bug is excluded even if it exists in the catalog.
  - Priority: Must-Have

- **FR-DATA-003:** Catalog categorization data usable for aggregation
  - Description: If a `CatalogBug` has non-empty `macroCategory`/`subCategory` (it was categorized before being closed), those fields must be available for category-based KPIs.
  - Acceptance Criteria: Given a closed bug with `macroCategory = "Performance"`, When category distribution KPI is computed, Then "Performance" count increments.
  - Priority: Must-Have

#### KPI Presentation

- **FR-KPI-001:** Total closed bugs
  - Description: Display the total count of closed/done bugs in the historical catalog.
  - Acceptance Criteria: Given 42 closed bugs in catalog, When page is viewed, Then a card shows "42" as total.
  - Priority: Must-Have

- **FR-KPI-002:** Bugs closed since last fetch
  - Description: Display how many bugs transitioned to closed status in the most recent fetch (i.e., they were in the previous session but absent in the latest fetch, causing `closedAt` to be set during that fetch).
  - Acceptance Criteria: Given the latest fetch set `closedAt` on 3 previously-open bugs, When page is viewed, Then a card shows "3" as "Chiusi nell'ultimo aggiornamento".
  - Implementation Note: This is derivable by comparing `closedAt` timestamps. Bugs whose `closedAt` equals the session's `fetchedAt` are "recently closed". Both values are set to the same `now` in `mergeFetchIntoCatalog`, so exact string match is reliable. `fetchedAt` is included in the IPC response.
  - Priority: Must-Have

- **FR-KPI-003:** Distribution by macro-category
  - Description: Display a breakdown of closed bugs grouped by `macroCategory`. Bugs without categorization are grouped under a "Non categorizzato" label.
  - Acceptance Criteria: Given 10 closed bugs: 4 Performance, 3 Security, 3 uncategorized, When page is viewed, Then the distribution shows three groups with correct counts.
  - Priority: Must-Have

- **FR-KPI-004:** Similarity group participation KPI
  - Description: Display the count and percentage of closed bugs that have `everInSimilarityGroup === true`.
  - Acceptance Criteria: Given 20 closed bugs, 8 with `everInSimilarityGroup = true`, When page is viewed, Then a card shows "8 / 20 (40%)" or equivalent.
  - Priority: Must-Have

- **FR-KPI-005:** Last history update timestamp
  - Description: Display the timestamp of the last session fetch that contributed to the catalog (`fetchedAt` from the current session, or the max `lastSeenAt` across all catalog entries).
  - Acceptance Criteria: Given session `fetchedAt = "2025-05-10T14:30:00Z"`, When page is viewed, Then the page shows "Ultimo aggiornamento: 10/05/2025 14:30" (locale-formatted).
  - Priority: Must-Have

#### UX States

- **FR-UX-001:** Empty state — no closed bugs
  - Description: If the catalog is empty or contains no closed bugs, the page shows a friendly empty state with an icon and explanation.
  - Acceptance Criteria: Given catalog has 0 closed entries, When user opens the page, Then a centered empty state with an icon and message "Nessun bug storico chiuso/done trovato" is shown. No errors in console.
  - Priority: Must-Have

- **FR-UX-002:** Partial categorization graceful degradation
  - Description: If some closed bugs lack categorization data, category-based KPIs must still render. The "Non categorizzato" bucket absorbs uncategorized bugs. Count-based KPIs (total, recently closed, similarity) are always available.
  - Acceptance Criteria: Given 5 closed bugs, 2 categorized and 3 uncategorized, When page is viewed, Then total shows 5, category distribution shows 2 categories + "Non categorizzato (3)", and no rendering errors.
  - Priority: Must-Have

- **FR-UX-003:** Loading state
  - Description: While the IPC call to retrieve closed catalog data is in flight, the page shows a spinner consistent with other loading states in the app.
  - Acceptance Criteria: Given slow IPC response, When page is navigated to, Then a `Loader2` spinner is shown until data arrives.
  - Priority: Should-Have

### Non-Functional Requirements

- **NFR-UX-001:** Visual coherence
  - The new page must use the same card/grid layout style as `KpiCards.tsx`, the same color palette (white cards, gray borders, indigo/purple accents), and the same typography scale. It should have a page header consistent with other pages.

- **NFR-PERF-001:** Efficient KPI computation
  - KPI helpers must be pure functions with O(n) complexity over the closed-bug array. No nested loops. Memoized in the component via `useMemo`.

- **NFR-MAINT-001:** Testable helpers
  - All KPI aggregation logic must live in `src/renderer/src/lib/closed-bug-kpis.ts` as exported pure functions, separately testable without React rendering.

- **NFR-COMPAT-001:** FT-12 data model compatibility
  - Feature must consume `CatalogBug` and `BugCatalog` types as-is from `@shared/types`. No new fields on `CatalogBug`. No changes to catalog-merge logic.

- **NFR-SEC-001:** No catalog mutation from renderer
  - The new IPC channel is read-only. Renderer cannot modify the catalog through this channel.

### Constraints

- The renderer currently has no way to read the catalog. A new IPC channel is required.
- `closedAt` semantics: a bug is "closed" when it was previously in the catalog but absent from the latest ADO query fetch. This is a proxy for "closed/done" — the actual ADO state transition isn't tracked.
- `CatalogBug` may have empty `macroCategory`/`subCategory`/`categoryReason` if the bug was never categorized before being closed (e.g., fetched once, never categorized, then absent from next fetch).
- Routing uses `react-router-dom` with `HashRouter`. New routes go inside the `<Route element={<AppLayout />}>` wrapper in `App.tsx`. Navigation links go in `Topbar.tsx` as `NavLink` elements.

### Assumptions

- FT-12 is complete and stable — `bugCatalog` is reliably persisted and updated on every fetch.
- The `closedAt` timestamp is set to the same `now` value used for `fetchedAt` in `mergeFetchIntoCatalog`, making them directly comparable for "recently closed" derivation.
- The catalog can grow large over time but is bounded by the ADO query scope; initial KPI computation on hundreds of entries is acceptable without pagination.

### Out of Scope

- CSV/PDF export of closed-bug data.
- Advanced filtering/sorting within the closed-bugs page (this iteration shows aggregated KPIs only, not a bug list).
- Multi-dimensional cross-tabulation or drill-down analytics.
- Changes to the LLM pipeline, fetch logic, or catalog-merge behavior.
- Time-series or trend charts (future iteration).
- Any modification to `DashboardPage.tsx`.

### Edge Cases

| Scenario                                                                     | Expected Behavior                                                                                                                | Related Requirement    |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Catalog is `null` (never fetched)                                            | Empty state on page, no errors                                                                                                   | FR-UX-001              |
| Catalog has entries but all are open (`closedAt === null` for all)           | Empty state on page                                                                                                              | FR-UX-001              |
| All closed bugs lack categorization                                          | Total/recently-closed/similarity KPIs show, category distribution shows only "Non categorizzato"                                 | FR-UX-002              |
| All closed bugs lack similarity metadata (`everInSimilarityGroup === false`) | Similarity KPI shows "0 (0%)", not hidden                                                                                        | FR-KPI-004             |
| Session has no `fetchedAt` (edge: cleared session but catalog persists)      | "Recently closed" KPI shows "N/D" or 0, last-update shows "N/D"                                                                  | FR-KPI-002, FR-KPI-005 |
| A bug reappears in the query after being marked closed                       | It is no longer closed (`closedAt` reset to `null` by `mergeFetchIntoCatalog`); it disappears from closed KPIs on next page load | FR-DATA-002            |
| Very large catalog (1000+ entries)                                           | KPI computation remains < 50ms; no UI jank                                                                                       | NFR-PERF-001           |
| User navigates directly to `/#/closed-bugs` via URL                          | Page renders correctly; Topbar shows "Storico Chiusi" as active                                                                  | FR-NAV-001             |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 10
- **Parallelizable:** 7 (70%)
- **Execution Waves:** 4

### Execution Waves

#### Wave 1 — Shared Contract, Main Process & Pure Helpers

**Execution:** PARALLEL

| Task ID | Type      | Title                                                 | Description                                    | Files                                                    | Depends On | Complexity |
| ------- | --------- | ----------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------- | ---------- | ---------- |
| T-001   | IMPLEMENT | Add `CATALOG_GET_CLOSED` IPC channel                  | Add channel constant and implement handler     | `src/shared/ipc-channels.ts`, `src/main/ipc-handlers.ts` | None       | S          |
| T-002   | IMPLEMENT | Expose `getCatalogClosed` in preload + global typings | Wire the new channel through preload bridge    | `src/preload/index.ts`, `src/preload/index.d.ts`         | None       | S          |
| T-003   | IMPLEMENT | Create `closed-bug-kpis.ts` helper module             | Pure KPI computation functions for closed bugs | `src/renderer/src/lib/closed-bug-kpis.ts`                | None       | M          |

#### Wave 2 — Tests for Wave 1

**Execution:** PARALLEL

| Task ID | Type | Title                                     | Description                                 | Files                                    | Depends On | Complexity |
| ------- | ---- | ----------------------------------------- | ------------------------------------------- | ---------------------------------------- | ---------- | ---------- |
| T-004   | TEST | IPC handler test for `catalog:get-closed` | Test filtering logic in main process        | `tests/main/ipc-handlers.spec.ts`        | T-001      | S          |
| T-005   | TEST | Unit tests for `closed-bug-kpis.ts`       | Test all KPI functions including edge cases | `tests/renderer/closed-bug-kpis.spec.ts` | T-003      | M          |

#### Wave 3 — Renderer Hook, Page & Navigation

**Execution:** PARALLEL (T-006 ∥ T-007), then SEQUENTIAL (T-008 after T-007)

| Task ID | Type      | Title                                            | Description                                           | Files                                                                       | Depends On          | Complexity |
| ------- | --------- | ------------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------- | ------------------- | ---------- |
| T-006   | IMPLEMENT | Create `useClosedBugKpis` hook                   | Fetches closed catalog data via IPC, computes KPIs    | `src/renderer/src/hooks/useClosedBugKpis.ts`                                | T-001, T-002, T-003 | M          |
| T-007   | IMPLEMENT | Create `ClosedBugsPage.tsx`                      | Top-level page with KPI cards, empty/loading states   | `src/renderer/src/pages/ClosedBugsPage.tsx`                                 | T-003, T-006        | M          |
| T-008   | INTEGRATE | Add route and navigation link for Storico Chiusi | New route in `App.tsx`, new `NavLink` in `Topbar.tsx` | `src/renderer/src/App.tsx`, `src/renderer/src/components/layout/Topbar.tsx` | T-007               | S          |

#### Wave 4 — Renderer Tests & Documentation

**Execution:** PARALLEL

| Task ID | Type  | Title                                       | Description                                                 | Files                                                                               | Depends On          | Complexity |
| ------- | ----- | ------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------- | ---------- |
| T-009   | TEST  | Renderer tests for hook + page + navigation | Test hook, page rendering, empty state, navigation          | `tests/renderer/useClosedBugKpis.spec.ts`, `tests/renderer/ClosedBugsPage.spec.tsx` | T-006, T-007, T-008 | M          |
| T-010   | SETUP | Update wiki and feature-index.md            | Document FT-13 in feature-index, update relevant wiki pages | `feature-index.md`, `wiki/`                                                         | T-008               | S          |

### Critical Path

T-001 → T-006 → T-007 → T-008 → T-009 (critical path: 5 tasks)

### Task Details

#### T-001: Add `CATALOG_GET_CLOSED` IPC channel

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. In `src/shared/ipc-channels.ts`, add `CATALOG_GET_CLOSED: 'catalog:get-closed'` to `IPC_CHANNELS` under the Catalog section.
  2. In `src/main/ipc-handlers.ts`, add handler:
     ```ts
     ipcMain.handle(IPC_CHANNELS.CATALOG_GET_CLOSED, () => {
       const catalog = store.get('bugCatalog') as BugCatalog | null
       if (!catalog) return { closedBugs: [], fetchedAt: null }
       const session = store.get('session') as SessionData | null
       const closedBugs = Object.values(catalog).filter((b) => b.closedAt !== null)
       return { closedBugs, fetchedAt: session?.fetchedAt ?? null }
     })
     ```
  3. The response shape is `{ closedBugs: CatalogBug[], fetchedAt: string | null }`. Returning `fetchedAt` alongside closed bugs enables the "recently closed" KPI derivation in the renderer without an additional IPC call.
- **Acceptance Criteria:** Channel registered, returns only closed catalog entries and session fetchedAt.
- **Testing Approach:** T-004
- **Output:** Updated `ipc-channels.ts`, updated `ipc-handlers.ts`

#### T-002: Expose `getCatalogClosed` in preload + global typings

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. In `src/preload/index.ts`, add to the `electronAPI` object:
     ```ts
     getCatalogClosed: () => ipcRenderer.invoke(IPC_CHANNELS.CATALOG_GET_CLOSED),
     ```
  2. In `src/preload/index.d.ts`, add to the `ElectronAPI` interface:
     ```ts
     getCatalogClosed: () => Promise<unknown>
     ```
  3. Note: `window.electronAPI` is intentionally typed as `unknown` at the boundary. The renderer hook (T-006) casts the response using shared types.
- **Acceptance Criteria:** `window.electronAPI.getCatalogClosed()` callable from renderer.
- **Testing Approach:** Covered by T-004 (main) and T-009 (renderer mock).
- **Output:** Updated `preload/index.ts`, updated `preload/index.d.ts`

#### T-003: Create `closed-bug-kpis.ts` helper module

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Create `src/renderer/src/lib/closed-bug-kpis.ts`.
  2. Define a `ClosedBugKpiData` interface:
     ```ts
     export interface ClosedBugKpiData {
       totalClosed: number
       recentlyClosedCount: number
       categoryDistribution: Array<{ category: string; count: number }>
       similarityGroupCount: number
       similarityGroupPercentage: number
       lastUpdateAt: string | null
     }
     ```
  3. Implement `computeClosedBugKpis(closedBugs: CatalogBug[], fetchedAt: string | null): ClosedBugKpiData`:
     - `totalClosed`: `closedBugs.length`
     - `recentlyClosedCount`: count of bugs where `closedAt === fetchedAt` (exact string match since both are set to the same `now` in `mergeFetchIntoCatalog`). If `fetchedAt` is null, return 0.
     - `categoryDistribution`: group by `macroCategory` (empty/falsy → "Non categorizzato"), sort descending by count.
     - `similarityGroupCount`: count where `everInSimilarityGroup === true`.
     - `similarityGroupPercentage`: `totalClosed > 0 ? Math.round((similarityGroupCount / totalClosed) * 100) : 0`.
     - `lastUpdateAt`: `fetchedAt` pass-through.
  4. All functions are pure, no React imports.
- **Acceptance Criteria:** All KPI values correctly computed for normal and edge-case inputs.
- **Testing Approach:** T-005
- **Output:** New `closed-bug-kpis.ts`

#### T-004: IPC handler test for `catalog:get-closed`

- **Type:** TEST
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. In `tests/main/ipc-handlers.spec.ts`, add a `describe('catalog:get-closed')` block.
  2. Test cases:
     - Catalog is `null` → returns `{ closedBugs: [], fetchedAt: null }`.
     - Catalog has mixed open/closed → returns only entries with `closedAt !== null`.
     - Session exists with `fetchedAt` → `fetchedAt` included in response.
     - Session is `null` → `fetchedAt` is `null`.
  3. Follow existing test patterns (mock `store.get`).
- **Acceptance Criteria:** All test cases pass.
- **Testing Approach:** TDD-style addition to existing spec file.
- **Output:** Updated `ipc-handlers.spec.ts`

#### T-005: Unit tests for `closed-bug-kpis.ts`

- **Type:** TEST
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `tests/renderer/closed-bug-kpis.spec.ts`.
  2. Test `computeClosedBugKpis` with:
     - Empty array → all zeros, `lastUpdateAt` null.
     - All bugs categorized → correct distribution.
     - Mixed categorized/uncategorized → "Non categorizzato" bucket present.
     - Some with `everInSimilarityGroup = true` → correct count/percentage.
     - `fetchedAt` matches some `closedAt` → correct `recentlyClosedCount`.
     - `fetchedAt` is `null` → `recentlyClosedCount = 0`.
     - All bugs have `everInSimilarityGroup = false` → similarity KPI = 0 / 0%.
- **Acceptance Criteria:** Full branch coverage of the helper.
- **Testing Approach:** Post-implementation unit tests.
- **Output:** New `closed-bug-kpis.spec.ts`

#### T-006: Create `useClosedBugKpis` hook

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Create `src/renderer/src/hooks/useClosedBugKpis.ts`.
  2. Hook shape:
     ```ts
     export interface UseClosedBugKpisReturn {
       kpis: ClosedBugKpiData | null
       loading: boolean
     }
     export function useClosedBugKpis(): UseClosedBugKpisReturn
     ```
  3. On mount, call `window.electronAPI.getCatalogClosed()`, cast the result to `{ closedBugs: CatalogBug[], fetchedAt: string | null }`, compute KPIs via `computeClosedBugKpis`, store in state.
  4. Expose a `loading` flag (true until IPC resolves).
  5. Use `useEffect` + cleanup pattern consistent with existing hooks (e.g., `useAiCluster`).
  6. Data is fresh on each page navigation (hook mounts when page mounts, unmounts when user navigates away). No polling needed.
- **Acceptance Criteria:** Hook returns loading state then computed KPIs.
- **Testing Approach:** T-009
- **Output:** New `useClosedBugKpis.ts`

#### T-007: Create `ClosedBugsPage.tsx`

- **Type:** IMPLEMENT
- **Wave:** 3 — SEQUENTIAL (depends on T-006)
- **Implementation Notes:**
  1. Create `src/renderer/src/pages/ClosedBugsPage.tsx`.
  2. This is a **top-level page** — it owns its own layout within the `<main>` area provided by `AppLayout`.
  3. Page structure:
     - **Page header:** Title "Storico Bug Chiusi" with `Archive` icon, consistent with other page headers.
     - **Content area:** Renders KPI cards and distribution, or empty/loading states.
  4. Uses `useClosedBugKpis()` hook internally.
  5. **Loading state:** Centered `Loader2` spinner (same pattern as other loading states).
  6. **Empty state (kpis is null or totalClosed === 0):** Centered icon (`Archive` from lucide) + message "Nessun bug storico chiuso/done trovato" + subtext "I bug che escono dalla query ADO verranno tracciati qui automaticamente."
  7. **KPI grid** (when data is available):
     - Row 1 (4-col grid, same as `KpiCards`):
       - Card 1: "Bug Chiusi Totali" — `totalClosed` (large number, gray-900)
       - Card 2: "Chiusi Ultimo Aggiornamento" — `recentlyClosedCount` (indigo accent)
       - Card 3: "In Gruppo Similarità" — `similarityGroupCount` / `totalClosed` (`similarityGroupPercentage`%) (purple accent)
       - Card 4: "Ultimo Aggiornamento" — `lastUpdateAt` locale-formatted, or "N/D" if null
     - Row 2: Category distribution — a simple horizontal bar list or card with category name + count + proportion bar, sorted descending. Uses existing `cn()` utility for conditional classes.
  8. All visual elements use existing Tailwind classes consistent with `KpiCards.tsx`.
  9. **Design note:** Since this is a standalone page (not a panel inside another page), it should include appropriate padding (`px-6 py-6` or similar) and a page title section, following the same layout conventions as `DashboardPage` and `SettingsPage`.
- **Acceptance Criteria:** Page renders all three states correctly (loading, empty, data); visually coherent with existing app pages.
- **Testing Approach:** T-009
- **Output:** New `ClosedBugsPage.tsx`

#### T-008: Add route and navigation link for Storico Chiusi

- **Type:** INTEGRATE
- **Wave:** 3 — SEQUENTIAL (depends on T-007)
- **Implementation Notes:**
  1. In `src/renderer/src/App.tsx`:
     - Import `ClosedBugsPage` from `@renderer/pages/ClosedBugsPage`.
     - Add route inside the `<Route element={<AppLayout />}>` block:
       ```tsx
       <Route path="/closed-bugs" element={<ClosedBugsPage />} />
       ```
     - Place it between the Dashboard (`/`) and Settings (`/settings`) routes.
  2. In `src/renderer/src/components/layout/Topbar.tsx`:
     - Import `Archive` from `lucide-react`.
     - Add a third `NavLink` between Dashboard and Settings:
       ```tsx
       <NavLink
         to="/closed-bugs"
         className={({ isActive }) =>
           cn(
             'px-3 py-2 text-sm font-medium flex items-center gap-1.5',
             isActive
               ? 'text-blue-700 border-b-2 border-blue-700'
               : 'text-gray-500 hover:text-gray-900'
           )
         }
       >
         <Archive className="w-4 h-4" />
         Storico Chiusi
       </NavLink>
       ```
  3. **No changes to `DashboardPage.tsx`.**
- **Acceptance Criteria:** Navigation link appears in Topbar between Dashboard and Settings; clicking it navigates to `/closed-bugs` and renders `ClosedBugsPage`; active state styling works correctly; existing navigation remains unaffected.
- **Testing Approach:** T-009
- **Output:** Updated `App.tsx`, updated `Topbar.tsx`

#### T-009: Renderer tests for hook + page + navigation

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. **`tests/renderer/useClosedBugKpis.spec.ts`**: Mock `window.electronAPI.getCatalogClosed`, test loading → resolved states, test with null catalog, test with closed bugs.
  2. **`tests/renderer/ClosedBugsPage.spec.tsx`**:
     - Render with mock returning empty closed bugs → empty state visible.
     - Render with mock returning closed bugs → KPI cards visible with correct values.
     - Render with mock in pending state → spinner visible.
     - Verify page title "Storico Bug Chiusi" is rendered.
  3. **Navigation integration** (in `ClosedBugsPage.spec.tsx` or a separate routing test):
     - Wrap in `MemoryRouter`, verify `/closed-bugs` renders the page.
     - Verify Topbar "Storico Chiusi" link has active state when on `/closed-bugs`.
  4. Follow existing test patterns (jsdom, mock `window.electronAPI`).
  5. **No modifications to `DashboardPage.spec.tsx`** — DashboardPage is not touched by this feature.
- **Acceptance Criteria:** All new test cases pass; existing tests remain green.
- **Testing Approach:** Post-implementation.
- **Output:** New `useClosedBugKpis.spec.ts`, new `ClosedBugsPage.spec.tsx`

#### T-010: Update wiki and feature-index.md

- **Type:** SETUP
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Add FT-13 row to `feature-index.md`:
     ```
     | ##  | FT-13   | Storico Chiusi — KPI Page for Closed/Done Bugs                 | Complete |
     ```
  2. Update relevant wiki pages (app routing/navigation, IPC channels, data flow, page inventory).
  3. Use `codebase-expert` agent to refresh wiki documentation.
- **Acceptance Criteria:** Feature-index updated, wiki reflects new page and IPC channel.
- **Testing Approach:** Manual review.
- **Output:** Updated `feature-index.md`, updated wiki pages

### Risk Register

| Risk                                                                                                                                       | Impact                                      | Likelihood | Mitigation                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `closedAt` timestamp comparison for "recently closed" may not be exact string equality if race conditions exist in `mergeFetchIntoCatalog` | "Recently closed" count could be inaccurate | Low        | Both `closedAt` and `fetchedAt` use the same `now` constant in `mergeFetchIntoCatalog`; exact match is reliable. Add a unit test confirming this. |
| Large catalog (1000+ entries) causes UI jank                                                                                               | Slow page load                              | Low        | KPI computation is O(n) with a single pass; `useMemo` in component prevents recomputation. Profile if needed.                                     |
| Users confuse "absent from query" with "actually closed in ADO"                                                                            | Misleading KPIs                             | Medium     | Add subtle tooltip or info text in the UI explaining the semantics: "Bug non più presenti nella query ADO attiva."                                |
| `CatalogBug` entries exist without any categorization data                                                                                 | Category distribution KPI is misleading     | Low        | "Non categorizzato" bucket is always shown for uncategorized bugs; count-based KPIs always work.                                                  |
| Topbar becomes crowded with three items on narrow windows                                                                                  | Layout wrapping                             | Low        | All three links are short text; `flex gap-4` handles the layout. Monitor at narrow viewport widths.                                               |

---

### Requirement-to-Task Mapping

| Requirement                          | Tasks                                    |
| ------------------------------------ | ---------------------------------------- |
| FR-NAV-001 (route)                   | T-008                                    |
| FR-NAV-002 (Topbar link)             | T-008                                    |
| FR-NAV-003 (DashboardPage untouched) | Implicit — no task touches DashboardPage |
| FR-DATA-001 (IPC channel)            | T-001                                    |
| FR-DATA-002 (closed-only filter)     | T-001                                    |
| FR-DATA-003 (categorization usable)  | T-003                                    |
| FR-KPI-001–005 (all KPIs)            | T-003 (computation), T-007 (display)     |
| FR-UX-001 (empty state)              | T-007                                    |
| FR-UX-002 (partial categorization)   | T-003, T-007                             |
| FR-UX-003 (loading state)            | T-006, T-007                             |
| NFR-UX-001 (visual coherence)        | T-007                                    |
| NFR-PERF-001 (efficient computation) | T-003                                    |
| NFR-MAINT-001 (testable helpers)     | T-003, T-005                             |
| NFR-COMPAT-001 (FT-12 compat)        | T-001, T-003                             |
| NFR-SEC-001 (read-only IPC)          | T-001                                    |

### Completeness Assessment

- Functional coverage: **High** — all 5 KPIs, 3 navigation requirements, 3 data requirements, 3 UX states.
- Non-functional coverage: **High** — performance, visual coherence, testability, security, and compatibility addressed.
- Task-to-requirement mapping: **Complete** — every FR maps to at least one task, every task maps to at least one FR.
- Architectural change: **Fully incorporated** — DashboardPage is untouched, new page lives at `/closed-bugs` with its own route and Topbar link.

### Changes from Iteration 1

| Area             | Iteration 1                                    | Iteration 2                                 |
| ---------------- | ---------------------------------------------- | ------------------------------------------- |
| Navigation model | Tab inside DashboardPage                       | Separate top-level page `/closed-bugs`      |
| FR-NAV-001       | Dashboard tab bar                              | Route in `App.tsx`                          |
| FR-NAV-002       | Tab isolation / state preservation             | `NavLink` in `Topbar.tsx`                   |
| FR-NAV-003       | (did not exist)                                | DashboardPage untouched constraint          |
| T-007            | `ClosedBugKpiPanel` component (panel)          | `ClosedBugsPage.tsx` (full page)            |
| T-008            | Modify `DashboardPage.tsx` for tabs            | Modify `App.tsx` + `Topbar.tsx` for routing |
| T-009            | Tests include `DashboardPage.spec.tsx` changes | Tests do NOT touch `DashboardPage.spec.tsx` |
| Files modified   | `DashboardPage.tsx` changed                    | `DashboardPage.tsx` NOT changed             |

### Status

**READY FOR APPROVAL**

---

## Questions for User

1. **Navigation link position:** The plan places "Storico Chiusi" between "Dashboard" and "Settings" in the Topbar. Should it go after "Settings" instead, to keep the primary workflow (Dashboard → Settings) visually adjacent?

2. **Icon in nav link:** The plan adds an `Archive` icon inline with the "Storico Chiusi" label in the Topbar. The existing "Dashboard" and "Settings" links have no icons. Should the icon be kept for visual distinction, or removed for consistency with the other two links?

3. **Category distribution visualization:** The plan proposes a simple list of categories with counts and a proportional bar. Would a more compact representation (e.g., horizontal stacked bar, or just a table) be preferred for v1?
