## Spec-Planner — Iteration 1

### Feature Context

- **Feature:** Dashboard Principale: Tabella, Filtri e Raggruppamenti
- **Feature #:** feature-5
- **Feature Type:** frontend (Renderer Process only)

---

## Part 1: Requirements

### Functional Requirements

#### Data Loading & Session

- **FR-DATA-001:** Load Session on Mount
  - Description: On DashboardPage mount, call `window.electronAPI.getSession()` and populate local state with `SessionData.bugs` (CategorizedBug[]).
  - Acceptance Criteria: Given a non-null session exists, When DashboardPage mounts, Then bugs array is populated and rendered.
  - Priority: Must-Have

- **FR-DATA-002:** Empty State
  - Description: When session is null or contains no bugs, display an empty state with instructions to fetch and categorize bugs.
  - Acceptance Criteria: Given no session data, When page renders, Then a friendly empty state message is shown with a prompt to use Fetch/Categorize actions.
  - Priority: Must-Have

#### KPI Cards

- **FR-KPI-001:** Total Bugs Count
  - Description: Display the count of bugs in the current filtered set.
  - Acceptance Criteria: Given 42 bugs matching filters, When rendered, Then KPI shows "42".
  - Priority: Must-Have

- **FR-KPI-002:** Open/Active Bugs Count
  - Description: Display count of bugs with `state === 'Active'` in the filtered set.
  - Acceptance Criteria: Given filtered bugs where 28 have state "Active", When rendered, Then KPI shows "28" in red-600 text.
  - Priority: Must-Have

- **FR-KPI-003:** Distinct Macro-Categories Count
  - Description: Display the number of unique `macroCategory` values in the filtered set.
  - Acceptance Criteria: Given filtered bugs with 8 distinct macroCategories, When rendered, Then KPI shows "8" in purple-600 text.
  - Priority: Must-Have

- **FR-KPI-004:** Top 3 Assignees
  - Description: Display up to 3 most frequent assignees (by bug count) in the filtered set. Show name and count. If fewer than 3 assignees exist, show only those available.
  - Acceptance Criteria: Given filtered bugs, When rendered, Then KPI card shows top 3 assignees with their bug counts.
  - Priority: Must-Have

#### Filters

- **FR-FILTER-001:** Status Multi-Select Filter
  - Description: Multi-select dropdown filtering bugs by `state`. Options derived dynamically from dataset unique states.
  - Acceptance Criteria: Given states [Active, Resolved, Closed] in dataset, When user selects "Active" and "Resolved", Then only bugs with those states are shown.
  - Priority: Must-Have

- **FR-FILTER-002:** Assignee Multi-Select Filter with Search
  - Description: Multi-select dropdown filtering by `assignee`. Includes text search to filter dropdown options. Null assignees shown as "Unassigned".
  - Acceptance Criteria: Given 10 assignees, When user types "Mar", Then dropdown shows only matching assignees; selecting filters the bug list.
  - Priority: Must-Have

- **FR-FILTER-003:** Macro-Category Multi-Select Filter
  - Description: Multi-select dropdown filtering by `macroCategory`. Options derived dynamically from dataset.
  - Acceptance Criteria: Given macroCategories [Auth, UI, Infra], When user selects "Auth", Then only bugs with macroCategory "Auth" are shown.
  - Priority: Must-Have

- **FR-FILTER-004:** Sub-Category Dependent Multi-Select Filter
  - Description: Multi-select dropdown filtering by `subCategory`. Options depend on currently selected macro-categories. If no macro-category selected, show all sub-categories.
  - Acceptance Criteria: Given macro "Auth" selected with subs [OAuth, SSO, JWT], When sub-category dropdown is opened, Then only [OAuth, SSO, JWT] options appear.
  - Priority: Must-Have

- **FR-FILTER-005:** Free Text Search with Debounce
  - Description: Text input searching across `title` and `description` fields (case-insensitive substring match). Input is debounced at 200ms.
  - Acceptance Criteria: Given search term "login", When debounce fires, Then only bugs with "login" in title or description are shown.
  - Priority: Must-Have

- **FR-FILTER-006:** Filter Composition (AND Logic)
  - Description: All active filters combine with AND logic. Within a single multi-select filter, values combine with OR logic.
  - Acceptance Criteria: Given status=Active AND assignee=Marco, When applied, Then only bugs matching BOTH criteria are shown.
  - Priority: Must-Have

