---
title: 'Categorization Sentinels'
type: entity
subtype: library
created: 2026-08-18
updated: 2026-08-18
sources: []
tags: [categorization, sentinel, shared, machine-values]
lang: en
---

## Description

Shared module of machine-value constants for the states a bug's categorization can be in when no real LLM-provided value applies: not yet categorized, categorized with an error, or filtered as having no assignee. These are never shown to the user as-is — [[wiki/entities/labels-utility]]'s `sentinelLabel()` is the single place that turns them into display text.

## Location

`src/shared/categorization.ts`

## Exports

| Constant             | Value                    | Meaning                                                                 |
| --------------------- | -------------------------- | -------------------------------------------------------------------------- |
| `UNCATEGORIZED`       | `'__uncategorized__'`      | No usable `macroCategory` — the LLM never produced one for this bug      |
| `PROCESSING_ERROR`    | `'__processing_error__'`   | A chunk failed with a non-blocking provider error                        |
| `NO_LLM_RESPONSE`     | `'__no_llm_response__'`    | The bug was absent from an otherwise-valid LLM response                  |
| `NOT_AVAILABLE`       | `'__not_available__'`      | Generic "no value" fallback for `categoryReason` and blank string fields |
| `PARSE_ERROR`         | `'__parse_error__'`        | The raw LLM response could not be parsed as JSON, or lacked a results array |
| `UNASSIGNED`          | `'__unassigned__'`         | Stand-in key for bugs with no assignee, in filters and grouping          |

```typescript
export function isFailedCategorization(macroCategory: string): boolean {
  return macroCategory === UNCATEGORIZED
}
```

## Design Notes

- Every sentinel is shaped `__name__`. That shape cannot collide with a category a user types into the Settings categories textarea, and a code path that forgets to run a value through `sentinelLabel()` renders the literal `__uncategorized__` on screen — visibly broken — instead of silently showing something plausible-looking.
- `UNASSIGNED` is never persisted: it is computed at render/filter time from a `null` `bug.assignee`, so it has no entry in [[wiki/entities/store-migration]].
- A categorization result whose `macroCategory` is `UNCATEGORIZED` is understood to come from a fallback path (chunk failure or a bug missing from the LLM response), never from the LLM itself — the system prompt forbids the model from returning it. `isFailedCategorization()` is the single predicate that encodes that rule.
- The main process (`response-validator.ts`, `llm-service.ts`, `similarity-service.ts`) writes and compares these constants directly; it never resolves them to a label. Only the renderer, through [[wiki/entities/labels-utility]], does that translation.

## Used By

- [[wiki/entities/response-validator]] - fallback `macroCategory` / `technicalLayer` / `categoryReason` values
- [[wiki/entities/llm-service]] - per-chunk failure fallback, and `isFailedCategorization()` to decide whether `categorizedAt` gets stamped
- [[wiki/entities/similarity-service]] - excludes bugs whose `macroCategory` is `UNCATEGORIZED` from similarity analysis
- [[wiki/entities/dashboard-utils]] - `UNCATEGORIZED` / `UNASSIGNED` as filter and group-by fallback keys
- [[wiki/entities/closed-bug-kpis-utility]] - `UNCATEGORIZED` as the historical category-distribution fallback key
- [[wiki/entities/use-ai-cluster-hook]] - checks whether any bug has a `macroCategory` other than `UNCATEGORIZED` before allowing similarity analysis
- [[wiki/entities/labels-utility]] - the keys of `sentinelLabel()`'s lookup table

## See also

- [[wiki/entities/labels-utility]]
- [[wiki/concepts/sentinel-value-label-separation]]
- [[wiki/entities/store-migration]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/topics/llm-categorization-pipeline]]
