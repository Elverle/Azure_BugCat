---
title: 'Dashboard Bug Exploration'
type: topic
created: 2026-04-30
updated: 2026-05-01
sources: ['[[wiki/sources/ft-05-dashboard]]', '[[wiki/sources/ft-06-bug-detail-drawer]]']
tags: [dashboard, triage, renderer, filters, grouping, drawer]
lang: en
---

## Overview

The dashboard is the main triage workspace of the app. It consumes the cached `SessionData` produced by FT-03 and FT-04, then gives operators a fast way to inspect bug volume, narrow the dataset, switch between list, cluster-oriented, and similarity-analysis views, drill into one bug with a persistent side drawer, and rerun categorization from the same screen.

## End-to-End Flow

```
DashboardHeader actions
  → useDashboard
    → preload bridge
      → FT-03 fetchBugs / FT-04 categorizeBugs
        → SessionData + ChunkProgress
  → DashboardPage derivation pipeline
    → filterBugs → sortBugs → useBugDrawer(sortedBugs)
    → KpiCards / FilterBar / BugTable / BugCard / GroupAccordion
    → BugDetailDrawer
      → window.electronAPI.openExternal(url)
        → [[wiki/entities/open-external-ipc]]
```

## Views

### Lista Completa

- Uses [[wiki/entities/bug-table]] for a flat, sortable, 8-column view.
- Best for scanning IDs, assignees, area paths, and priorities across the whole result set.

### AI Clusters

- Defaults to `macroCategory` grouping and expands groups automatically.
- Uses [[wiki/entities/group-accordion]] plus [[wiki/entities/bug-card]] to emphasize cluster structure and category similarity.
- Can also switch grouping to sub-category or assignee.

### Similarità

- Reuses [[wiki/entities/use-ai-cluster-hook]] to load persisted similarity results and trigger new analysis runs.
- Shows a guided state before categorization, progress while `llm:find-similar` is running, and category-level result sections afterwards.
- Uses [[wiki/entities/ai-cluster-category-section]] and [[wiki/entities/similarity-group-card]] to show grouped matches, including a dedicated `Motivazione` panel for each similarity group.

## Interaction Model

- Session hydration and action state come from [[wiki/entities/use-dashboard-hook]].
- Search, multi-select filters, grouping, and reset live in [[wiki/entities/filter-bar]].
- Derivation rules are centralized in [[wiki/entities/dashboard-utils]] and summarized in [[wiki/concepts/dashboard-derivation-pipeline]].
- Visual encoding of statuses and categories comes from [[wiki/entities/badge-color-utilities]].
- Clicking a row in [[wiki/entities/bug-table]] or a card in [[wiki/entities/bug-card]] opens [[wiki/entities/bug-detail-drawer]] for the currently visible bug.
- [[wiki/entities/use-bug-drawer-hook]] keeps previous/next navigation aligned with the active filtered and sorted list, and closes the drawer if the selected bug disappears from that list.
- The drawer's click-outside close behavior follows [[wiki/concepts/click-outside-exclusion-pattern]].
- Accessibility behavior for listbox, drill-down controls, table sorting, and accordions follows [[wiki/concepts/accessible-collection-controls]].
- The external work item action delegates to [[wiki/entities/open-external-ipc]] instead of opening browser URLs directly from the renderer.

## Related Components

- [[wiki/entities/dashboard-page]]
- [[wiki/entities/dashboard-header]]
- [[wiki/entities/kpi-cards]]
- [[wiki/entities/filter-bar]]
- [[wiki/entities/bug-table]]
- [[wiki/entities/bug-card]]
- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/group-accordion]]
- [[wiki/entities/use-bug-drawer-hook]]
- [[wiki/entities/use-ai-cluster-hook]]
- [[wiki/entities/ai-cluster-category-section]]
- [[wiki/entities/similarity-group-card]]

## See also

- [[wiki/topics/renderer-ui]]
- [[wiki/topics/llm-categorization-pipeline]]
- [[wiki/concepts/dashboard-derivation-pipeline]]
- [[wiki/concepts/click-outside-exclusion-pattern]]
