---
title: 'Catalog Merge Utility'
type: entity
subtype: service
created: 2026-05-13
updated: 2026-05-13
sources: ['[[wiki/sources/ft-12-incremental-session-cache]]']
tags: [catalog, session, merge, utility, llm, similarity]
lang: en
---

## Description

Pure main-process utility module that centralizes all FT-12 catalog bookkeeping. It computes stable categorization signatures, merges fresh ADO fetches into the historical catalog, merges successful LLM results back into both session and catalog state, and records similarity-history metadata after AI Cluster analysis.

## Location

`src/main/utils/catalog-merge.ts`

## Public API

```typescript
export interface MergeResult {
  updatedCatalog: BugCatalog
  sessionBugs: CategorizedBug[]
}

export function computeInputSignature(bug: BugItem): string

export function mergeFetchIntoCatalog(
  fetchedBugs: BugItem[],
  existingCatalog: BugCatalog | null,
  now: string
): MergeResult

export function mergeCategorization(
  sessionBugs: CategorizedBug[],
  llmResults: CategorizedBug[],
  catalog: BugCatalog,
  now: string
): { updatedSessionBugs: CategorizedBug[]; updatedCatalog: BugCatalog }

export function updateCatalogSimilarityMetadata(
  catalog: BugCatalog,
  similarityResult: SimilarityResult
): BugCatalog
```

## Behavior

### `computeInputSignature()`

- Normalizes `title`, `description`, and `areaPath` to trimmed lowercase strings.
- Sorts tags before joining them, so tag order does not affect the signature.
- Includes only categorization-relevant fields: `title`, `description`, `tags`, `priority`, and `areaPath`.
- Hashes the normalized payload with SHA-256 and truncates the hex digest to 16 characters for compact persistence.

### `mergeFetchIntoCatalog()`

- Builds or clones the current `BugCatalog` and tracks the set of fetched IDs.
- Reuses historical categorization for fetched bugs whose persisted `inputSignature` still matches and whose `categorizedAt` is present.
- Resets categorization fields for new bugs or for known bugs whose relevant inputs changed.
- Updates lifecycle metadata: `firstSeenAt`, `lastSeenAt`, and `closedAt`.
- Returns both the updated catalog and the renderer-facing `sessionBugs` snapshot, which always contains only currently fetched open bugs.

### `mergeCategorization()`

- Maps successful LLM results by bug ID.
- Updates only the processed subset inside the full `sessionBugs` array.
- Applies the same category fields and timestamp to matching `CatalogBug` entries.
- Recomputes `inputSignature` from the current catalog entry so the catalog reflects the exact inputs that produced the saved categorization.

### `updateCatalogSimilarityMetadata()`

- Walks every category and group in a `SimilarityResult`.
- Marks matched catalog bugs with `everInSimilarityGroup = true`.
- Sets `lastSimilarityGroupAt` to `similarityResult.analyzedAt` for every bug that appears in at least one similarity group.

## Why This Utility Exists

- Keeps `src/main/ipc-handlers.ts` focused on orchestration instead of embedding state-transition rules inline.
- Makes the FT-12 persistence behavior testable as a pure module, independent of Electron IPC.
- Encodes the authoritative rules for when categorization can be reused versus invalidated.

## Validation

- `tests/main/catalog-merge.spec.ts` exercises deterministic signature generation, mixed fetch scenarios, selective categorization merge behavior, and similarity metadata updates.

## See also

- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/shared-types]]
- [[wiki/concepts/catalog-backed-selective-re-categorization]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
