---
title: 'Dashboard Bug Exploration'
type: topic
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-05-dashboard]]']
tags: [dashboard, triage, renderer, filters, grouping]
lang: en
---

## Overview

The dashboard is the main triage workspace of the app. It consumes the cached `SessionData` produced by FT-03 and FT-04, then gives operators a fast way to inspect bug volume, narrow the dataset, switch between list and cluster-oriented views, and rerun categorization from the same screen.

## End-to-End Flow

```
DashboardHeader actions
  → useDashboard
    → preload bridge
      → FT-03 fetchBugs / FT-04 categorizeBugs
        → SessionData + ChunkProgress
  → DashboardPage derivation pipeline
    → KpiCards / FilterBar / BugTable / BugCard / GroupAccordion
```

## Views

### Lista Completa

- Uses [[wiki/entities/bug-table]] for a flat, sortable, 8-column view.
- Best for scanning IDs, assignees, area paths, and priorities across the whole result set.

### AI Clusters

- Defaults to `macroCategory` grouping and expands groups automatically.
- Uses [[wiki/entities/group-accordion]] plus [[wiki/entities/bug-card]] to emphasize cluster structure and category similarity.
- Can also switch grouping to sub-category or assignee.

## Interaction Model

- Session hydration and action state come from [[wiki/entities/use-dashboard-hook]].
- Search, multi-select filters, grouping, and reset live in [[wiki/entities/filter-bar]].
- Derivation rules are centralized in [[wiki/entities/dashboard-utils]] and summarized in [[wiki/concepts/dashboard-derivation-pipeline]].
- Visual encoding of statuses and categories comes from [[wiki/entities/badge-color-utilities]].
- Accessibility behavior for listbox, table sorting, and accordions follows [[wiki/concepts/accessible-collection-controls]].

## Related Components

- [[wiki/entities/dashboard-page]]
- [[wiki/entities/dashboard-header]]
- [[wiki/entities/kpi-cards]]
- [[wiki/entities/filter-bar]]
- [[wiki/entities/bug-table]]
- [[wiki/entities/bug-card]]
- [[wiki/entities/group-accordion]]

## See also

- [[wiki/topics/renderer-ui]]
- [[wiki/topics/llm-categorization-pipeline]]
- [[wiki/concepts/dashboard-derivation-pipeline]]