- **FR-FILTER-007:** Reset Filters Button
  - Description: A button that clears all active filters and returns the view to initial state (all bugs, no search term, no group).
  - Acceptance Criteria: Given multiple active filters, When Reset is clicked, Then all filters reset and full bug list is shown.
  - Priority: Must-Have

#### View Toggle

- **FR-VIEW-001:** Table/Card View Toggle
  - Description: Toggle between "Lista Completa" (table view) and "AI Clusters" (card + grouped view). Persists filter state across toggle.
  - Acceptance Criteria: Given filters set and Lista Completa view active, When user switches to AI Clusters view, Then card view shows same filtered bugs.
  - Priority: Must-Have

#### Table View

- **FR-TABLE-001:** Table Columns
  - Description: Table columns: ID, Titolo, Priorità, Stato, Assegnatario, Area Path, Macro-cat, Sotto-cat.
  - Acceptance Criteria: Given bugs loaded, When table view is active, Then all 8 columns are rendered with correct data.
  - Priority: Must-Have

- **FR-TABLE-002:** Column Sorting
  - Description: Click on any column header toggles sort direction (asc → desc → none). Only one column sorted at a time. Default sort: priority ascending.
  - Acceptance Criteria: Given table on initial load, bugs are sorted by priority ascending. When user clicks "Stato" header twice, Then bugs are sorted by state descending.
  - Priority: Must-Have

- **FR-TABLE-003:** Table Row Styling
  - Description: Rows have hover:bg-blue-50 transition. ID column in blue-600 font-medium. Status and category displayed as colored badges.
  - Acceptance Criteria: Given a bug row, When hovered, Then bg-blue-50 is applied. ID shown in blue-600.
  - Priority: Must-Have

#### Card View

- **FR-CARD-001:** Card Layout
  - Description: Each bug rendered as a card with title, ID, status badge, category badge, assignee. Cards in a vertical list.
  - Acceptance Criteria: Given bugs in card view, When rendered, Then each card shows all relevant bug info with appropriate badges.
  - Priority: Should-Have

- **FR-CARD-002:** Sub-Category Color Clustering
  - Description: Cards sharing the same subCategory get a consistent background tint. Color derived deterministically from the subCategory string (hash-to-hue).
  - Acceptance Criteria: Given 3 bugs with subCategory "OAuth", When rendered in card view, Then all 3 have the same subtle background color.
  - Priority: Should-Have

#### Grouping

- **FR-GROUP-001:** Grouping Options
  - Description: Dropdown to select grouping: None / Per Macro-Categoria / Per Sotto-Categoria / Per Assegnatario.
  - Acceptance Criteria: Given "Per Macro-Categoria" selected, When rendered, Then bugs are displayed under group headers by macroCategory.
  - Priority: Must-Have

- **FR-GROUP-002:** Group Headers with Counter
  - Description: Each group header shows the group name (uppercase, tracking-wide) and a badge with bug count.
  - Acceptance Criteria: Given group "Authentication" with 5 bugs, When rendered, Then header shows "AUTHENTICATION" with badge "5 Bug".
  - Priority: Must-Have

- **FR-GROUP-003:** Accordion Expand/Collapse
  - Description: Group sections are collapsible accordion-style. Expanded groups show indigo-50 bg header; collapsed groups show gray-50 bg with opacity-75.
  - Acceptance Criteria: Given an expanded group, When user clicks the header, Then it collapses with chevron-down and opacity-75.
  - Priority: Must-Have

- **FR-GROUP-004:** Collapse All / Expand All
  - Description: Button to toggle all groups collapsed/expanded at once.
  - Acceptance Criteria: Given 3 expanded groups, When "Chiudi tutti" clicked, Then all groups collapse.
  - Priority: Should-Have

#### Badges

- **FR-BADGE-001:** Status Badge Colors
  - Description: Status badges: Active = red-100 bg + red-700 text, Resolved = green-100 bg + green-700 text, Closed = gray-100 bg + gray-700 text.
  - Acceptance Criteria: Given a bug with state "Active", When badge rendered, Then it uses red-100/red-700 coloring.
  - Priority: Must-Have

