# Spec-Planner — Iteration 1

## Feature Context

- **Feature:** Incremental Session Cache & Selective Re-Categorization
- **Feature #:** feature-12
- **Feature Type:** full-stack

---

## Part 1: Requirements

### Functional Requirements

#### Persistence & Data Model

- **FR-DATA-001:** Session must distinguish open snapshot vs full historical catalog
  - Description: Introduce a `BugCatalog` persisted alongside session. The **session** holds the current open snapshot (fetched bugs + categorization + similarity). The **catalog** holds every bug ever seen, with lifecycle and categorization metadata. Both are stored in `electron-store` as separate top-level keys (`session`, `bugCatalog`).
  - Acceptance Criteria:
    - Given a fresh install, When the store is initialized, Then `bugCatalog` defaults to `null` (or empty object).
    - Given a populated store, When `session` is read, Then it only contains open bugs from the latest fetch.
    - Given a populated store, When `bugCatalog` is read, Then it contains all ever-seen bugs with lifecycle metadata.
  - Priority: Must-Have

- **FR-DATA-002:** Each bug in catalog must have lifecycle metadata
  - Description: Every `CatalogBug` entry includes `firstSeenAt` (ISO string, first appearance in any fetch), `lastSeenAt` (ISO string, most recent fetch that included it), and `closedAt` (ISO string | null, set when the bug disappears from a fetch).
  - Acceptance Criteria:
    - Given a brand-new bug in a fetch, When it is merged into the catalog, Then `firstSeenAt` = `lastSeenAt` = now, `closedAt` = null.
    - Given a known open bug re-fetched, When merged, Then `lastSeenAt` = now, `firstSeenAt` unchanged.
    - Given a catalog bug absent from the latest fetch, When merged, Then `closedAt` = now (if not already set).
  - Priority: Must-Have

- **FR-DATA-003:** Each bug must have a categorization input signature
  - Description: A deterministic hash/signature computed from the normalized set of fields relevant to categorization (`title`, `description`, `tags`, `priority`, `areaPath`). Stored as `inputSignature` on each `CatalogBug`. Used to detect whether a bug needs re-categorization after a new fetch.
  - Acceptance Criteria:
    - Given two identical bugs, When signatures are computed, Then they are equal.
    - Given a bug where `title` changed, When signature is recomputed, Then it differs from the previous one.
    - Given a bug where only `assignee` changed (not a categorization input), When signature is recomputed, Then it remains equal.
  - Priority: Must-Have

- **FR-DATA-004:** Each catalog bug must carry minimal similarity history metadata
  - Description: `CatalogBug` includes `everInSimilarityGroup: boolean` (default `false`) and `lastSimilarityGroupAt: string | null` (default `null`). Updated when the bug appears in any similarity group result.
  - Acceptance Criteria:
    - Given a newly cataloged bug, Then `everInSimilarityGroup` = false, `lastSimilarityGroupAt` = null.
    - Given a bug that appears in a similarity group, When results are persisted, Then `everInSimilarityGroup` = true, `lastSimilarityGroupAt` = analyzedAt timestamp.
  - Priority: Must-Have

#### Fetch & Incremental Merge

- **FR-FETCH-001:** Compare fetched bugs with persisted catalog by `id`
  - Description: On `ado:fetch-bugs`, after receiving bugs from ADO, the handler must load the existing `bugCatalog` and compare by bug `id` to classify each bug as **new**, **known-unchanged**, **known-changed**, or **absent** (previously known but not in this fetch).
  - Acceptance Criteria:
    - Given an empty catalog and 10 fetched bugs, Then all 10 are classified as **new**.
    - Given a catalog with bugs [1,2,3] and a fetch returning [2,3,4], Then bug 2,3 are checked for changes, bug 4 is new, bug 1 is absent.
  - Priority: Must-Have

- **FR-FETCH-002:** Reuse categorization for known + present + unchanged bugs
  - Description: If a fetched bug matches a catalog entry by `id` and the computed `inputSignature` equals the persisted one, the bug's categorization (`macroCategory`, `subCategory`, `categoryReason`, `categorizedAt`) is carried over from the catalog into the new session snapshot as-is.
  - Acceptance Criteria:
    - Given bug #42 was categorized with signature "abc123", When re-fetched with the same relevant fields, Then the session snapshot contains bug #42 with the original categorization and no LLM call was required for it.
  - Priority: Must-Have

- **FR-FETCH-003:** Mark new/changed bugs for full re-categorization
  - Description: If a fetched bug has no catalog entry, or its computed `inputSignature` differs from the stored one, it is placed in the session snapshot with empty categorization fields (as today), signaling that `llm:categorize` must process it.
  - Acceptance Criteria:
    - Given a new bug #99, When placed in the session, Then `macroCategory = ''`, `subCategory = ''`, `categoryReason = ''`, `categorizedAt = ''`.
    - Given bug #42 with a changed title, When placed in the session, Then its categorization fields are reset.
  - Priority: Must-Have

