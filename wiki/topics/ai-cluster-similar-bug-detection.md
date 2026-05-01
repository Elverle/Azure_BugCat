---
title: 'AI Cluster Similar Bug Detection'
type: topic
created: 2026-05-01
updated: 2026-05-01
sources: ['[[wiki/sources/ft-10-ai-cluster-similarity]]']
tags: [llm, ai-cluster, similarity, ipc, renderer, session]
lang: en
---

## Overview

The AI Cluster feature is the app's dedicated workflow for detecting potentially duplicate or closely related bugs inside the same `macroCategory`. It extends the existing LLM infrastructure with a dashboard-level `Similarità` tab, a new IPC pair, a session-persisted result model, and renderer drill-down that reuses the existing bug detail drawer.

## Architecture

```text
Renderer
  DashboardPage / Similarità tab
    -> [[wiki/entities/use-ai-cluster-hook]]
         -> getSession()
         -> invoke('llm:find-similar')
         -> on('llm:find-similar-progress')
    -> [[wiki/entities/dashboard-page]]
         -> [[wiki/entities/ai-cluster-category-section]]
              -> [[wiki/entities/similarity-group-card]]
         -> [[wiki/entities/use-bug-drawer-hook]]
         -> [[wiki/entities/bug-detail-drawer]]

Main process
  -> [[wiki/entities/ipc-handlers]]
       -> [[wiki/entities/similarity-service]]
            -> [[wiki/entities/llm-service]]::chatWithRetry
            -> provider abstraction + similar-bugs schema
       -> persist `session.similarityResults`
```

## Components

| Layer                 | Page / Entity                                                              | Role                                                      |
| --------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- |
| Dashboard surface     | [[wiki/entities/dashboard-page]]                                           | Hosts the `Similarità` tab and action surface             |
| Renderer state        | [[wiki/entities/use-ai-cluster-hook]]                                      | Session hydration, run trigger, progress, stale detection |
| Category presentation | [[wiki/entities/ai-cluster-category-section]]                              | Expand/collapse plus empty/error rendering per category   |
| Group presentation    | [[wiki/entities/similarity-group-card]]                                    | Score badge, reason, bug links                            |
| Main orchestrator     | [[wiki/entities/similarity-service]]                                       | Grouping, LLM calls, response parsing, progress emission  |
| Transport boundary    | [[wiki/entities/ipc-handlers]], [[wiki/entities/preload-bridge]]           | Secure invoke/progress bridge                             |
| Shared inspection     | [[wiki/entities/use-bug-drawer-hook]], [[wiki/entities/bug-detail-drawer]] | Drill-down into any bug listed in a group                 |

## End-to-End Flow

### Load

1. User opens the dashboard and switches to the `Similarità` tab.
2. `useAiCluster()` reads `SessionData` from the preload bridge.
3. The tab either shows a gated empty state, previously persisted results, or a stale warning.

### Analyze

1. User clicks `Analizza Similarita`.
2. Renderer subscribes to `llm:find-similar-progress` and invokes `llm:find-similar`.
3. Main process validates settings and ensures the session has already been categorized.
4. `SimilarityService` groups bugs by `macroCategory` and runs one LLM request per eligible category.
5. Each category completion sends `SimilarityProgress { total, completed, currentGroup }` back to the renderer.

### Persist and Reuse

1. Main process stores the returned `SimilarityResult` in `session.similarityResults`.
2. View changes do not discard results because the dashboard similarity tab always rehydrates from session state.
3. Any bug click inside a group opens the shared drawer and can deep-link to Azure DevOps through the existing secure shell IPC.

## Error and Freshness Model

- Top-level invoke failures surface as a dashboard-tab error banner.
- Category-local failures are rendered inline inside the affected category section and do not erase successful categories.
- Similarity results remain visible after new categorization runs, but the tab marks them stale whenever `categorizedAt` is newer than `analyzedAt`.

## See also

- [[wiki/concepts/macro-category-scoped-similarity-analysis]]
- [[wiki/topics/llm-categorization-pipeline]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/renderer-ui]]
