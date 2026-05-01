## Spec-Planner — Iteration 1

### Feature Context

- **Feature:** Pannello Dettaglio Bug (Drawer)
- **Feature #:** feature-6
- **Feature Type:** frontend (with minimal IPC addition)

---

## Part 1: Requirements

### Functional Requirements

#### Drawer Opening & Display

- **FR-DRW-001:** Open Drawer on Bug Click
  - Description: Clicking a bug row in `BugTable` or a `BugCard` opens a side drawer showing the full bug details.
  - Acceptance Criteria: Given the dashboard is displayed, When the user clicks a bug row or card, Then a drawer panel slides in from the right showing that bug's information.
  - Priority: Must-Have

- **FR-DRW-002:** Drawer Layout & Structure
  - Description: The drawer is a fixed right panel (~400px) with header (ID, title, status badge), body (LLM categorization card, ADO metadata grid, full description), and footer ("View in Azure DevOps" button).
  - Acceptance Criteria: Given the drawer is open, Then it renders all sections matching design.html with correct spacing, colors, and hierarchy.
  - Priority: Must-Have

- **FR-DRW-003:** Main Content Offset
  - Description: When the drawer is open, the main content area shifts left (adds `pr-[400px]`) so it doesn't overlap with the drawer.
  - Acceptance Criteria: Given the drawer is open, Then the dashboard content is padded on the right by 400px. When closed, the padding is removed.
  - Priority: Must-Have

#### Bug Detail Content