- **FR-FETCH-004:** Mark absent bugs as closed/done in catalog
  - Description: Any bug in the catalog that was previously open (`closedAt === null`) but is absent from the current fetch gets `closedAt` set to the current timestamp. It remains in the catalog but is NOT placed in the session snapshot.
  - Acceptance Criteria:
    - Given bug #10 in catalog with `closedAt = null`, When a fetch completes without bug #10, Then bug #10 has `closedAt` = now in the catalog.
    - Given bug #10 already has `closedAt` set, When another fetch completes without it, Then `closedAt` remains unchanged.
  - Priority: Must-Have

#### LLM Categorization

- **FR-LLM-001:** Send only new/invalid/changed open bugs to LLM
  - Description: `llm:categorize` filters session bugs to only those where `categorizedAt` is empty (or falsy), which are exactly the new/changed bugs placed by the fetch handler. Only this subset is sent to `categorizeBugs()`.
  - Acceptance Criteria:
    - Given 100 session bugs where 92 have valid `categorizedAt` and 8 don't, When `llm:categorize` runs, Then only 8 bugs are sent to the LLM provider.
  - Priority: Must-Have

- **FR-LLM-002:** Merge LLM results into both session and catalog
  - Description: After LLM returns categorization results, the handler must: (a) update the session snapshot bugs with the new categorization data, and (b) update the matching catalog entries with the same categorization data plus the new `inputSignature`.
  - Acceptance Criteria:
    - Given LLM categorizes bugs [5, 12, 99], When results are merged, Then both `session.bugs` and `bugCatalog` entries for those IDs have updated `macroCategory`, `subCategory`, `categoryReason`, `categorizedAt`, and `inputSignature`.
  - Priority: Must-Have

- **FR-LLM-003:** Update categorizedAt and signature for processed bugs
  - Description: On successful categorization, `categorizedAt` is set to the current ISO timestamp, and `inputSignature` is recomputed and persisted to reflect the inputs that produced the current categorization.
  - Acceptance Criteria:
    - Given bug #5 was categorized at time T, Then `catalogEntry.categorizedAt === T` and `catalogEntry.inputSignature` matches the current inputs.
  - Priority: Must-Have

#### Similarity

- **FR-SIM-001:** `find-similar` uses only open bugs
  - Description: No change in the bug source for similarity — it continues to read from `session.bugs` (which by design only contains open bugs). The similarity service receives only categorized open bugs.
  - Acceptance Criteria:
    - Given session has 50 open bugs and catalog has 20 closed bugs, When `find-similar` runs, Then only the 50 session bugs are considered.
  - Priority: Must-Have

- **FR-SIM-002:** Invalidate similarity when open categorized set changes
  - Description: The existing `isStale` check (`results.analyzedAt < categorizedAt`) is sufficient because `categorizedAt` is updated whenever any bug is re-categorized. No additional invalidation mechanism needed.
  - Acceptance Criteria:
    - Given similarity was analyzed at T1 and a new categorization completes at T2 > T1, Then `isStale` returns true in the renderer.
  - Priority: Must-Have

- **FR-SIM-003:** Update similarity history metadata when bug appears in group
  - Description: After `find-similar` completes and results are persisted, the handler must iterate over all `bugIds` in all `SimilarityGroup`s and update the corresponding catalog entries: `everInSimilarityGroup = true`, `lastSimilarityGroupAt = analyzedAt`.
  - Acceptance Criteria:
    - Given bug #7 appears in a similarity group analyzed at T, Then `bugCatalog[7].everInSimilarityGroup === true` and `bugCatalog[7].lastSimilarityGroupAt === T`.
  - Priority: Must-Have

#### Settings & Cleanup

- **FR-SET-001:** Existing clear session → clears only current snapshot
  - Description: The `session:clear` IPC handler sets `session` to `null` but does NOT touch `bugCatalog`. The existing "Pulisci dati sessione" button in Settings triggers this behavior.
  - Acceptance Criteria:
    - Given a session with 50 bugs and a catalog with 70 entries, When `session:clear` is invoked, Then `session` is null but `bugCatalog` still has 70 entries.
  - Priority: Must-Have

- **FR-SET-002:** New separate action to clear persisted history
  - Description: A new IPC channel `catalog:clear` sets `bugCatalog` to `null`. A new button in Settings ("Cancella storico bug") triggers this through a separate confirmation dialog.
  - Acceptance Criteria:
    - Given a catalog with 70 entries, When `catalog:clear` is invoked, Then `bugCatalog` is null.
    - Given both session and catalog exist, When `catalog:clear` is invoked, Then session is unaffected.
  - Priority: Must-Have

- **FR-SET-003:** Both actions protected by confirmation dialogs
  - Description: Each action has its own `ConfirmDialog` with distinct title, description text, and confirm button label. The text must clearly explain what is deleted vs preserved.
  - Acceptance Criteria:
    - The session-clear dialog mentions that session/snapshot is removed but historical catalog is preserved.
    - The catalog-clear dialog mentions that all historical bug data is permanently removed.
  - Priority: Must-Have

#### Renderer

- **FR-UI-001:** Dashboard continues showing open bugs without behavioral changes
  - Description: `useDashboard` and `DashboardPage` continue reading from `session.bugs`, which contains only open bugs from the latest fetch. No change in the component tree or user interaction flow.
  - Acceptance Criteria:
    - Given a session with 50 categorized open bugs, The dashboard renders exactly those 50 bugs with all existing features (filter, sort, group, drawer, similarity tab).
  - Priority: Must-Have

