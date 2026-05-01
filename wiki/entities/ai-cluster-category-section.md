---
title: 'AI Cluster Category Section'
type: entity
subtype: component
created: 2026-05-01
updated: 2026-05-01
sources: ['[[wiki/sources/ft-10-ai-cluster-similarity]]']
tags: [react, component, ai-cluster, accordion]
lang: en
---

## Description

Collapsible per-category result container used by the dashboard `Similarità` tab. It owns local expand/collapse state and renders either an error banner, an empty-state message, or a list of similarity group cards.

## Location

`src/renderer/src/components/ai-cluster/CategorySection.tsx`

## Props

| Prop         | Type                | Purpose                                             |
| ------------ | ------------------- | --------------------------------------------------- |
| `category`   | `string`            | Macro-category label                                |
| `groups`     | `SimilarityGroup[]` | Similarity groups returned for that category        |
| `bugs`       | `CategorizedBug[]`  | Full bug list used by child cards to resolve titles |
| `error`      | `string?`           | Category-local analysis failure message             |
| `onBugClick` | `(bugId) => void`   | Opens the shared bug drawer for the selected bug    |

## Key Behaviors

- Starts expanded by default to prioritize scanability after analysis completes.
- Shows a group-count badge when the category completed successfully.
- Replaces the badge with an inline error indicator when that category failed.
- Uses the same card wrapper regardless of result state, so all categories remain visible even with partial failures.

## Dependencies

- [[wiki/entities/similarity-group-card]]
- [[wiki/entities/shared-types]]

## See also

- [[wiki/entities/dashboard-page]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
