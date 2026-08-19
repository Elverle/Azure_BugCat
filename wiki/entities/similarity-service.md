---
title: 'Similarity Service'
type: entity
subtype: service
created: 2026-05-01
updated: 2026-08-19
sources: ['[[wiki/sources/ft-10-ai-cluster-similarity]]', '[[wiki/analyses/llm-provider-cleanup]]']
tags: [llm, similarity, main-process, orchestration]
lang: en
---

## Description

Main-process orchestrator for the AI Cluster feature. It groups categorized bugs by `macroCategory`, calls the LLM once per eligible category, validates the returned similarity groups, emits per-category progress, and returns a session-storable aggregate result.

## Location

`src/main/llm/similarity-service.ts`

## Public API

| Function          | Signature                                                    | Purpose                                                                     |
| ----------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `findSimilarBugs` | `(settings, bugs, onProgress?) -> Promise<SimilarityResult>` | Analyze already-categorized bugs and group similar ones per `macroCategory` |

## Behavior

1. Creates an `LLMProvider` using the same settings path as categorization.
2. Filters out bugs without a meaningful `macroCategory` or carrying the `UNCATEGORIZED` sentinel. The comparison reads the shared constant, so it survived the sentinel value change untouched — see [[wiki/entities/categorization-sentinels]].
3. Groups remaining bugs by `macroCategory` and keeps only groups with at least 2 bugs.
4. For each eligible category, builds the similar-bugs system prompt and category-scoped user payload.
5. Reuses `chatWithRetry(..., { responseSchema: 'similar-bugs' })` so similarity runs inherit the same rate-limit retry semantics as categorization.
6. Parses the response into `SimilarityGroup[]` through the shared [[wiki/entities/llm-json-utilities]] parser and stores category-local errors only for non-blocking failures.
7. Emits `SimilarityProgress { total, completed, currentGroup }` after each category finishes.
8. Returns `{ categories, analyzedAt }` for session persistence.

## Response Validation

The service keeps category-specific shape validation, but it no longer owns a separate raw JSON parser. It now reuses [[wiki/entities/llm-json-utilities]] to:

- strip markdown fences when providers still wrap JSON in code blocks,
- recover the first valid JSON payload when the model adds prose around it,
- treats missing `groups` arrays as an empty result instead of a hard failure,
- accepts only groups with `0 <= similarityScore <= 1`, string `reason`, and at least two numeric `bugIds`.

## Failure Model

- [[wiki/entities/llm-error-policy]] is applied before category-local fallback.
- Blocking auth, timeout, and structured-output routing mismatch errors are re-thrown and abort the whole similarity run.
- Other category-level parse/provider errors become `CategorySimilarityResult.error`.
- Successful categories in the same run are preserved.
- Categories with fewer than 2 bugs are skipped entirely and do not produce progress entries.
- Processing is sequential by design to reduce rate-limit pressure across providers.

## Dependencies

- [[wiki/entities/llm-provider-factory]] - provider creation
- [[wiki/entities/llm-prompts]] - similar-bug prompt builders
- [[wiki/entities/llm-service]] - shared `chatWithRetry()` helper
- [[wiki/entities/llm-error-policy]] - shared blocking error classification
- [[wiki/entities/llm-json-utilities]] - tolerant JSON parsing shared with categorization
- [[wiki/entities/llm-schemas]] - schema contract consumed by provider adapters

## See also

- [[wiki/concepts/macro-category-scoped-similarity-analysis]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
- [[wiki/topics/llm-categorization-pipeline]]
