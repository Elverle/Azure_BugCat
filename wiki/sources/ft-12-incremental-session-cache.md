---
title: 'FT-12 - Incremental Session Cache & Selective Re-Categorization'
type: source
created: 2026-05-13
updated: 2026-05-13
sources: []
tags: [catalog, session, llm, migration, ipc, settings, testing]
lang: en
---

## Summary

FT-12 replaces the old single-snapshot persistence model with a dual-layer design: `session` now represents only the current open-bug snapshot shown in the renderer, while `bugCatalog` persists every bug ever seen together with lifecycle and categorization metadata. Fetch becomes incremental and catalog-aware, categorization becomes selective, similarity still analyzes only open bugs, and Settings gains separate cleanup controls for the snapshot and the historical catalog.

## Files Created

| File                               | Purpose                                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/main/utils/catalog-merge.ts`  | Pure main-process utility for signature computation, fetch merge, categorization merge, and similarity metadata updates |
| `tests/main/catalog-merge.spec.ts` | Focused unit coverage for incremental merge rules, signature stability, and similarity metadata behavior                |

## Files Modified

| File                                                        | Change                                                                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/shared/types.ts`                                       | Added `CatalogBug` and `BugCatalog`, clarifying the split between the open snapshot and historical catalog   |
| `src/shared/ipc-channels.ts`                                | Added the `catalog:clear` channel for history-only cleanup                                                   |
| `src/main/store-migration.ts`                               | Introduced schema migration v3 that back-populates `bugCatalog` from legacy v2 session data                  |
| `src/main/store.ts`                                         | Added `bugCatalog: null` to the encrypted store defaults                                                     |
| `src/main/ipc-handlers.ts`                                  | Reworked fetch/categorize/similarity persistence around the catalog and added `catalog:clear`                |
| `src/preload/index.ts`                                      | Exposed `clearCatalog()` through the preload bridge                                                          |
| `src/renderer/src/components/dashboard/DashboardHeader.tsx` | Shows the latest count of bugs that were new compared with the historical catalog under `Fetch Bugs`         |
| `src/renderer/src/hooks/useDashboard.ts`                    | Hydrates `lastFetchNewCount` from `SessionData` so the dashboard can surface the fetch summary               |
| `src/renderer/src/pages/SettingsPage.tsx`                   | Added separate destructive controls and confirmation dialogs for clearing session vs catalog                 |
| `src/renderer/src/global.d.ts`                              | Added the typed `clearCatalog()` method to the renderer global augmentation                                  |
| `tests/main/store-migration.spec.ts`                        | Added migration-v3 coverage for backfill, null/empty sessions, and similarity metadata carryover             |
| `tests/main/ipc-handlers.spec.ts`                           | Added handler coverage for incremental fetch, selective categorization, and session/catalog clear boundaries |
| `tests/renderer/useDashboard.spec.ts`                       | Verifies the hook surfaces `lastFetchNewCount` through `sessionInfo`                                         |
| `tests/renderer/DashboardPage.spec.tsx`                     | Verifies the dashboard renders the new-bug summary in the header                                             |
| `tests/renderer/SettingsPage-clear.spec.tsx`                | Added renderer coverage for the new catalog-clear UI and confirmation flow                                   |

## Key Takeaways

1. **Persistence is now split by responsibility** - `session` is a lightweight renderer snapshot, while `bugCatalog` is the long-lived historical record.
2. **Fetch is no longer a full reset** - unchanged open bugs can carry forward historical categorization if their signature still matches the stored inputs.
3. **Categorization is selective** - only bugs with missing or invalidated categorization are sent to the LLM provider.
4. **Similarity remains scoped to open bugs** - the analysis still runs from `session.bugs`, but matching catalog entries now gain similarity-history metadata.
5. **Migration keeps old installs useful** - schema v3 reconstructs a first catalog from v2 session data instead of forcing users to rebuild history manually.
6. **Cleanup is explicit and scoped** - operators can clear the open snapshot without losing historical reuse data, or clear the historical catalog without discarding the current working set.
7. **Renderer feedback stays bounded** - the dashboard can show how many bugs were newly discovered during the last fetch without loading the historical catalog into the renderer.

## Architecture Delta

```text
ADO fetch
  -> fetchBugsFromQuery(settings)
  -> mergeFetchIntoCatalog(fetchedBugs, bugCatalog, now)
       -> updatedCatalog
       -> sessionBugs (open snapshot only)
    -> newBugCount
  -> store.set('bugCatalog', updatedCatalog)
  -> store.set('session', { bugs: sessionBugs, fetchedAt: now, lastFetchNewCount: newBugCount })

LLM categorize
  -> bugsToSend = session.bugs.filter(!categorizedAt)
  -> categorizeBugs(settings, bugsToSend, onProgress, signal)
  -> merge results into session snapshot
  -> merge same results into bugCatalog
  -> store.set('session', updatedSession)
  -> store.set('bugCatalog', updatedCatalog)

Similarity
  -> findSimilarBugs(settings, session.bugs, onProgress)
  -> store.set('session', { ...session, similarityResults })
  -> updateCatalogSimilarityMetadata(bugCatalog, similarityResults)

Settings cleanup
  -> clearSession() -> store.set('session', null)
  -> clearCatalog() -> store.set('bugCatalog', null)
```

## Validation Surface

- `tests/main/catalog-merge.spec.ts` covers deterministic signatures, new/unchanged/changed/absent/reappearing bugs, selective merge behavior, and similarity metadata updates.
- `tests/main/store-migration.spec.ts` covers schema version 3, catalog backfill from v2 sessions, null and empty sessions, and similarity-history carryover.
- `tests/main/ipc-handlers.spec.ts` covers incremental fetch behavior, selective categorization, session/catalog clear boundaries, and related IPC wiring.
- `tests/renderer/useDashboard.spec.ts` covers hydration of the fetch summary metadata from `SessionData`.
- `tests/renderer/DashboardPage.spec.tsx` covers visible rendering of the new-bug summary under the fetch action.
- `tests/renderer/SettingsPage-clear.spec.tsx` covers the distinct session-clear and catalog-clear confirmation flows.

## See also

- [[wiki/entities/catalog-merge-utility]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/concepts/catalog-backed-selective-re-categorization]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