- **FR-BADGE-002:** Category Badge Deterministic Color
  - Description: Category badges get a deterministic color from the category string (hashed to a predefined palette). Same category always produces same color.
  - Acceptance Criteria: Given category "OAuth" appears on multiple bugs, When rendered, Then all "OAuth" badges have identical coloring.
  - Priority: Must-Have

#### Header Actions

- **FR-ACTION-001:** Fetch Bugs Button
  - Description: White outlined button that calls `window.electronAPI.fetchBugs()`. Shows loading state during fetch. On completion, reloads session.
  - Acceptance Criteria: Given button clicked, When fetch completes, Then session is reloaded and UI updates with new bugs.
  - Priority: Must-Have

- **FR-ACTION-002:** Categorize Button
  - Description: Gradient indigo-to-purple button that calls `window.electronAPI.categorizeBugs()`. Subscribes to progress updates. On completion, reloads session.
  - Acceptance Criteria: Given button clicked, When categorization completes, Then session is reloaded with categorized bugs.
  - Priority: Must-Have

---

### Non-Functional Requirements

- **NFR-PERF-001:** Client-side filtering must complete in <100ms for 200 bugs (useMemo with proper deps).
- **NFR-PERF-002:** Debounce text search at 200ms to prevent excessive re-computation.
- **NFR-A11Y-001:** Interactive elements must be keyboard accessible (tab order, Enter/Space activation).
- **NFR-DESIGN-001:** Visual language must match design.html — white cards, gray-50 bg, border-gray-200, shadow-sm, Inter font, indigo/purple accents.
- **NFR-MAINT-001:** Dashboard code split into focused sub-components (<150 lines each).
- **NFR-LAYOUT-001:** Layout must NOT include pr-[400px] (drawer is FT-06 scope). Main content fills available width.

---

### Constraints

- No new npm dependencies — use React state, useMemo, useCallback, native HTML table.
- Multi-select filters built as custom components (no external select library).
- All filtering/sorting/grouping is client-side (data already in memory from session).
- TypeScript strict mode; all props explicitly typed.
- Follow existing code patterns: functional components, `cn()` utility, lucide-react icons.

### Assumptions

- FT-04 (LLM categorization) is complete: `getSession()` returns valid `SessionData` with `CategorizedBug[]`.
- FT-01 (settings) and FT-03 (ADO fetch) are done: `fetchBugs()` and `categorizeBugs()` work end-to-end.
- Bugs dataset ≤ 500 items (performance boundary for client-side filtering without virtualization).
- The `description` field in bugs may contain HTML — text search should match against stripped text (already converted by main process).

### Out of Scope

- Bug detail drawer (FT-06)
- Pagination / infinite scroll (dataset assumed small)
- Server-side filtering
- Export to CSV/Excel
- Drag-and-drop reordering
- Persistence of filter state across sessions
- pr-[400px] layout offset for drawer

### Edge Cases

| Scenario                                         | Expected Behavior                                   | Related Requirement         |
| ------------------------------------------------ | --------------------------------------------------- | --------------------------- |
| No session data (first launch)                   | Show empty state with guidance                      | FR-DATA-002                 |
| All bugs filtered out                            | Show "No bugs match filters" message                | FR-FILTER-006               |
| Bug with null assignee                           | Display "Unassigned" in table/card and filter       | FR-FILTER-002, FR-TABLE-001 |
| Single macro-category selected then deselected   | Sub-category filter resets to show all options      | FR-FILTER-004               |
| 0 distinct macro-categories (uncategorized bugs) | KPI shows "0", grouping shows "Uncategorized" group | FR-KPI-003, FR-GROUP-002    |
| Very long bug title                              | Truncate with ellipsis in table; full in card view  | FR-TABLE-001, FR-CARD-001   |
| Category string is empty                         | Badge shows "—" with neutral gray coloring          | FR-BADGE-002                |
| All assignees are null                           | Top Assignees KPI shows "No assignees"              | FR-KPI-004                  |
| Sorting + Grouping combined                      | Sort applies within each group                      | FR-TABLE-002, FR-GROUP-001  |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 14
- **Parallelizable:** 10 (71%)
- **Execution Waves:** 4

---

### Execution Waves

#### Wave 1 — Foundation (Hooks, Utilities, Types)

**Execution:** PARALLEL

