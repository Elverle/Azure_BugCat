---
title: 'Similarity Group Card'
type: entity
subtype: component
created: 2026-05-01
updated: 2026-05-01
sources: ['[[wiki/sources/ft-10-ai-cluster-similarity]]']
tags: [react, component, similarity, ai-cluster]
lang: en
---

## Description

Presentation component for a single similarity group returned by the LLM. It renders a score badge, a dedicated `Motivazione` panel explaining the match, and a clickable bug list that opens the shared detail drawer.

## Location

`src/renderer/src/components/ai-cluster/SimilarityGroupCard.tsx`

## Props

| Prop         | Type               | Purpose                                         |
| ------------ | ------------------ | ----------------------------------------------- |
| `group`      | `SimilarityGroup`  | Score, reason, and bug ID list                  |
| `bugs`       | `CategorizedBug[]` | Full session list used to resolve bug titles    |
| `onBugClick` | `(bugId) => void`  | Opens the parent page drawer for a selected bug |

## Score Semantics

| Range    | Visual Treatment | Label        |
| -------- | ---------------- | ------------ |
| `>= 0.9` | Green badge      | `Molto alta` |
| `>= 0.7` | Yellow badge     | `Alta`       |
| `< 0.7`  | Orange badge     | `Media`      |

## Key Behaviors

- Converts the normalized `0..1` similarity score into a percentage badge.
- Resolves bug titles from the session bug list through an in-memory `Map` built from `bugs`.
- Uses a two-column layout on larger screens so the bug list and the motivation remain visible together.
- Preserves visibility even when referenced bugs are missing by rendering `(bug non trovato)` instead of dropping the row.

## Dependencies

- [[wiki/entities/shared-types]]

## See also

- [[wiki/entities/ai-cluster-category-section]]
- [[wiki/entities/bug-detail-drawer]]
