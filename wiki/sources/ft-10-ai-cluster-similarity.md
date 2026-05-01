---
title: 'FT-10 - AI Cluster Similar Bug Detection'
type: source
created: 2026-05-01
updated: 2026-05-01
sources: []
tags: [llm, similarity, ai-cluster, ipc, session, react]
lang: en
---

## Summary

FT-10 adds a dedicated similarity-analysis workflow for finding potential duplicate or strongly related bugs inside already-categorized `macroCategory` groups. The feature reuses the FT-09 similar-bugs schema and prompt builders, introduces a dedicated main-process similarity orchestrator, streams per-category progress events over IPC, persists aggregated results inside `session.similarityResults`, and lets operators inspect participating bugs through the existing detail drawer. The current UX exposes this workflow inside the dashboard `Similarità` tab rather than through a separate route.

## Files Created

| File                                                             | Purpose                                                                                |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/main/llm/similarity-service.ts`                             | Main-process service that groups categorized bugs and calls the LLM per macro-category |
| `src/renderer/src/hooks/useAiCluster.ts`                         | Renderer hook for session hydration, progress, stale detection, and analysis actions   |
| `src/renderer/src/components/ai-cluster/CategorySection.tsx`     | Collapsible per-category result section                                                |
| `src/renderer/src/components/ai-cluster/SimilarityGroupCard.tsx` | Score/reason/bug-list card for one similarity cluster                                  |
| `tests/main/llm-similar-bugs.spec.ts`                            | Similarity service tests                                                               |
| `tests/renderer/useAiCluster.spec.ts`                            | Hook tests for AI Cluster state and stale detection                                    |

## Files Modified

| File                                            | Change                                                                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/shared/types.ts`                           | Added similarity result/progress types and extended `SessionData` with `similarityResults`                  |
| `src/shared/ipc-channels.ts`                    | Added `llm:find-similar` and `llm:find-similar-progress` channels                                           |
| `src/main/llm/llm-service.ts`                   | Exported `chatWithRetry()` for reuse by the similarity flow                                                 |
| `src/main/llm/index.ts`                         | Re-exported `findSimilarBugs`                                                                               |
| `src/main/ipc-handlers.ts`                      | Added main-process handler that validates categorized session state, streams progress, and persists results |
| `src/preload/index.ts`                          | Added `findSimilarBugs()` and `onFindSimilarProgress()` bridge methods                                      |
| `src/renderer/src/pages/DashboardPage.tsx`      | Embedded the similarity workflow into a dedicated dashboard tab                                             |
| `src/renderer/src/App.tsx`                      | Removed the standalone FT-10 route after integrating similarity into the dashboard                          |
| `src/renderer/src/components/layout/Topbar.tsx` | Removed the extra FT-10 navigation item once similarity moved into the dashboard                            |

## Key Takeaways

1. **Second-pass LLM analysis** - Similarity detection is intentionally separate from categorization and runs only after `macroCategory` labels already exist.
2. **Macro-category scoping** - The LLM only compares bugs inside the same `macroCategory`, which narrows prompt context and reduces false-positive cross-domain matches.
3. **Per-category fault isolation** - One failed category produces a category-level error while other categories still return results.
4. **Session-backed UX** - Results survive tab changes because the main process stores them in the same session object used by the dashboard.
5. **Staleness awareness** - The renderer compares `categorizedAt` and `analyzedAt` so operators can see when results may need a rerun.

## Architecture Delta

```text
Renderer (dashboard Similarità tab)
  -> useAiCluster()
       -> getSession()
       -> invoke('llm:find-similar')
       -> on('llm:find-similar-progress')
  -> CategorySection -> SimilarityGroupCard -> useBugDrawer -> BugDetailDrawer

Main process
  -> IPC handler validates categorized session
  -> findSimilarBugs(settings, session.bugs, onProgress)
       -> group by macroCategory
       -> chatWithRetry(..., { responseSchema: 'similar-bugs' })
       -> parse and validate groups
  -> store.set('session', { ...session, similarityResults })
```

## Validation Surface

- `tests/main/llm-similar-bugs.spec.ts` verifies grouping, skipping invalid categories, schema option forwarding, fence stripping, and per-category error isolation.
- `tests/renderer/useAiCluster.spec.ts` verifies gating, progress subscription setup, persisted result hydration, error state, and stale detection logic.

## See also

- [[wiki/entities/similarity-service]]
- [[wiki/entities/use-ai-cluster-hook]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
- [[wiki/topics/llm-categorization-pipeline]]