| Task ID | Type      | Title                               | Files                                             | Depends On | Complexity |
| ------- | --------- | ----------------------------------- | ------------------------------------------------- | ---------- | ---------- |
| T-001   | IMPLEMENT | useDashboard hook (data loading)    | `src/renderer/src/hooks/useDashboard.ts`          | None       | M          |
| T-002   | IMPLEMENT | Filter/Sort/Group utility functions | `src/renderer/src/lib/dashboard-utils.ts`         | None       | M          |
| T-003   | IMPLEMENT | Badge color utilities               | `src/renderer/src/lib/badge-colors.ts`            | None       | S          |
| T-004   | IMPLEMENT | MultiSelect component               | `src/renderer/src/components/ui/multi-select.tsx` | None       | M          |

#### Wave 2 — Core Components (UI building blocks)

**Execution:** PARALLEL

| Task ID | Type      | Title                              | Files                                                      | Depends On   | Complexity |
| ------- | --------- | ---------------------------------- | ---------------------------------------------------------- | ------------ | ---------- |
| T-005   | IMPLEMENT | KPI Cards component                | `src/renderer/src/components/dashboard/KpiCards.tsx`       | T-002        | S          |
| T-006   | IMPLEMENT | Filter Bar component               | `src/renderer/src/components/dashboard/FilterBar.tsx`      | T-002, T-004 | M          |
| T-007   | IMPLEMENT | Bug Table component (with sorting) | `src/renderer/src/components/dashboard/BugTable.tsx`       | T-002, T-003 | M          |
| T-008   | IMPLEMENT | Bug Card component                 | `src/renderer/src/components/dashboard/BugCard.tsx`        | T-003        | S          |
| T-009   | IMPLEMENT | Group Accordion component          | `src/renderer/src/components/dashboard/GroupAccordion.tsx` | T-003        | M          |

#### Wave 3 — Page Assembly

**Execution:** SEQUENTIAL

| Task ID | Type      | Title                                    | Files                                                       | Depends On         | Complexity |
| ------- | --------- | ---------------------------------------- | ----------------------------------------------------------- | ------------------ | ---------- |
| T-010   | IMPLEMENT | DashboardHeader (title + action buttons) | `src/renderer/src/components/dashboard/DashboardHeader.tsx` | T-001              | S          |
| T-011   | INTEGRATE | DashboardPage full assembly              | `src/renderer/src/pages/DashboardPage.tsx`                  | T-001, T-005–T-010 | L          |

#### Wave 4 — Testing

**Execution:** PARALLEL

| Task ID | Type | Title                                             | Files                                         | Depends On  | Complexity |
| ------- | ---- | ------------------------------------------------- | --------------------------------------------- | ----------- | ---------- |
| T-012   | TEST | Unit tests: dashboard-utils (filter, sort, group) | `tests/renderer/dashboard-utils.spec.ts`      | T-002       | M          |
| T-013   | TEST | Unit tests: useDashboard hook                     | `tests/renderer/useDashboard.spec.ts`         | T-001       | M          |
| T-014   | TEST | Component tests: FilterBar, KpiCards, BugTable    | `tests/renderer/DashboardComponents.spec.tsx` | T-005–T-009 | M          |

---

### Critical Path

T-002 → T-006 → T-011 (critical path: 3 tasks — utilities are needed by FilterBar, FilterBar is needed by page assembly)

---

### Task Details

#### T-001: useDashboard Hook (Data Loading)

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Create `useDashboard.ts` hook
  2. On mount: call `window.electronAPI.getSession()`, set `bugs: CategorizedBug[]` state
  3. Expose `fetchBugs()` — calls IPC, then reloads session
  4. Expose `categorizeBugs()` — calls IPC, subscribes to progress, reloads session on complete
  5. Expose `loading`, `progress` (ChunkProgress | null), `bugs`, `sessionInfo` (fetchedAt, categorizedAt)
  6. Cleanup: unsubscribe from progress listener on unmount
- **Acceptance Criteria:** Hook loads session data on mount; fetchBugs/categorizeBugs trigger IPC and refresh state.
- **Testing Approach:** Post-implementation (T-013)
- **Output:** `src/renderer/src/hooks/useDashboard.ts`