- **FR-UI-002:** Historical catalog must not degrade dashboard loading
  - Description: The catalog is a separate store key. `session:get` returns only the session object (open snapshot). The catalog is never sent to the renderer unless explicitly requested.
  - Acceptance Criteria:
    - Given a catalog with 10,000 entries, When the dashboard loads, Then load time is unaffected because only the session (open snapshot) is transferred over IPC.
  - Priority: Must-Have

### Non-Functional Requirements

- **NFR-COMPAT-001:** Migration must preserve v2 sessions
  - The v3 migration must handle both `null` sessions and populated v2 `SessionData`. When a v2 session exists, the migration must create a `bugCatalog` from `session.bugs`, populating lifecycle metadata with reasonable defaults (`firstSeenAt` = `lastSeenAt` = `session.fetchedAt`, `closedAt` = null).

- **NFR-PERF-001:** Incremental fetch must avoid unnecessary full re-categorizations
  - Merge logic is O(n) in fetched bug count (Map lookups). Signature computation is O(1) per bug.

- **NFR-ROBUST-001:** Categorization errors must not corrupt persisted catalog
  - The catalog is updated only on successful categorization. If `categorizeBugs()` throws, the catalog remains at its pre-categorization state. Session snapshot may be partially updated via chunk progress, but catalog writes happen atomically at the end.

- **NFR-SEC-001:** No bypassing preload/IPC boundary
  - All new data access goes through `ipc-channels.ts` → `preload/index.ts` → handler. No direct `electron-store` access from renderer.

- **NFR-MAINT-001:** Merge logic in dedicated utility
  - All fetch-merge, signature computation, and catalog update logic lives in `src/main/utils/catalog-merge.ts`, not scattered in IPC handlers.

- **NFR-UX-001:** Cleanup actions must clearly explain effects
  - Dialog text distinguishes between "current session (fetched bugs, categories, similarity)" vs "historical bug catalog (all previously seen bugs)".

### Constraints

- electron-store is the only persistence mechanism. No external databases.
- `bugCatalog` shares the same encrypted store file as settings and session.
- Catalog is keyed by `bugId` (number). TypeScript type: `Record<number, CatalogBug>` or `null`.
- The LLM service API (`categorizeBugs()`) does not change its signature — the handler filters input and merges output.
- The `ado-service.ts` `fetchBugsFromQuery()` return type (`BugItem[]`) does not change.

### Assumptions

