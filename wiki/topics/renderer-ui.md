---
title: 'Renderer UI'
type: topic
created: 2026-04-29
updated: 2026-05-01
sources:
  [
    '[[wiki/sources/ft-01-scaffold]]',
    '[[wiki/sources/ft-02-settings]]',
    '[[wiki/sources/ft-05-dashboard]]',
    '[[wiki/sources/ft-07-session-persistence]]',
    '[[wiki/sources/ft-10-ai-cluster-similarity]]'
  ]
tags: [react, ui, routing, tailwind, shadcn-ui]
lang: en
---

## Overview

The renderer is a React 18 SPA bundled by Vite, styled with Tailwind CSS + Inter font, and using shadcn/ui components (manual). Routing uses `HashRouter` for Electron `file://` compatibility. The primary landing surfaces are now the dashboard workspace for bug triage and similarity analysis, plus the settings page.

## Routing

| Path        | Component       | Status                 |
| ----------- | --------------- | ---------------------- |
| `/`         | `DashboardPage` | ✅ Implemented (FT-05) |
| `/settings` | `SettingsPage`  | ✅ Implemented (FT-02) |
| `*`         | `Navigate to /` | Catch-all redirect     |

All routes are wrapped in `AppLayout` (Topbar + Outlet).

## Component Tree

```text
<App>
  <HashRouter>
    <Routes>
      <Route element={<AppLayout />}>     <- Topbar + scrollable main
        <Route path="/" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  </HashRouter>
</App>
```

## Components

| Component                                     | Type              | Page / Surface                           |
| --------------------------------------------- | ----------------- | ---------------------------------------- |
| [[wiki/entities/app-layout]]                  | Layout shell      | Topbar + Outlet                          |
| [[wiki/entities/topbar]]                      | Navigation        | BugCat brand + nav links                 |
| [[wiki/entities/button-component]]            | UI primitive      | shadcn Button with variants              |
| [[wiki/entities/confirm-dialog]]              | UI primitive      | Reusable confirmation modal              |
| [[wiki/entities/input-component]]             | UI primitive      | shadcn Input                             |
| [[wiki/entities/label-component]]             | UI primitive      | shadcn Label                             |
| [[wiki/entities/select-component]]            | UI primitive      | shadcn Select                            |
| [[wiki/entities/textarea-component]]          | UI primitive      | shadcn Textarea                          |
| [[wiki/entities/dashboard-page]]              | Page              | Main bug triage workspace                |
| [[wiki/entities/dashboard-header]]            | Page header       | Fetch/Categorize actions                 |
| [[wiki/entities/kpi-cards]]                   | Dashboard widget  | KPI summary strip                        |
| [[wiki/entities/filter-bar]]                  | Dashboard widget  | Search, filters, grouping                |
| [[wiki/entities/multi-select-component]]      | UI primitive      | Custom searchable multi-select           |
| [[wiki/entities/bug-table]]                   | Data grid         | Sortable flat list view                  |
| [[wiki/entities/bug-card]]                    | Dashboard widget  | Card renderer for grouped bugs           |
| [[wiki/entities/group-accordion]]             | Dashboard widget  | Collapsible grouped sections             |
| [[wiki/entities/bug-detail-drawer]]           | Shared widget     | Bug inspection drawer                    |
| [[wiki/entities/ai-cluster-category-section]] | AI Cluster widget | Collapsible category result section      |
| [[wiki/entities/similarity-group-card]]       | AI Cluster widget | Score/reason/bug-list card               |
| [[wiki/entities/use-dashboard-hook]]          | Hook              | Session-backed dashboard state           |
| [[wiki/entities/use-ai-cluster-hook]]         | Hook              | Session-backed similarity state          |
| [[wiki/entities/use-bug-drawer-hook]]         | Hook              | Shared selected-bug state and navigation |
| [[wiki/entities/dashboard-utils]]             | Library           | Pure filter/sort/group helpers           |
| [[wiki/entities/date-format-utility]]         | Library           | Shared Italian date formatting           |
| [[wiki/entities/settings-page]]               | Page              | Full settings page                       |
| [[wiki/entities/ado-connection-section]]      | Settings section  | ADO connection card                      |
| [[wiki/entities/llm-provider-section]]        | Settings section  | LLM provider card                        |
| [[wiki/entities/categories-section]]          | Settings section  | Categories editor card                   |
| [[wiki/entities/use-settings-hook]]           | Hook              | Settings state management                |
| [[wiki/entities/validation-utils]]            | Library           | Pure validation functions                |

## Dashboard Surface

- `DashboardPage` is the implemented index route and main operator workspace.
- `useDashboard` hydrates renderer state from `SessionData`, wires `fetchBugs()` and `categorizeBugs()`, and subscribes to `ChunkProgress` updates.
- View composition: `DashboardHeader` -> tabs -> (`KpiCards` + `FilterBar` + `BugTable`) or grouped `GroupAccordion` + `BugCard`, or the embedded FT-10 similarity workspace.
- Shared derivation logic lives in [[wiki/entities/dashboard-utils]] and presentation color mapping lives in [[wiki/entities/badge-color-utilities]].
- [[wiki/entities/dashboard-header]] formats session freshness timestamps through [[wiki/entities/date-format-utility]] instead of embedding locale logic inline.

## AI Cluster Surface

- The FT-10 similarity workflow is now embedded in the dashboard `Similarità` tab instead of a dedicated route.
- [[wiki/entities/use-ai-cluster-hook]] hydrates persisted `similarityResults`, subscribes to per-category progress, and flags stale results when categorization is newer than the last analysis.
- The results view uses [[wiki/entities/ai-cluster-category-section]] and [[wiki/entities/similarity-group-card]], then reuses [[wiki/entities/use-bug-drawer-hook]] and [[wiki/entities/bug-detail-drawer]] for bug inspection.

## Settings Surface

- [[wiki/entities/settings-page]] remains the `/settings` route and includes a destructive session-reset danger zone.
- The reset flow is guarded by [[wiki/entities/confirm-dialog]], which provides focus management and explicit confirm/cancel behavior.
- Form state, validation, and connection tests still live in [[wiki/entities/use-settings-hook]].

## Styling Stack

See [[wiki/concepts/tailwind-styling]] for full details.

- **Tailwind CSS v3** - utility-first CSS
- **@fontsource/inter** - self-hosted Inter font (400, 500, 600, 700)
- **class-variance-authority** - component variant management
- **clsx + tailwind-merge** - `cn()` utility for conditional classes

## Entry Points

- `src/renderer/index.html` - HTML with CSP meta tag
- `src/renderer/src/main.tsx` - ReactDOM.createRoot with StrictMode
- `src/renderer/src/App.tsx` - Router and route definitions

## See also

- [[wiki/topics/electron-architecture]]
- [[wiki/concepts/tailwind-styling]]
- [[wiki/topics/dashboard-bug-exploration]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
- [[wiki/topics/session-persistence-lifecycle]]
