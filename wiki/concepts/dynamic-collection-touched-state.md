---
title: 'Dynamic Collection Touched State'
type: concept
created: 2026-05-17
updated: 2026-05-17
sources: ['[[wiki/sources/ft-14a-agent-configuration-project-registry]]']
tags: [validation, react, settings, pattern, collections]
lang: en
---

## Definition

FT-14A extends the existing Settings touched/error model so it can handle dynamic collections without showing every validation error as soon as a new item is created. Each project-row field gets its own synthetic touched key.

## Key Format

```text
project-{index}-name
project-{index}-path
project-{index}-description
project-{index}-keywords
```

## How It Works in This Project

- [[wiki/entities/validation-utils]] emits project-row errors under synthetic keys like `project-0-path`.
- [[wiki/entities/use-settings-hook]] marks only the updated fields as touched when `updateProject(id, updates)` runs.
- Adding a project marks the collection as dirty but does not touch every row field immediately.
- Saving marks all current project-field keys as touched so blocking errors become visible before persistence.
- [[wiki/entities/project-registry-section]] shows each error only when the exact matching touched key is true.

## Why It Matters Here

- Blank project rows are an expected starting state, not an immediate failure state.
- Operators see only the errors caused by the field they just changed, which keeps the registry form usable even as rows grow.
- The pattern fits the existing flat `Record<string, boolean>` touched map without introducing nested form-state libraries.

## Trade-offs

- **Pro:** Minimal extension of the existing validation architecture.
- **Pro:** Precise field-level visibility for dynamic rows.
- **Con:** Keys are index-based, so row reordering would require remapping touched/error keys. FT-14A avoids that issue by supporting add/remove but not reorder.

## See also

- [[wiki/entities/project-registry-section]]
- [[wiki/entities/use-settings-hook]]
- [[wiki/entities/validation-utils]]
