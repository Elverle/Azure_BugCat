---
title: 'useAiCluster Hook'
type: entity
subtype: hook
created: 2026-05-01
updated: 2026-05-01
sources: ['[[wiki/sources/ft-10-ai-cluster-similarity]]']
tags: [react, hook, ai-cluster, session, ipc]
lang: en
---

## Description

Renderer hook that owns the similarity-analysis state used by the dashboard `Similarità` tab. It hydrates the current session, exposes whether similarity analysis is allowed, subscribes to progress events during a run, surfaces analysis errors, and detects when stored results are stale relative to the latest categorization timestamp.

## Location

`src/renderer/src/hooks/useAiCluster.ts`

## Returned State

| Value        | Purpose                                                                |
| ------------ | ---------------------------------------------------------------------- |
| `results`    | Stored or freshly computed `SimilarityResult`                          |
| `bugs`       | Full categorized bug list used for cards and drawer lookup             |
| `loading`    | Initial session hydration flag                                         |
| `analyzing`  | Active similarity-run flag                                             |
| `progress`   | Current `SimilarityProgress` event                                     |
| `canAnalyze` | Gate requiring `categorizedAt` plus at least one valid `macroCategory` |
| `isStale`    | `true` when `categorizedAt` is newer than `results.analyzedAt`         |
| `error`      | Top-level error message for invoke failures                            |
| `analyze()`  | Starts a new similarity analysis run                                   |

## Key Behaviors

- Loads `SessionData` once on mount and rehydrates `bugs`, `categorizedAt`, and any persisted `similarityResults`.
- Computes `canAnalyze` from actual session quality, not just route access: the user needs both a categorization timestamp and at least one bug with a usable `macroCategory`.
- Subscribes to `window.electronAPI.onFindSimilarProgress()` only while a run is active, then tears down the listener in both success and failure paths.
- Clears previous progress and top-level error state before each run.
- Detects stale results with an ISO timestamp comparison (`results.analyzedAt < categorizedAt`).

## Dependencies

- [[wiki/entities/preload-bridge]] - `getSession`, `findSimilarBugs`, `onFindSimilarProgress`
- [[wiki/entities/shared-types]] - session and similarity types

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
- [[wiki/topics/session-persistence-lifecycle]]