- The set of "categorization-relevant fields" for the input signature is: `title`, `description` (plain text), `tags` (sorted, joined), `priority`, `areaPath`. `assignee`, `state`, `createdDate`, `updatedDate` are NOT included because they don't influence category assignment.
- A simple deterministic JSON stringification + hash is sufficient for the signature (no need for a cryptographic hash; a fast one like a simple string hash is fine, but we'll use a proper hash for reliability).
- Bug IDs from ADO are globally unique integers within a project.
- The catalog may grow indefinitely; no auto-pruning in this feature (can be added later).

### Out of Scope

- New KPI UI for closed/done bugs (FT-13)
- Exportable reports
- Distinction between "removed from query scope" vs "closed/done"
- New similarity rules on historical bugs
- Catalog pruning / size limits
- Catalog IPC channel for renderer to query historical data (deferred to FT-13)

### Edge Cases

| Scenario                                               | Expected Behavior                                                                               | Related Requirement        |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | -------------------------- |
| First-ever fetch (no catalog exists)                   | All bugs are new, catalog is created from scratch                                               | FR-FETCH-001, FR-FETCH-003 |
| Fetch returns empty list                               | All catalog open bugs get `closedAt`, session has empty bugs array                              | FR-FETCH-004               |
| Bug reappears after being marked closed                | `closedAt` is reset to `null`, `lastSeenAt` updated; bug treated as known (check signature)     | FR-FETCH-001, FR-FETCH-002 |
| v2 session with `null` session                         | Migration produces empty catalog, session stays null                                            | NFR-COMPAT-001             |
| v2 session with populated bugs                         | Migration creates catalog entries from existing bugs                                            | NFR-COMPAT-001             |
| Categorization fails midway (partial chunks completed) | Session may have partial results (existing behavior); catalog is NOT updated until full success | NFR-ROBUST-001             |
| User clears session then fetches again                 | Fetch creates new session from catalog (reusing categorizations for unchanged bugs)             | FR-SET-001, FR-FETCH-002   |
| User clears catalog then fetches                       | Fetch creates brand-new catalog, all bugs treated as new                                        | FR-SET-002, FR-FETCH-001   |
| Similarity run with no categorized bugs                | Existing error handling prevents run (`canAnalyze` = false)                                     | FR-SIM-001                 |
| Same bug in multiple similarity groups                 | `lastSimilarityGroupAt` updated to the latest; `everInSimilarityGroup` stays true               | FR-SIM-003                 |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 16
- **Parallelizable:** 10 (63%)
- **Execution Waves:** 5

### Execution Waves

#### Wave 1 — Shared Contract & Data Model

**Execution:** PARALLEL

| Task ID | Type      | Title                                  | Description                                                             | Files                        | Depends On | Complexity |
| ------- | --------- | -------------------------------------- | ----------------------------------------------------------------------- | ---------------------------- | ---------- | ---------- |
| T-001   | IMPLEMENT | Extend shared types with catalog model | Add `CatalogBug`, `BugCatalog` types and update `SessionData` if needed | `src/shared/types.ts`        | None       | S          |
| T-002   | IMPLEMENT | Add new IPC channel `catalog:clear`    | Add `CATALOG_CLEAR` to IPC_CHANNELS                                     | `src/shared/ipc-channels.ts` | None       | S          |

#### Wave 2 — Core Utilities & Store

**Execution:** PARALLEL (T-003 ∥ T-004 ∥ T-005)

| Task ID | Type      | Title                           | Description                                                                                                                                        | Files                                              | Depends On | Complexity |
| ------- | --------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------- | ---------- |
| T-003   | IMPLEMENT | Create catalog-merge utility    | Implement signature computation, fetch-merge logic, catalog update functions                                                                       | `src/main/utils/catalog-merge.ts`                  | T-001      | L          |
| T-004   | IMPLEMENT | Store migration v3              | Add migration v3 that creates `bugCatalog` from existing v2 session data, update `CURRENT_SCHEMA_VERSION` to 3, add `bugCatalog` to store defaults | `src/main/store-migration.ts`, `src/main/store.ts` | T-001      | M          |
| T-005   | TEST      | Tests for catalog-merge utility | Unit tests for signature computation, merge logic (new/unchanged/changed/absent/reappeared), edge cases                                            | `tests/main/catalog-merge.spec.ts`                 | T-003      | L          |

#### Wave 3 — Main Process IPC Handlers

**Execution:** PARALLEL (T-006 ∥ T-007 ∥ T-008 ∥ T-009)

| Task ID | Type      | Title                                                        | Description                                                             | Files                      | Depends On   | Complexity |
| ------- | --------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- | -------------------------- | ------------ | ---------- |
| T-006   | IMPLEMENT | Update `ado:fetch-bugs` handler for incremental merge        | Replace full-session-replacement with catalog-aware merge               | `src/main/ipc-handlers.ts` | T-003, T-004 | M          |
| T-007   | IMPLEMENT | Update `llm:categorize` handler for selective categorization | Filter to uncategorized bugs, merge results back into session + catalog | `src/main/ipc-handlers.ts` | T-003, T-004 | M          |
| T-008   | IMPLEMENT | Update `llm:find-similar` handler for catalog metadata       | After persisting similarity results, update catalog similarity metadata | `src/main/ipc-handlers.ts` | T-003, T-004 | S          |
| T-009   | IMPLEMENT | Add `catalog:clear` handler + update `session:clear`         | Implement new handler; ensure existing clear doesn't touch catalog      | `src/main/ipc-handlers.ts` | T-002, T-004 | S          |

#### Wave 4 — Preload, Renderer, Tests

**Execution:** PARALLEL (T-010 ∥ T-011 ∥ T-012 ∥ T-013 ∥ T-014)

| Task ID | Type      | Title                                 | Description                                                                                         | Files                                            | Depends On                 | Complexity |
| ------- | --------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------- | ---------- |
| T-010   | IMPLEMENT | Expose `clearCatalog` in preload      | Add `clearCatalog` method to electronAPI                                                            | `src/preload/index.ts`, `src/preload/index.d.ts` | T-002                      | S          |
| T-011   | IMPLEMENT | Update SettingsPage with dual cleanup | Add second danger-zone button + confirmation dialog for catalog clear; update existing dialog text  | `src/renderer/src/pages/SettingsPage.tsx`        | T-010                      | M          |
| T-012   | TEST      | Tests for store migration v3          | Test migration from v2 (populated session), v2 (null session), and fresh install                    | `tests/main/store-migration.spec.ts`             | T-004                      | M          |
| T-013   | TEST      | Tests for updated IPC handlers        | Test incremental fetch, selective categorization, similarity metadata update, session/catalog clear | `tests/main/ipc-handlers.spec.ts`                | T-006, T-007, T-008, T-009 | L          |
| T-014   | TEST      | Tests for SettingsPage dual cleanup   | Renderer tests for both cleanup buttons, confirmation dialogs, correct IPC calls                    | `tests/renderer/SettingsPage-clear.spec.tsx`     | T-011                      | M          |

#### Wave 5 — Documentation

**Execution:** PARALLEL

| Task ID | Type      | Title                   | Description                                                                               | Files              | Depends On | Complexity |
| ------- | --------- | ----------------------- | ----------------------------------------------------------------------------------------- | ------------------ | ---------- | ---------- |
| T-015   | INTEGRATE | Update wiki pages       | Update relevant wiki pages for new data model, IPC channels, merge logic, store migration | `wiki/**`          | T-013      | S          |
| T-016   | INTEGRATE | Update feature-index.md | Add FT-12 entry to feature-index                                                          | `feature-index.md` | T-015      | S          |

### Critical Path

T-001 → T-003 → T-006/T-007 → T-013 → T-015 → T-016 (critical path: 6 tasks)

### Task Details

---

#### T-001: Extend shared types with catalog model

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Add `CatalogBug` interface to `src/shared/types.ts`:
     ```ts
     export interface CatalogBug extends CategorizedBug {
       firstSeenAt: string
       lastSeenAt: string
       closedAt: string | null
       inputSignature: string
       everInSimilarityGroup: boolean
       lastSimilarityGroupAt: string | null
     }
     ```
  2. Add type alias for the catalog:
     ```ts
     export type BugCatalog = Record<number, CatalogBug>
     ```
  3. Keep `SessionData` unchanged — it already has `bugs: CategorizedBug[]`. The session continues to hold only open bugs.
  4. No breaking changes to existing types.
- **Acceptance Criteria:** `CatalogBug` and `BugCatalog` are exported from `@shared/types`. All existing imports still compile.
- **Testing Approach:** Compile-time validation; consumed by T-003/T-004/T-005.
- **Output:** Updated `src/shared/types.ts`

---

#### T-002: Add new IPC channel `catalog:clear`

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Add to `IPC_CHANNELS` in `src/shared/ipc-channels.ts`:
     ```ts
     // Catalog
     CATALOG_CLEAR: 'catalog:clear',
     ```
  2. Place it after the Session block.
- **Acceptance Criteria:** `IPC_CHANNELS.CATALOG_CLEAR` is available and typed as `'catalog:clear'`.
- **Testing Approach:** Compile-time; consumed by T-009, T-010.
- **Output:** Updated `src/shared/ipc-channels.ts`

---

#### T-003: Create catalog-merge utility

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `src/main/utils/catalog-merge.ts` with the following exports:
  2. **`computeInputSignature(bug: BugItem): string`**
     - Takes normalized categorization-relevant fields: `title.trim().toLowerCase()`, `description.trim().toLowerCase()`, `tags` (sorted, joined with `;`), `priority` (as string), `areaPath.trim().toLowerCase()`.
     - Concatenates them with a separator and computes a deterministic hash.
     - Use Node.js `crypto.createHash('sha256')` for reliability, truncated to first 16 hex chars for compactness.
  3. **`mergeFetchIntoCatalog(fetchedBugs: BugItem[], existingCatalog: BugCatalog | null, now: string): MergeResult`**
     - Returns `{ updatedCatalog: BugCatalog, sessionBugs: CategorizedBug[] }`
     - For each fetched bug:
       - Compute `inputSignature`
       - If bug `id` exists in catalog AND `inputSignature` matches AND has valid categorization → carry over categorization into `sessionBugs` entry. Update `lastSeenAt`, reset `closedAt` to null if it was set.
       - If bug `id` exists but signature differs OR categorization is empty → reset categorization fields, update signature in catalog. Update `lastSeenAt`, reset `closedAt`.
       - If bug `id` not in catalog → create new `CatalogBug` entry with empty categorization, lifecycle defaults, empty similarity metadata. Add to `sessionBugs` with empty categorization.
     - For each catalog entry NOT in the fetched set:
       - If `closedAt === null` → set `closedAt = now`.
     - Return the complete updated catalog and the session bugs array.
  4. **`mergeCategorization(sessionBugs: CategorizedBug[], llmResults: CategorizedBug[], catalog: BugCatalog, now: string): { updatedSessionBugs: CategorizedBug[], updatedCatalog: BugCatalog }`**
     - For each LLM result, find the matching session bug by `id` and update its categorization fields + `categorizedAt`.
     - Also update the catalog entry with the same categorization + recompute and persist `inputSignature`.
     - Return updated arrays.
  5. **`updateCatalogSimilarityMetadata(catalog: BugCatalog, similarityResult: SimilarityResult): BugCatalog`**
     - Iterate over all groups in all categories, collect all `bugIds`.
     - For each bugId found in catalog, set `everInSimilarityGroup = true`, `lastSimilarityGroupAt = similarityResult.analyzedAt`.
     - Return updated catalog.
- **Acceptance Criteria:** All four functions exported and independently testable. Pure functions (no side effects, no store access).
- **Testing Approach:** TDD — write T-005 in parallel.
- **Output:** New file `src/main/utils/catalog-merge.ts`

---

#### T-004: Store migration v3

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. In `src/main/store-migration.ts`:
     - Update `CURRENT_SCHEMA_VERSION` from `2` to `3`.
     - Add a new migration entry `{ version: 3, up: ... }` to the `migrations` array.
     - The v3 `up` function:
       - Reads `data.session` (the v2 `SessionData | null`).
       - If `session` is null or has no bugs → sets `data.bugCatalog = null`.
       - If `session` has bugs → creates a `BugCatalog` from `session.bugs`:
         - For each `CategorizedBug` in `session.bugs`, create a `CatalogBug` with:
           - All `CategorizedBug` fields carried over.
           - `firstSeenAt = session.fetchedAt`
           - `lastSeenAt = session.fetchedAt`
           - `closedAt = null`
           - `inputSignature = computeInputSignature(bug)` (import from catalog-merge)
           - `everInSimilarityGroup = false` (unless we can detect from session.similarityResults)
           - `lastSimilarityGroupAt = null`
         - If `session.similarityResults` exists, iterate over groups to set `everInSimilarityGroup` and `lastSimilarityGroupAt` for matching bugs.
       - Session itself is NOT modified (it stays as-is for the current open snapshot).
  2. In `src/main/store-migration.ts` `migrateStore()`:
     - The existing logic already reads `session`, runs migrations, and persists. Need to also persist `bugCatalog` key if present in migrated data.
     - Update the persist block to also handle `data.bugCatalog`.
  3. In `src/main/store.ts`:
     - Add `bugCatalog: null` to the `defaults` object.
- **Acceptance Criteria:** Apps with v2 stores migrate cleanly to v3. Fresh installs get `bugCatalog: null`. `CURRENT_SCHEMA_VERSION === 3`.
- **Testing Approach:** Covered by T-012.
- **Output:** Updated `src/main/store-migration.ts`, `src/main/store.ts`

---

#### T-005: Tests for catalog-merge utility

- **Type:** TEST
- **Wave:** 2 — PARALLEL (with T-003)
- **Implementation Notes:**
  1. Create `tests/main/catalog-merge.spec.ts`.
  2. Test `computeInputSignature`:
     - Same inputs → same signature.
     - Different `title` → different signature.
     - Different `assignee` (non-relevant field) → same signature if passed same BugItem with different assignee.
     - Case-insensitive: same text different casing → same signature.
     - Tags order doesn't matter (sorted).
  3. Test `mergeFetchIntoCatalog`:
     - Empty catalog + N bugs → N new entries, all uncategorized in session.
     - Full match (all bugs known, unchanged) → session has all categorizations, catalog updated `lastSeenAt`.
     - Mixed (new + unchanged + changed + absent) → correct classification of each.
     - Bug reappears after `closedAt` was set → `closedAt` reset to null.
     - Fetch returns empty → all catalog open bugs get `closedAt`.
  4. Test `mergeCategorization`:
     - LLM results merged correctly into session and catalog.
     - Only processed bugs updated, others untouched.
  5. Test `updateCatalogSimilarityMetadata`:
     - Bugs in groups get metadata updated.
     - Bugs not in groups remain unchanged.
- **Acceptance Criteria:** All tests pass. Coverage > 90% for `catalog-merge.ts`.
- **Testing Approach:** TDD
- **Output:** New file `tests/main/catalog-merge.spec.ts`

---

#### T-006: Update `ado:fetch-bugs` handler for incremental merge

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. In `src/main/ipc-handlers.ts`, update the `ADO_FETCH_BUGS` handler:
     - After fetching `fetchedBugs` from ADO, load existing catalog: `const catalog = store.get('bugCatalog') as BugCatalog | null`.
     - Call `mergeFetchIntoCatalog(fetchedBugs, catalog, new Date().toISOString())`.
     - Persist `updatedCatalog` to store: `store.set('bugCatalog', updatedCatalog)`.
     - Create `SessionData` with `sessionBugs` from the merge result.
     - Persist session as before.
     - Return `updatedSession.bugs`.
  2. Import `mergeFetchIntoCatalog` from `../utils/catalog-merge`.
  3. Remove the old mapping logic that created empty-categorized bugs unconditionally.
- **Acceptance Criteria:** Fetch reuses categorizations for unchanged bugs, marks new/changed for re-categorization, updates catalog lifecycle.
- **Testing Approach:** Covered by T-013.
- **Output:** Updated `src/main/ipc-handlers.ts`

---

#### T-007: Update `llm:categorize` handler for selective categorization

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. In the `LLM_CATEGORIZE` handler:
     - After loading session, filter bugs that need categorization: `const bugsToSend = session.bugs.filter(b => !b.categorizedAt)`.
     - If `bugsToSend.length === 0`, still set `categorizedAt` on session and return (all bugs already categorized).
     - Send only `bugsToSend` (as `BugItem[]`) to `categorizeBugs()`.
     - After receiving LLM results, load catalog: `const catalog = store.get('bugCatalog') as BugCatalog`.
     - Call `mergeCategorization(session.bugs, categorized, catalog, now)`.
     - Persist both updated session and updated catalog.
     - Set `session.categorizedAt` to now.
  2. The progress callback still reports based on `bugsToSend.length` (not total).
  3. Handle edge case: if all bugs already categorized, skip LLM call but still update `categorizedAt`.
- **Acceptance Criteria:** Only uncategorized bugs sent to LLM. Results merged into session + catalog.
- **Testing Approach:** Covered by T-013.
- **Output:** Updated `src/main/ipc-handlers.ts`

---

#### T-008: Update `llm:find-similar` handler for catalog metadata

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. In the `LLM_FIND_SIMILAR` handler, after persisting `similarityResults` on session:
     - Load catalog: `const catalog = store.get('bugCatalog') as BugCatalog | null`.
     - If catalog exists, call `updateCatalogSimilarityMetadata(catalog, result)`.
     - Persist the updated catalog.
  2. Import `updateCatalogSimilarityMetadata` from `../utils/catalog-merge`.
- **Acceptance Criteria:** Bugs appearing in similarity groups have `everInSimilarityGroup = true` and `lastSimilarityGroupAt` updated in catalog.
- **Testing Approach:** Covered by T-013.
- **Output:** Updated `src/main/ipc-handlers.ts`

---

#### T-009: Add `catalog:clear` handler + update `session:clear`

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Add handler for `CATALOG_CLEAR`:
     ```ts
     ipcMain.handle(IPC_CHANNELS.CATALOG_CLEAR, () => {
       store.set('bugCatalog', null)
     })
     ```
  2. The existing `SESSION_CLEAR` handler (`store.set('session', null)`) is already correct — it only clears session, not catalog. No change needed.
  3. Add import for the new channel constant (already available via `IPC_CHANNELS`).
- **Acceptance Criteria:** `catalog:clear` sets catalog to null without touching session. `session:clear` sets session to null without touching catalog.
- **Testing Approach:** Covered by T-013.
- **Output:** Updated `src/main/ipc-handlers.ts`

---

#### T-010: Expose `clearCatalog` in preload

- **Type:** IMPLEMENT
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. In `src/preload/index.ts`, add to `electronAPI`:
     ```ts
     // Catalog
     clearCatalog: () => ipcRenderer.invoke(IPC_CHANNELS.CATALOG_CLEAR),
     ```
  2. The `ElectronAPI` type is auto-inferred from `typeof electronAPI`, so `index.d.ts` needs no manual change (it declares `Window.electronAPI: ElectronAPI`).
- **Acceptance Criteria:** `window.electronAPI.clearCatalog()` is available in renderer.
- **Testing Approach:** Compile-time + integration via T-014.
- **Output:** Updated `src/preload/index.ts`

---

#### T-011: Update SettingsPage with dual cleanup

- **Type:** IMPLEMENT
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. In `src/renderer/src/pages/SettingsPage.tsx`:
  2. Add a second state for catalog clear confirmation:
     ```ts
     const [confirmCatalogOpen, setConfirmCatalogOpen] = useState(false)
     const [clearCatalogResult, setClearCatalogResult] = useState<{
       type: 'success' | 'error'
       message: string
     } | null>(null)
     ```
  3. Add `handleClearCatalog` async function (similar pattern to `handleClearSession`):
     - Calls `window.electronAPI.clearCatalog()`.
     - Sets success/error result.
  4. Update the existing session-clear confirmation dialog text to explain that historical catalog is preserved:
     - Title: "Conferma pulizia sessione corrente"
     - Description: "I bug scaricati, le categorizzazioni correnti e i risultati di similarità verranno eliminati. Lo storico dei bug già visti resta disponibile. L'operazione non è reversibile."
  5. Add a second danger zone block for catalog clear:
     - Heading: "Cancella storico bug"
     - Description: "Questa azione elimina permanentemente tutto lo storico dei bug già visti, inclusi metadati di lifecycle e categorizzazioni storiche. Lo snapshot corrente resta disponibile."
     - Button: "Cancella storico bug" (destructive variant)
  6. Add second `ConfirmDialog`:
     - Title: "Conferma cancellazione storico"
     - Description: "Tutti i dati storici dei bug verranno eliminati permanentemente, incluse categorizzazioni e metadati di lifecycle. Questa operazione non è reversibile. Vuoi procedere?"
     - Confirm label: "Cancella storico"
  7. Add auto-dismiss for `clearCatalogResult` (same pattern as existing).
- **Acceptance Criteria:** Two distinct buttons, two distinct confirmation dialogs, correct IPC calls, feedback banners.
- **Testing Approach:** Covered by T-014.
- **Output:** Updated `src/renderer/src/pages/SettingsPage.tsx`

---

#### T-012: Tests for store migration v3

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Update `tests/main/store-migration.spec.ts`:
  2. Add test cases:
     - v2 store with `null` session → migration produces `bugCatalog: null`, schema bumped to 3.
     - v2 store with populated session (bugs with categorization) → migration produces `BugCatalog` with correct lifecycle defaults, signatures computed.
     - v2 store with session + similarityResults → migration produces catalog with `everInSimilarityGroup` set for relevant bugs.
     - v0 store → runs all migrations (v1 → v2 → v3) cleanly.
     - v3 store → no migration runs (already current).
  3. Reuse the existing mock store pattern from the existing migration tests.
- **Acceptance Criteria:** All migration paths tested. No data loss on upgrade.
- **Testing Approach:** Post-implementation unit tests.
- **Output:** Updated `tests/main/store-migration.spec.ts`

---

#### T-013: Tests for updated IPC handlers

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Update `tests/main/ipc-handlers.spec.ts`:
  2. New test cases for `ado:fetch-bugs`:
     - First fetch (no catalog) → creates catalog + session with all new bugs.
     - Second fetch (unchanged bugs) → reuses categorizations, no reset.
     - Fetch with mixed new/changed/unchanged/absent bugs → correct merge.
     - Catalog lifecycle metadata (`firstSeenAt`, `lastSeenAt`, `closedAt`) updated correctly.
  3. New test cases for `llm:categorize`:
     - All bugs already categorized → no LLM call, categorizedAt updated.
     - Mix of categorized + uncategorized → only uncategorized sent to LLM.
     - Results merged into both session and catalog.
  4. New test cases for `llm:find-similar`:
     - After run, catalog entries in similarity groups have metadata updated.
  5. New test cases for cleanup:
     - `session:clear` → session null, catalog untouched.
     - `catalog:clear` → catalog null, session untouched.
  6. Use existing mock patterns (mock `store.get`/`store.set`, mock `fetchBugsFromQuery`, mock `categorizeBugs`).
- **Acceptance Criteria:** All new test cases pass. Existing tests continue to pass (may need minor updates for new store.get('bugCatalog') calls).
- **Testing Approach:** Post-implementation.
- **Output:** Updated `tests/main/ipc-handlers.spec.ts`

---

#### T-014: Tests for SettingsPage dual cleanup

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Update `tests/renderer/SettingsPage-clear.spec.tsx`:
  2. New test cases:
     - "Pulisci dati sessione" button → opens correct dialog → calls `clearSession()` → shows success feedback.
     - "Cancella storico bug" button → opens correct dialog → calls `clearCatalog()` → shows success feedback.
     - Cancel on each dialog → no IPC call.
     - Error handling for each action.
     - Dialog texts are distinct and mention the correct scope.
  3. Mock `window.electronAPI.clearCatalog`.
- **Acceptance Criteria:** Both cleanup flows tested. Distinct dialogs verified.
- **Testing Approach:** jsdom-based renderer tests.
- **Output:** Updated `tests/renderer/SettingsPage-clear.spec.tsx`

---

#### T-015: Update wiki pages

- **Type:** INTEGRATE
- **Wave:** 5 — PARALLEL
- **Implementation Notes:**
  1. Review and update wiki pages affected by the new data model:
     - Data model / types documentation
     - IPC channels documentation
     - Store / persistence documentation
     - Settings page documentation
  2. Add documentation for the catalog-merge utility.
  3. Document the migration v3 behavior.
- **Acceptance Criteria:** Wiki pages reflect the new architecture accurately.
- **Testing Approach:** Manual review.
- **Output:** Updated `wiki/**` files

---

#### T-016: Update feature-index.md

- **Type:** INTEGRATE
- **Wave:** 5 — PARALLEL
- **Implementation Notes:**
  1. Add FT-12 entry to `feature-index.md`:
     ```
     | 17  | FT-12   | Incremental Session Cache & Selective Re-Categorization | Complete |
     ```
- **Acceptance Criteria:** FT-12 is tracked in the feature index.
- **Testing Approach:** N/A
- **Output:** Updated `feature-index.md`

---

### Risk Register

| Risk                                                                  | Impact | Likelihood | Mitigation                                                                                                                                |
| --------------------------------------------------------------------- | ------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Migration v3 corrupts existing v2 data                                | High   | Low        | Comprehensive migration tests (T-012); migration error handler already resets session to null + bumps schema to prevent re-run            |
| Catalog grows unbounded over time                                     | Medium | Medium     | Out of scope for FT-12; can be addressed later with a pruning feature. Catalog is only read by main process, not sent to renderer.        |
| Signature collision (two different bugs produce same hash)            | Low    | Very Low   | Using SHA-256 truncated to 16 hex chars (64 bits); collision probability negligible for typical bug counts (<10k).                        |
| Partial categorization leaves session inconsistent                    | Medium | Low        | Session can have partial results from chunk progress (existing behavior). Catalog only updated on full success. NFR-ROBUST-001 addressed. |
| Breaking change in `session:clear` behavior confuses users            | Medium | Medium     | FR-SET-003 ensures dialog text explains the change. Existing tests updated.                                                               |
| LLM service receives empty bug array when all are already categorized | Low    | Medium     | T-007 explicitly handles this edge case: skip LLM call, still update `categorizedAt`.                                                     |

---

### Completeness Assessment

- Functional coverage: **High** — all 16 FRs from the brief are mapped to specific tasks with acceptance criteria.
- Non-functional coverage: **High** — all 6 NFRs addressed with specific implementation guidance.
- Task-to-requirement mapping: **Complete** — every FR maps to at least one task; every task maps to at least one FR.

| Requirement    | Tasks                                           |
| -------------- | ----------------------------------------------- |
| FR-DATA-001    | T-001, T-004, T-006                             |
| FR-DATA-002    | T-001, T-003, T-004, T-006                      |
| FR-DATA-003    | T-001, T-003, T-006                             |
| FR-DATA-004    | T-001, T-003, T-008                             |
| FR-FETCH-001   | T-003, T-006                                    |
| FR-FETCH-002   | T-003, T-006                                    |
| FR-FETCH-003   | T-003, T-006                                    |
| FR-FETCH-004   | T-003, T-006                                    |
| FR-LLM-001     | T-007                                           |
| FR-LLM-002     | T-003, T-007                                    |
| FR-LLM-003     | T-003, T-007                                    |
| FR-SIM-001     | T-008 (no change needed)                        |
| FR-SIM-002     | (no change needed — existing isStale logic)     |
| FR-SIM-003     | T-003, T-008                                    |
| FR-SET-001     | T-009                                           |
| FR-SET-002     | T-002, T-009, T-010, T-011                      |
| FR-SET-003     | T-011                                           |
| FR-UI-001      | (no change needed — session model unchanged)    |
| FR-UI-002      | (architectural — catalog separate from session) |
| NFR-COMPAT-001 | T-004, T-012                                    |
| NFR-PERF-001   | T-003                                           |
| NFR-ROBUST-001 | T-007                                           |
| NFR-SEC-001    | T-002, T-009, T-010                             |
| NFR-MAINT-001  | T-003                                           |
| NFR-UX-001     | T-011, T-014                                    |

### Status

**READY FOR APPROVAL**