#### T-002: Filter/Sort/Group Utility Functions

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Create `dashboard-utils.ts` with pure functions:
     - `filterBugs(bugs, filters)` — applies all filter criteria (AND logic, OR within multi-selects)
     - `sortBugs(bugs, sortKey, sortDir)` — generic column sorting
     - `groupBugs(bugs, groupBy)` — returns `Map<string, CategorizedBug[]>`
     - `computeKpis(bugs)` — returns `{ total, active, macroCategories, topAssignees }`
     - `getUniqueValues(bugs, field)` — extracts unique values for filter options
     - `getSubCategoriesForMacros(bugs, selectedMacros)` — dependent sub-cat options
  2. All pure functions; no side effects; typed interfaces for filter state
  3. Define `FilterState` interface: `{ statuses: string[]; assignees: string[]; macroCategories: string[]; subCategories: string[]; searchText: string }`
  4. Define `SortState` interface: `{ key: keyof CategorizedBug | null; direction: 'asc' | 'desc' }`
  5. Define `GroupBy` type: `'none' | 'macroCategory' | 'subCategory' | 'assignee'`
  6. Default `SortState`: `{ key: 'priority', direction: 'asc' }`
- **Acceptance Criteria:** All functions return correct results for given inputs. Type-safe. Performant on 200 items.
- **Testing Approach:** TDD-friendly pure functions (T-012)
- **Output:** `src/renderer/src/lib/dashboard-utils.ts`

#### T-003: Badge Color Utilities

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Create `badge-colors.ts`:
     - `getStatusBadgeClasses(state: string)` → returns Tailwind classes: Active=red-100/red-700, Resolved=green-100/green-700, Closed=gray-100/gray-700, default=blue-100/blue-700
     - `getCategoryColor(category: string)` → deterministic hash of string → maps to palette of 12 distinct bg/text class pairs (soft pastel bgs)
     - `getSubCategoryBgTint(subCategory: string)` → returns a subtle background class for card clustering
  2. Hash function: simple char-code sum mod palette length
- **Acceptance Criteria:** Same input always produces same color; all states mapped correctly.
- **Testing Approach:** Post-implementation (covered in T-012)
- **Output:** `src/renderer/src/lib/badge-colors.ts`

#### T-004: MultiSelect Component

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Create `multi-select.tsx` — custom dropdown component (no external deps)
  2. Props: `options: string[]`, `selected: string[]`, `onChange: (selected: string[]) => void`, `placeholder: string`, `searchable?: boolean`
  3. UI: button trigger showing count of selected, dropdown panel with checkboxes, optional search input at top
  4. Styling: matches existing select.tsx patterns (border-gray-300, bg-gray-50, rounded-md, text-sm)
  5. Click outside closes dropdown. Keyboard: Escape closes.
  6. Render a portal or absolute-positioned dropdown to avoid overflow clipping
- **Acceptance Criteria:** Can select/deselect multiple options; searchable variant filters options; visual consistency with design.
- **Testing Approach:** Post-implementation (T-014)
- **Output:** `src/renderer/src/components/ui/multi-select.tsx`

#### T-005: KPI Cards Component

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `KpiCards.tsx` — receives `kpis` object from parent (computed via `computeKpis`)
  2. 4-column grid: Total Bugs, Open/Active, Macro-Categories count, Top Assignees
  3. Styling: white bg, p-4, rounded-lg, border border-gray-200, shadow-sm
  4. Dynamic values: text-2xl font-bold; Active count in red-600; Categories in purple-600
  5. Top assignees: show up to 3 names with counts; fallback "No assignees" if all null
- **Acceptance Criteria:** KPIs reflect filtered data; correct colors per design.html.
- **Testing Approach:** Post-implementation (T-014)
- **Output:** `src/renderer/src/components/dashboard/KpiCards.tsx`

#### T-006: Filter Bar Component

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `FilterBar.tsx` — receives `filterState`, `onFilterChange`, `filterOptions`, `groupBy`, `onGroupByChange`, `onReset`, `onCollapseAll`
  2. Layout: white bg, p-3, rounded-lg, border, shadow-sm, flex gap-3 items-center
  3. Elements: search input with icon (pl-9), MultiSelect for status, MultiSelect for assignee (searchable), MultiSelect for macro-cat, MultiSelect for sub-cat, select for groupBy, Reset button, Collapse-All button
  4. Search input: controlled value with debounce (200ms via useRef/setTimeout pattern)
  5. Sub-category options update when macro-category selection changes (passed from parent)
