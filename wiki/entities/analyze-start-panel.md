---
title: 'Analyze Start Panel'
type: entity
subtype: component
created: 2026-05-20
updated: 2026-05-20
sources: ['[[wiki/sources/ft-14d-cross-repo-project-suggestions]]']
tags: [react, component, agent, dashboard, projects, cross-repo]
lang: en
---

## Description

FT-14D drawer sub-component that prepares an agent analysis before `agent:start` runs. It loads a suggested primary project, shows optional secondary-project checkboxes, and normalizes the single-project fast path so the operator can launch analysis without extra ceremony.

## Location

`src/renderer/src/components/dashboard/AnalyzeStartPanel.tsx`

## Props

| Prop          | Type                                                     | Purpose                                              |
| ------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| `bugId`       | `number`                                                 | Bug being analyzed                                   |
| `bug`         | `CategorizedBug`                                         | Current drawer bug context                           |
| `projects`    | `ProjectEntry[]`                                         | Registered FT-14A projects available for selection   |
| `onAnalyze`   | `(bugId, primaryProjectId, secondaryProjectIds) => void` | Launch callback to the parent page                   |
| `isAnalyzing` | `boolean`                                                | Disables controls while a session is already running |

## Key Behaviors

- Shows a configuration hint instead of actions when no projects are registered.
- Short-circuits to a single `Analizza` button when exactly one project exists, avoiding any suggestion IPC call.
- On multi-project setups, calls `window.electronAPI.agentSuggestProjects({ bugId })` on mount and populates the primary/secondary UI from the result.
- When the operator changes the primary project, re-invokes the same IPC with `primaryOverride` so the secondary suggestions are recomputed against the new primary.
- Filters the selected primary out of the secondary checkbox list even if the main-process payload included it by mistake.
- Warns when more than three secondary projects are selected because extra repositories can slow the analysis session.
- Keeps the analyze action disabled until a primary project is selected.

## Dependencies

- [[wiki/entities/preload-bridge]]
- [[wiki/entities/shared-types]]

## See also

- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/dashboard-page]]
- [[wiki/entities/project-matcher]]
- [[wiki/topics/cross-repo-agent-analysis]]