- **FR-DTL-001:** Header Section
  - Description: The drawer header shows bug ID (blue, prefixed with #), status badge (colored per state), and the full title.
  - Acceptance Criteria: Given a bug is selected, Then the header shows `#{id}`, the state in a colored badge, and the title text.
  - Priority: Must-Have

- **FR-DTL-002:** LLM Categorization Card
  - Description: A highlighted card (`bg-purple-50 border-purple-200`) showing macro-category badge, sub-category badge, and the full reasoning text.
  - Acceptance Criteria: Given a categorized bug, Then the card shows macro-category, sub-category, and reasoning. Given a non-categorized bug, Then the card shows an explicit "Non ancora categorizzato" message.
  - Priority: Must-Have

- **FR-DTL-003:** Azure DevOps Metadata Grid
  - Description: A grid showing: assignee, area path, priority, created date, updated date, tags.
  - Acceptance Criteria: Given a bug, Then all metadata fields are displayed in a readable grid. Null assignee shows "Non assegnato". Empty tags shows "—".
  - Priority: Must-Have

- **FR-DTL-004:** Full Description
  - Description: The bug description (already converted from HTML to text) is displayed in a scrollable `prose prose-sm` box preserving paragraphs.
  - Acceptance Criteria: Given a bug with description text, Then the description is fully rendered with paragraph preservation. Given an empty description, Then "Nessuna descrizione disponibile" is shown.
  - Priority: Must-Have

#### Navigation

- **FR-NAV-001:** Previous/Next Navigation
  - Description: Arrow buttons (prev/next) in the drawer header allow navigating between bugs in the current filtered list without closing the drawer.
  - Acceptance Criteria: Given the drawer is open on bug at index N in the filtered list, When prev is clicked, Then bug at index N-1 is shown. When next is clicked, Then bug at index N+1 is shown. At boundaries, the respective button is disabled.
  - Priority: Must-Have

- **FR-NAV-002:** Navigation Respects Active Filters
  - Description: Prev/next navigate through the filtered+sorted bug list as currently displayed in the table/cards, not the entire dataset.
  - Acceptance Criteria: Given filters reduce 100 bugs to 20, Then prev/next cycles through those 20 only.
  - Priority: Must-Have

#### External Actions

- **FR-EXT-001:** View in Azure DevOps
  - Description: A button in the drawer footer opens the bug in the system browser via `shell.openExternal()`.
  - Acceptance Criteria: Given a bug with ID X, settings with orgUrl and projectName, When "View in Azure DevOps" is clicked, Then the URL `{orgUrl}/{projectName}/_workitems/edit/{id}` opens in the default system browser.
  - Priority: Must-Have

#### Closing

- **FR-CLS-001:** Close on Escape Key
  - Description: Pressing Escape closes the drawer.
  - Acceptance Criteria: Given the drawer is open, When Esc is pressed, Then the drawer closes.
  - Priority: Must-Have

- **FR-CLS-002:** Close on Click Outside
  - Description: Clicking outside the drawer (on the main content area) closes it.
  - Acceptance Criteria: Given the drawer is open, When the user clicks outside the drawer, Then it closes.
  - Priority: Must-Have

- **FR-CLS-003:** Close Button
  - Description: An X button in the drawer header closes the drawer.
  - Acceptance Criteria: Given the drawer is open, When the X button is clicked, Then the drawer closes.
  - Priority: Must-Have

### Non-Functional Requirements

- **NFR-PERF-001:** Drawer opens within 100ms (no perceptible lag, no network calls).
- **NFR-A11Y-001:** Drawer is focusable, Esc closes it, close button has aria-label, nav buttons have aria-labels and disabled state.
- **NFR-A11Y-002:** Focus is trapped within the drawer while open (or at minimum, focus moves to the drawer on open and returns to the triggering element on close).
- **NFR-SEC-001:** The "open external URL" action goes through IPC to main process via `shell.openExternal()`. The renderer never opens URLs directly. The main process validates the URL scheme (only https).
- **NFR-UX-001:** Smooth transition animation (slide-in from right, 200-300ms).

### Constraints

- Must use existing Tailwind classes and `cn()` utility from `@renderer/lib/utils`.
- Must use `lucide-react` for icons (X, ChevronLeft, ChevronRight, Bot, ExternalLink).
- IPC pattern must match existing conventions in `ipc-channels.ts`, `preload/index.ts`, `ipc-handlers.ts`.
- No new npm dependencies.
- `CategorizedBug` type already has all needed fields — no type changes required.

### Assumptions

- The description field in `CategorizedBug` is already plain text (HTML-to-text conversion happens at fetch time in the main process).
- `orgUrl` does not have a trailing slash.
- The filtered bug list (`sortedBugs`) in DashboardPage is the correct navigation set.
- Grouped view navigation: in grouped mode, navigation goes through all visible bugs across groups (flattened).

### Out of Scope

- Editing bug fields from the drawer.
- Adding comments or work items.
- Deep-linking / URL routing to a specific bug.
- Keyboard shortcuts beyond Escape for drawer interaction.
- Drag-to-resize drawer width.

### Edge Cases

| Scenario                                                  | Expected Behavior                                                                                 | Related Requirement |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------- |
| Bug with empty description                                | Shows "Nessuna descrizione disponibile" in gray italic                                            | FR-DTL-004          |
| Bug not yet categorized (macroCategory/subCategory empty) | LLM card shows "Non ancora categorizzato" message                                                 | FR-DTL-002          |
| Bug with very long title                                  | Title wraps in header, doesn't overflow                                                           | FR-DTL-001          |
| Bug with very long categoryReason                         | Reasoning text scrolls within the LLM card                                                        | FR-DTL-002          |
| Single bug in filtered list                               | Both prev and next buttons are disabled                                                           | FR-NAV-001          |
| First bug selected                                        | Prev button disabled                                                                              | FR-NAV-001          |
| Last bug selected                                         | Next button disabled                                                                              | FR-NAV-001          |
| Null assignee                                             | Shows "Non assegnato" in italic gray                                                              | FR-DTL-003          |
| Empty tags array                                          | Shows "—"                                                                                         | FR-DTL-003          |
| Filter changes while drawer is open                       | If the selected bug is still in the new filtered set, keep it selected. If not, close the drawer. | FR-NAV-002          |
| orgUrl or projectName missing in settings                 | "View in Azure DevOps" button is disabled with tooltip explaining why                             | FR-EXT-001          |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 8
- **Parallelizable:** 5 (62%)
- **Execution Waves:** 4

### Execution Waves

#### Wave 1 — IPC Infrastructure (Backend)

**Execution:** SEQUENTIAL (single task)

| Task ID | Type      | Title                          | Description                                                                     | Files   | Depends On | Complexity |
| ------- | --------- | ------------------------------ | ------------------------------------------------------------------------------- | ------- | ---------- | ---------- |
| T-001   | IMPLEMENT | Add `openExternal` IPC channel | Add IPC channel, handler, and preload bridge for opening URLs in system browser | 3 files | None       | S          |

#### Wave 2 — Core Component

**Execution:** PARALLEL

| Task ID | Type      | Title                            | Description                                                           | Files  | Depends On | Complexity |
| ------- | --------- | -------------------------------- | --------------------------------------------------------------------- | ------ | ---------- | ---------- |
| T-002   | IMPLEMENT | Create BugDetailDrawer component | Full drawer component with header, body sections, footer              | 1 file | None       | L          |
| T-003   | IMPLEMENT | Create useBugDrawer hook         | State management hook for drawer open/close, selected bug, navigation | 1 file | None       | M          |

#### Wave 3 — Integration

**Execution:** PARALLEL

| Task ID | Type      | Title                               | Description                                                                           | Files  | Depends On   | Complexity |
| ------- | --------- | ----------------------------------- | ------------------------------------------------------------------------------------- | ------ | ------------ | ---------- |
| T-004   | IMPLEMENT | Integrate drawer into DashboardPage | Wire up useBugDrawer, pass onBugClick to BugTable/BugCard, render drawer, add padding | 1 file | T-002, T-003 | M          |
| T-005   | IMPLEMENT | Wire openExternal in drawer         | Connect "View in Azure DevOps" button to IPC openExternal via useSettings for orgUrl  | 1 file | T-001, T-002 | S          |

#### Wave 4 — Testing

**Execution:** PARALLEL

| Task ID | Type | Title                          | Description                                                                            | Files  | Depends On | Complexity |
| ------- | ---- | ------------------------------ | -------------------------------------------------------------------------------------- | ------ | ---------- | ---------- |
| T-006   | TEST | Test BugDetailDrawer component | Render tests for all states: categorized, uncategorized, empty description, navigation | 1 file | T-002      | M          |
| T-007   | TEST | Test useBugDrawer hook         | Unit tests for navigation, open/close, filter-change behavior                          | 1 file | T-003      | M          |
| T-008   | TEST | Test openExternal IPC handler  | Unit test for URL validation and shell.openExternal call                               | 1 file | T-001      | S          |

### Critical Path

T-002 → T-004 (critical path: 2 tasks, Wave 2–3 for UI visible result)

### Task Details

#### T-001: Add `openExternal` IPC channel

- **Type:** IMPLEMENT
- **Wave:** 1 — SEQUENTIAL
- **Implementation Notes:**
  1. Add `OPEN_EXTERNAL: 'shell:open-external'` to `IPC_CHANNELS` in `src/shared/ipc-channels.ts`
  2. In `src/main/ipc-handlers.ts`, add handler that receives a URL string, validates it starts with `https://`, then calls `shell.openExternal(url)` from Electron
  3. In `src/preload/index.ts`, expose `openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, url)` in the electronAPI
  4. Update `ElectronAPI` type export
- **Acceptance Criteria:** Calling `window.electronAPI.openExternal('https://...')` opens the URL in the system browser. Non-https URLs are rejected.
- **Testing Approach:** Post-implementation unit test (T-008)
- **Output:** Modified `ipc-channels.ts`, `ipc-handlers.ts`, `preload/index.ts`

#### T-002: Create BugDetailDrawer component

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `src/renderer/src/components/dashboard/BugDetailDrawer.tsx`
  2. Props: `bug: CategorizedBug | null`, `isOpen: boolean`, `onClose: () => void`, `onPrev: () => void`, `onNext: () => void`, `hasPrev: boolean`, `hasNext: boolean`, `onViewInAdo: () => void`, `adoLinkEnabled: boolean`
  3. Structure:
     - Outer container: fixed right panel, 400px, z-20, conditional render/animation
     - Header: bug ID (blue), status badge, title, close (X) button, prev/next arrows
     - Body:
       - LLM card: `bg-purple-50 border-purple-200 rounded-lg p-4 mb-6` with Bot icon
       - Metadata grid: 2-column grid for assignee, area path, priority, dates, tags
       - Description: `prose prose-sm` box with overflow-y-auto
     - Footer: "View in Azure DevOps" button with ExternalLink icon
  4. Handle uncategorized state: if `macroCategory` is empty, show "Non ancora categorizzato"
  5. Handle empty description
  6. Escape key listener (useEffect with keydown)
  7. Click-outside: onClick on backdrop/overlay or use ref-based detection
- **Acceptance Criteria:** Component renders all bug fields correctly in all states. Escape and close button trigger `onClose`. Prev/next buttons call respective handlers and respect disabled states.
- **Testing Approach:** Post-implementation (T-006)
- **Output:** `src/renderer/src/components/dashboard/BugDetailDrawer.tsx`

#### T-003: Create useBugDrawer hook

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `src/renderer/src/hooks/useBugDrawer.ts`
  2. State: `selectedBug: CategorizedBug | null`, `isOpen: boolean`
  3. Accepts `bugList: CategorizedBug[]` (the current filtered+sorted list)
  4. Computed: `currentIndex` (index of selectedBug in bugList by ID), `hasPrev`, `hasNext`
  5. Actions: `openDrawer(bug)`, `closeDrawer()`, `goToPrev()`, `goToNext()`
  6. Effect: if `bugList` changes and `selectedBug` is no longer in the list, close the drawer
  7. Returns: `{ isOpen, selectedBug, hasPrev, hasNext, openDrawer, closeDrawer, goToPrev, goToNext }`
- **Acceptance Criteria:** Navigation works correctly within the provided list. Drawer auto-closes when selected bug leaves filtered set.
- **Testing Approach:** Post-implementation (T-007)
- **Output:** `src/renderer/src/hooks/useBugDrawer.ts`

#### T-004: Integrate drawer into DashboardPage

- **Type:** INTEGRATE
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Import `BugDetailDrawer` and `useBugDrawer` in `DashboardPage.tsx`
  2. Call `useBugDrawer(sortedBugs)` — pass the filtered+sorted list
  3. Pass `openDrawer` as `onBugClick` to `BugTable` and `onClick` to `BugCard`
  4. Render `<BugDetailDrawer>` at the end of the page
  5. Add conditional `pr-[400px]` to the main container div when `isOpen`
  6. Construct ADO URL from settings: need to access settings (use `useSettings` or fetch from electronAPI)
  7. Pass `onViewInAdo` callback that calls `window.electronAPI.openExternal(adoUrl)`
- **Acceptance Criteria:** Clicking a bug opens the drawer. Navigation works. Content shifts. "View in Azure DevOps" opens correct URL.
- **Testing Approach:** Manual verification + existing integration
- **Output:** Modified `src/renderer/src/pages/DashboardPage.tsx`

#### T-005: Wire openExternal in drawer

- **Type:** INTEGRATE
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. In the DashboardPage integration (T-004), construct URL: `${orgUrl}/${projectName}/_workitems/edit/${bug.id}`
  2. The `onViewInAdo` handler calls `window.electronAPI.openExternal(url)`
  3. Disable the button if `orgUrl` or `projectName` is empty/missing
  4. Note: This task is folded into T-004 implementation since it's minimal wiring, but listed separately for traceability
- **Acceptance Criteria:** Button opens correct URL. Button disabled when settings incomplete.
- **Testing Approach:** Manual + IPC unit test (T-008)
- **Output:** Part of `DashboardPage.tsx` modifications

#### T-006: Test BugDetailDrawer component

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Create `tests/renderer/BugDetailDrawer.spec.tsx`
  2. Test cases:
     - Renders all fields for a categorized bug
     - Shows "Non ancora categorizzato" for uncategorized bug
     - Shows "Nessuna descrizione disponibile" for empty description
     - Calls onClose when X clicked
     - Calls onClose when Escape pressed
     - Calls onPrev/onNext when arrows clicked
     - Prev disabled when hasPrev=false
     - Next disabled when hasNext=false
     - Renders tags correctly (multiple and empty)
     - "View in Azure DevOps" button disabled when adoLinkEnabled=false
- **Acceptance Criteria:** All tests pass, covering main states and interactions.
- **Testing Approach:** React Testing Library + Vitest
- **Output:** `tests/renderer/BugDetailDrawer.spec.tsx`

#### T-007: Test useBugDrawer hook

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Create `tests/renderer/useBugDrawer.spec.ts`
  2. Test cases:
     - Initially closed
     - Opens with correct bug
     - Closes correctly
     - Navigation: goToNext advances index
     - Navigation: goToPrev decreases index
     - hasPrev=false at index 0
     - hasNext=false at last index
     - Closes when selected bug removed from list
     - Handles single-bug list (both nav disabled)
- **Acceptance Criteria:** All hook state transitions tested and passing.
- **Testing Approach:** @testing-library/react-hooks (renderHook) + Vitest
- **Output:** `tests/renderer/useBugDrawer.spec.ts`

#### T-008: Test openExternal IPC handler

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Create `tests/main/open-external.spec.ts`
  2. Mock `electron.shell.openExternal`
  3. Test cases:
     - Valid https URL calls shell.openExternal
     - Non-https URL (http, javascript, file) is rejected/throws
     - Empty URL is rejected
- **Acceptance Criteria:** Security validation works. Only https URLs pass through.
- **Testing Approach:** Vitest + mocked Electron shell
- **Output:** `tests/main/open-external.spec.ts`

### Risk Register

| Risk                                                                   | Impact | Likelihood | Mitigation                                                                                                                  |
| ---------------------------------------------------------------------- | ------ | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| Click-outside detection interferes with table/card clicks              | Medium | Low        | Use ref-based detection, don't use full-page overlay that blocks interaction                                                |
| Focus management with drawer open causes keyboard accessibility issues | Medium | Medium     | Test with keyboard-only navigation; ensure Escape always works                                                              |
| Filter change while drawer open causes stale display                   | Low    | Medium     | useBugDrawer auto-closes if selected bug leaves filtered list                                                               |
| Long descriptions cause layout overflow                                | Low    | Low        | Use overflow-y-auto with max-height on description section                                                                  |
| Settings not loaded when "View in ADO" clicked                         | Low    | Low        | Fetch settings eagerly or pass orgUrl/projectName from DashboardPage (already available via useDashboard or separate fetch) |

---

### Completeness Assessment

- Functional coverage: **High** — All acceptance criteria mapped to requirements and tasks
- Non-functional coverage: **High** — Accessibility, security, performance addressed
- Task-to-requirement mapping: **Complete** — Every FR maps to at least one task

### Status

**READY FOR APPROVAL**
