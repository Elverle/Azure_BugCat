---
title: 'Labels Utility'
type: entity
subtype: library
created: 2026-08-18
updated: 2026-08-18
sources: []
tags: [renderer, labels, i18n, error-handling, categorization]
lang: en
---

## Description

The renderer's single presentation layer for machine values: turns the sentinels defined in [[wiki/entities/categorization-sentinels]] into display text, and turns an `ErrorCode` into a human-readable dialog title. The main process never imports this module — it writes and reasons about machine values only, so a future localization pass would mean translating this one file instead of touching the store or migrating persisted data a second time.

## Location

`src/renderer/src/lib/labels.ts`

## Public API

```typescript
function sentinelLabel(value: string): string
function errorLabel(code: ErrorCode): string
```

## Behavior

- `sentinelLabel()` looks `value` up in a `Record<string, string>` keyed by the six [[wiki/entities/categorization-sentinels]] constants (`UNCATEGORIZED` -> `'Uncategorized'`, `PROCESSING_ERROR` -> `'Processing error'`, `NO_LLM_RESPONSE` -> `'No LLM response'`, `NOT_AVAILABLE` -> `'N/A'`, `PARSE_ERROR` -> `'Parse error'`, `UNASSIGNED` -> `'Unassigned'`). It is **total by design**: anything that is not one of those six keys — a user's own category, a technical layer value (`FE`, `BE`, `FE/BE`, `Undetermined`), the model's free-form `categoryReason` — comes back unchanged. Call sites never test whether a value is a sentinel before calling it; they just always call it.
- `errorLabel()` looks `code` up in `ERROR_LABELS`, typed `Record<ErrorCode, string>`. Because the type is a `Record` over the full `ErrorCode` union (mirroring the `Record<ErrorCode, true>` exhaustiveness trick in `shared/app-error.ts`'s `ERROR_CODE_TABLE`), adding a member to `ErrorCode` without giving it a title here is a compile error, not a runtime gap.
- The title an error dialog shows comes from `errorLabel(code)`; the message the main process produced for that `AppError` stays underneath as diagnostic detail instead of being the only thing the user reads.

## Used By

- [[wiki/entities/bug-table]], [[wiki/entities/bug-card]], [[wiki/entities/bug-detail-drawer]], [[wiki/entities/filter-bar]], [[wiki/entities/group-accordion]] - render `macroCategory` / `technicalLayer` / assignee values through `sentinelLabel()`
- [[wiki/entities/dashboard-page]] - `errorLabel()` for the fetch/categorize/similarity error modal titles; `sentinelLabel()` for AI Cluster category headings
- [[wiki/entities/closed-bugs-page]] - renders historical category distribution labels through `sentinelLabel()`

## See also

- [[wiki/entities/categorization-sentinels]]
- [[wiki/concepts/sentinel-value-label-separation]]
- [[wiki/entities/shared-types]] - `ErrorCode`
- [[wiki/topics/dashboard-bug-exploration]]