- **Acceptance Criteria:** All filters render and emit changes; debounce works; sub-cat depends on macro-cat.
- **Testing Approach:** Post-implementation (T-014)
- **Output:** `src/renderer/src/components/dashboard/FilterBar.tsx`

#### T-007: Bug Table Component

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `BugTable.tsx` — receives `bugs: CategorizedBug[]`, `sortState`, `onSort`
  2. Native HTML `<table>` with semantic `<thead>/<tbody>`
  3. Headers clickable for sorting — show sort direction indicator (chevron-up/down from lucide)
  4. Columns: ID (blue-600, font-medium), Titolo (truncate max-w-xs), Priorità (numeric), Stato (badge), Assegnatario, Area Path, Macro-cat (badge), Sotto-cat (badge)
  5. Row: hover:bg-blue-50, cursor-pointer, transition
  6. Use `getStatusBadgeClasses` and `getCategoryColor` for badges
  7. Null assignee → "Unassigned" in italic gray-400
- **Acceptance Criteria:** All columns rendered; sort indicators change on click; row hover works.
- **Testing Approach:** Post-implementation (T-014)
- **Output:** `src/renderer/src/components/dashboard/BugTable.tsx`

#### T-008: Bug Card Component

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `BugCard.tsx` — renders a single bug as a card
  2. White bg, rounded-lg, border, p-4, shadow-sm
  3. Shows: ID badge (blue-600), title (full text), status badge, macro+sub category badges, assignee, area path
  4. Background tint based on subCategory (via `getSubCategoryBgTint`)
  5. Responsive layout: title prominent, metadata in a flex-wrap row below
- **Acceptance Criteria:** Card shows all bug fields; sub-category clustering visible via background.
- **Testing Approach:** Post-implementation (visual)
- **Output:** `src/renderer/src/components/dashboard/BugCard.tsx`

#### T-009: Group Accordion Component

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `GroupAccordion.tsx` — receives `groupName`, `bugCount`, `isExpanded`, `onToggle`, `children`
  2. Expanded state: indigo-50/50 bg header, chevron-up, full opacity content
  3. Collapsed state: gray-50 bg header, chevron-down, opacity-75 on container, hover:opacity-100
  4. Header: colored icon square (w-8 h-8 rounded, indigo-100/indigo-600), group name (uppercase tracking-wide text-sm font-bold), count badge (rounded-full, text-[10px] font-bold)
  5. Icon for group: use a generic icon (Layers from lucide) or map first-letter to a lucide icon
  6. Content area: renders children (table rows or cards)
- **Acceptance Criteria:** Accordion toggles expand/collapse; styling matches design.html groups.
- **Testing Approach:** Post-implementation (visual)
- **Output:** `src/renderer/src/components/dashboard/GroupAccordion.tsx`

#### T-010: DashboardHeader Component

- **Type:** IMPLEMENT
- **Wave:** 3 — SEQUENTIAL
- **Implementation Notes:**
  1. Create `DashboardHeader.tsx` — title, subtitle, action buttons
  2. Layout: flex justify-between items-end mb-6
  3. Left: "Bug Triage" h1 (text-2xl font-bold text-gray-900), subtitle with session info (text-sm text-gray-500)
  4. Right: Fetch Bugs button (white, outlined, shadow-sm) and Categorize button (gradient indigo-to-purple)
  5. Props: `onFetch`, `onCategorize`, `loading`, `sessionInfo`
  6. Loading state: disable buttons, show spinner
- **Acceptance Criteria:** Buttons trigger callbacks; loading state disables interactions; matches design.html header.
- **Testing Approach:** Post-implementation
- **Output:** `src/renderer/src/components/dashboard/DashboardHeader.tsx`

#### T-011: DashboardPage Full Assembly

