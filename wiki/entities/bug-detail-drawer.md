---
title: 'Bug Detail Drawer'
type: entity
subtype: component
created: 2026-04-30
updated: 2026-05-26
sources:
  [
    '[[wiki/sources/ft-06-bug-detail-drawer]]',
    '[[wiki/sources/ft-10-ai-cluster-similarity]]',
    '[[wiki/sources/ft-14b-agent-sessions]]',
    '[[wiki/sources/ft-14d-cross-repo-project-suggestions]]',
    '[[wiki/sources/ft-14f-provider-auth-parity-analysis]]'
  ]
tags: [react, component, dashboard, drawer, accessibility]
lang: en
---

## Description

Fixed right-side detail panel used by the dashboard across the exploration, similarity, and FT-14 agent launch workflows to inspect one bug without leaving the current workspace. It combines status/title context, LLM categorization output, Azure DevOps metadata, a scrollable description, list navigation controls, a secure external-link action, and a project-scoped `Analizza` entry point for agent sessions.

## Location

`src/renderer/src/components/dashboard/BugDetailDrawer.tsx`

## Props

| Prop                    | Type                                                     | Purpose                                                 |
| ----------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| `bug`                   | `CategorizedBug \| null`                                 | Currently selected bug                                  |
| `isOpen`                | `boolean`                                                | Controls slide-in state                                 |
| `width`                 | `number`                                                 | Current drawer width                                    |
| `minWidth` / `maxWidth` | `number`                                                 | Resizing guardrails                                     |
| `onResize`              | `(nextWidth) => void`                                    | Propagates resize changes to the page                   |
| `onClose`               | `() => void`                                             | Closes the drawer                                       |
| `onPrev` / `onNext`     | `() => void`                                             | Navigates within the active list                        |
| `hasPrev` / `hasNext`   | `boolean`                                                | Disables boundary navigation buttons                    |
| `onViewInAdo`           | `() => void`                                             | Invokes the external browser action                     |
| `adoLinkEnabled`        | `boolean`                                                | Disables the footer action when settings are incomplete |
| `onAnalyze`             | `(bugId, primaryProjectId, secondaryProjectIds) => void` | Starts an FT-14 analysis session when provided          |
| `projects`              | `ProjectEntry[]`                                         | Registered project choices shown in the footer selector |
| `isAnalyzing`           | `boolean`                                                | Disables session start while another run is active      |
| `agentAvailability`     | `{ available: boolean; reason?: string } \| undefined`   | Optional FT-14F blocker propagated to the launcher      |
| `agentHint`             | `string \| null \| undefined`                            | Optional FT-14F non-blocking local-auth guidance        |

## Key Behaviors

- Renders as a fixed right-side panel pinned below the top bar (`top-[57px]`) and animates with a `translate-x` transition.
- Supports live horizontal resizing through a left-edge drag handle, with the parent page clamping width between configured min/max bounds.
- Installs a document-level `keydown` listener so `Escape` closes the drawer from anywhere in the page.
- Installs a document-level `mousedown` listener for click-outside closing, but skips both clicks inside the drawer and clicks tagged with `data-bug-click`; this behavior is documented in [[wiki/concepts/click-outside-exclusion-pattern]].
- Shows a highlighted LLM card when categorization data exists, or an explicit `Non ancora categorizzato` placeholder when `macroCategory` is empty.
- Formats created/updated timestamps with `it-IT`, joins tags inline, and renders `Nessuna descrizione disponibile` when description text is empty.
- Resolves Azure DevOps inline attachment images asynchronously through the safe preload helper before injecting sanitized HTML.
- When projects are available and `onAnalyze` is supplied, renders [[wiki/entities/analyze-start-panel]] so FT-14D can suggest a primary repo, expose optional secondary repositories, and still hand control back to [[wiki/entities/dashboard-page]]. FT-14F extends that same embedded surface with the shared availability blocker and optional Claude hint.
- Delegates previous/next navigation and external-link behavior to parent callbacks so navigation logic and shell access stay outside the presentation component.

## Dependencies

- [[wiki/entities/shared-types]] — `CategorizedBug`
- [[wiki/entities/badge-color-utilities]] — status badge classes
- [[wiki/concepts/click-outside-exclusion-pattern]]

## See also

- [[wiki/entities/use-bug-drawer-hook]]
- [[wiki/entities/analyze-start-panel]]
- [[wiki/entities/dashboard-page]]
- [[wiki/entities/open-external-ipc]]
- [[wiki/concepts/proactive-agent-configuration-blocking]]
- [[wiki/topics/dashboard-bug-exploration]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
- [[wiki/topics/cross-repo-agent-analysis]]
- [[wiki/topics/agent-analysis-sessions]]
