---
title: 'Analyze Start Panel'
type: entity
subtype: component
created: 2026-05-20
updated: 2026-05-26
sources:
	[
		'[[wiki/sources/ft-14d-cross-repo-project-suggestions]]',
		'[[wiki/sources/ft-14f-provider-auth-parity-analysis]]'
	]
tags: [react, component, agent, dashboard, projects, cross-repo]
lang: en
---

## Description

FT-14D drawer sub-component that prepares an agent analysis before `agent:start` runs. It loads a suggested primary project, shows optional secondary-project checkboxes, and normalizes the single-project fast path so the operator can launch analysis without extra ceremony. min-09 extends the same surface with a collapsible `Note per l'analisi` textarea for optional operator hints.

## Location

`src/renderer/src/components/dashboard/AnalyzeStartPanel.tsx`

## Props

| Prop                | Type                                                                   | Purpose                                                              |
| ------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `bugId`             | `number`                                                               | Bug being analyzed                                                   |
| `bug`               | `CategorizedBug`                                                       | Current drawer bug context                                           |
| `projects`          | `ProjectEntry[]`                                                       | Registered FT-14A projects available for selection                   |
| `onAnalyze`         | `(bugId, primaryProjectId, secondaryProjectIds, userContext?) => void` | Launch callback to the parent page                                   |
| `isAnalyzing`       | `boolean`                                                              | Disables controls while a session is already running                 |
| `agentAvailability` | `{ available: boolean; reason?: string } \| undefined`                 | Optional FT-14F precomputed blocking state for all launch surfaces   |
| `agentHint`         | `string \| null \| undefined`                                          | Optional informational hint for non-blocking local-auth requirements |

## Key Behaviors

- Shows a configuration hint instead of actions when no projects are registered.
- FT-14F can short-circuit the whole launcher before project selection and render an amber blocking banner when the current agent configuration is incomplete.
- Short-circuits to a single `Analizza` button when exactly one project exists, avoiding any suggestion IPC call.
- On multi-project setups, calls `window.electronAPI.agentSuggestProjects({ bugId })` on mount and populates the primary/secondary UI from the result.
- When the operator changes the primary project, re-invokes the same IPC with `primaryOverride` so the secondary suggestions are recomputed against the new primary.
- Filters the selected primary out of the secondary checkbox list even if the main-process payload included it by mistake.
- Warns when more than three secondary projects are selected because extra repositories can slow the analysis session.
- Keeps the analyze action disabled until a primary project is selected.
- Renders a default-collapsed `UserContextCollapsible` panel labeled `Note per l'analisi`, with `maxLength=2000`, a live counter, and a compact `compilato` badge when the field contains text.
- Resets both the note content and the collapsible open state whenever `bugId` changes, keeping the note ephemeral to the currently selected bug.
- Trims the note before calling `onAnalyze`, so blank or whitespace-only input is dropped before it crosses the renderer boundary.
- Renders a non-blocking Claude informational hint under the launch affordance when local Claude Code configuration may be required.

## Dependencies

- [[wiki/entities/preload-bridge]]
- [[wiki/entities/shared-types]]
- [[wiki/entities/agent-availability]]

## See also

- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/dashboard-page]]
- [[wiki/entities/project-matcher]]
- [[wiki/concepts/proactive-agent-configuration-blocking]]
- [[wiki/topics/cross-repo-agent-analysis]]