- **Type:** INTEGRATE
- **Wave:** 3 — SEQUENTIAL
- **Implementation Notes:**
  1. Rewrite `DashboardPage.tsx` as the orchestrating page component
  2. Use `useDashboard` hook for data/actions
  3. Local state: `filterState`, `sortState`, `groupBy`, `viewMode` ('table' | 'card'), `expandedGroups: Set<string>`
  4. Computed values (useMemo):
     - `filteredBugs` = filterBugs(bugs, filterState)
     - `sortedBugs` = sortBugs(filteredBugs, sortState.key, sortState.direction)
     - `kpis` = computeKpis(filteredBugs)
     - `groupedBugs` = groupBugs(sortedBugs, groupBy) (only when groupBy !== 'none')
     - `filterOptions` = { statuses, assignees, macroCategories, subCategories } derived from ALL bugs (not filtered)
  5. Layout assembly order: DashboardHeader → ViewTabs → KpiCards → FilterBar → BugList (grouped or flat, table or card)
  6. ViewTabs: "Lista Completa" / "AI Clusters" style tabs (use existing design.html pattern with border-b)
  7. When groupBy !== 'none': render GroupAccordion per group, each containing BugTable or BugCard list
  8. When groupBy === 'none': render BugTable or card list directly
  9. Empty filtered state: centered message "Nessun bug corrisponde ai filtri"
  10. Collapse-all / expand-all toggles the `expandedGroups` set
- **Acceptance Criteria:** Full dashboard renders with all sub-components wired. Filters update KPIs and list. Sorting works within groups. View toggle preserves filter state.
- **Testing Approach:** Post-implementation (T-014 partial)
- **Output:** `src/renderer/src/pages/DashboardPage.tsx`

#### T-012: Unit Tests — dashboard-utils

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Test `filterBugs`: single filter, combined filters, empty filters (returns all), all-filtered-out
  2. Test `sortBugs`: asc/desc, null key (no sort), null values handled
  3. Test `groupBugs`: each groupBy option, empty dataset, null assignee group
  4. Test `computeKpis`: standard case, empty dataset, all-null assignees
  5. Test `getSubCategoriesForMacros`: with selection, without selection
  6. Test `getCategoryColor`: determinism (same input → same output)
- **Acceptance Criteria:** All functions have >90% branch coverage.
- **Testing Approach:** Vitest with mock data fixtures
- **Output:** `tests/renderer/dashboard-utils.spec.ts`

#### T-013: Unit Tests — useDashboard Hook

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Mock `window.electronAPI` (getSession, fetchBugs, categorizeBugs, onCategorizeProgress)
  2. Test: initial load populates bugs from session
  3. Test: fetchBugs calls IPC and reloads
  4. Test: categorizeBugs subscribes to progress and reloads on complete
  5. Test: null session → empty bugs array
  6. Test: cleanup unsubscribes progress listener
- **Acceptance Criteria:** Hook behavior verified for all branches.
- **Testing Approach:** @testing-library/react renderHook + vi.fn mocks
- **Output:** `tests/renderer/useDashboard.spec.ts`

#### T-014: Component Tests — Dashboard Components

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Test FilterBar: renders all filter controls, search debounce fires, reset clears all
  2. Test KpiCards: renders correct numbers, handles empty data
  3. Test BugTable: renders columns, click header triggers sort callback, badges render correct classes
  4. Test MultiSelect: opens/closes, selects items, search filters options
- **Acceptance Criteria:** Components render correctly with given props; interactions emit correct callbacks.
- **Testing Approach:** @testing-library/react + vitest
- **Output:** `tests/renderer/DashboardComponents.spec.tsx`

---

### Risk Register

| Risk                                                        | Impact | Likelihood | Mitigation                                                                            |
| ----------------------------------------------------------- | ------ | ---------- | ------------------------------------------------------------------------------------- |
| MultiSelect dropdown clipped by parent overflow             | High   | Medium     | Use absolute positioning with z-50; test in actual Electron window                    |
| Filter performance on large datasets (>200 bugs)            | Medium | Low        | useMemo with stable deps; measure with 500-bug fixture in test                        |
| Sub-category dependent filter loses state on macro deselect | Medium | Medium     | Clear sub-category selection when macro-category changes incompatibly                 |
| Design drift from design.html                               | Medium | Medium     | Reference exact Tailwind classes from design.html; pixel-compare during dev           |
| HTML in description field breaks text search                | Low    | Medium     | Search against raw text (description field already plain text per FT-03 html-to-text) |

---

### Completeness Assessment

- Functional coverage: **High** — all PRD scope items and acceptance criteria mapped to requirements
- Non-functional coverage: **High** — performance, accessibility, maintainability addressed
- Task-to-requirement mapping: **Complete** — every FR maps to at least one task; every task traces back to requirements

### Status

**READY FOR APPROVAL**
