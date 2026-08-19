---
title: 'LLM Service'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-08-18
sources:
  [
    '[[wiki/sources/ft-04-llm-provider]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-09-structured-output]]',
    '[[wiki/sources/ft-10-ai-cluster-similarity]]',
    '[[wiki/sources/ft-11-openrouter-provider]]',
    '[[wiki/analyses/llm-provider-cleanup]]',
    '[[wiki/analyses/cancel-categorization-flow]]'
  ]
tags: [llm, main-process, categorization, orchestration, retry]
lang: en
---

## Description

Top-level orchestration service for LLM-based bug categorization. Coordinates provider instantiation, prompt building, chunking, retry logic, schema-aware provider calls, response validation, and progressive result delivery. FT-10 also reuses its exported retry helper from the dedicated similarity service.

## Location

`src/main/llm/llm-service.ts`

## Public API

| Function            | Signature                                                            | Purpose                                                                                  |
| ------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `categorizeBugs`    | `(settings, bugs, onProgress?, signal?) → Promise<CategorizedBug[]>` | Process all bugs through LLM in chunks with progress callbacks and optional cancellation |
| `testLLMConnection` | `(settings) → Promise<void>`                                         | Verify LLM provider credentials work                                                     |

## Shared Helper Export

| Function        | Signature                                                           | Purpose                                                                        |
| --------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `chatWithRetry` | `(provider, systemPrompt, userMessage, options?) → Promise<string>` | Shared rate-limit retry wrapper reused by [[wiki/entities/similarity-service]] |

## Internal Functions

| Function                 | Purpose                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `applyCategorization`    | Merges `LLMCategorizeResult[]` into `CategorizedBug[]` using a Map lookup by `bugId` |
| `sleep`                  | Promise-based delay utility                                                          |
| `sleepWithAbort`         | Delay utility that exits early when the run is cancelled                             |
| `buildCancellationError` | Creates the shared `OPERATION_CANCELLED` AppError payload                            |
| `throwIfCancelled`       | Guard used before retries and chunk execution                                        |
| `buildErrorDiagnostics`  | Normalizes unexpected provider failures for structured logging                       |
| `buildChunkDiagnostics`  | Captures provider/chunk context for chunk-level logs                                 |

## Behavior

1. Creates provider via `createLLMProvider(settings.llmProvider, { apiKey, baseUrl, model, timeout })`.
2. Builds system prompt from `settings.categories`.
3. Splits bugs into chunks of `settings.chunkSize`.
4. For each chunk:

- Stops immediately if the optional workflow `signal` has already been aborted.
- Builds a user message with id, title, description, and tags.
- Calls the provider through `chatWithRetry(..., { responseSchema: 'categorization', signal })`.
- Validates and parses the raw response.
- On cancellation, aborts the run without persisting or emitting fallback chunk labels.
- On non-blocking chunk failure, marks that chunk with the `UNCATEGORIZED` / `PROCESSING_ERROR` sentinels from [[wiki/entities/categorization-sentinels]] and continues.
- Invokes `onProgress` with the categorized chunk.

5. Returns the merged `CategorizedBug[]`. `applyCategorization()` stamps a fresh `categorizedAt` timestamp only on bugs whose `macroCategory` is **not** the `UNCATEGORIZED` sentinel; `isFailedCategorization(macroCategory)` is what makes that call, and a failed bug's `categorizedAt` is left `''` instead. This is what keeps a chunk failure retry-eligible on the next categorization run rather than persisting the fallback as if it were a real result.

## Error Handling

- [[wiki/entities/llm-error-policy]] defines which failures are blocking across LLM workflows.
- `LLM_AUTH_ERROR` and `LLM_TIMEOUT` -> re-thrown immediately and abort the whole categorization run.
- `OPERATION_CANCELLED` -> re-thrown immediately and treated as an intentional stop, not a provider failure.
- `LLM_PARSE_ERROR` with `details.reason === 'structured-output-routing-mismatch'` -> also re-thrown immediately, because continuing with fallback chunk labels would hide a provider/model compatibility problem from the user.
- `LLM_RATE_LIMIT` -> retried with exponential backoff.
- Other chunk errors -> graceful degradation with fallback categories.
- Abort-like provider errors are normalized either to `OPERATION_CANCELLED` or `LLM_TIMEOUT`, depending on whether the workflow signal was aborted or the provider budget elapsed.

## Cancellation Notes

- Cancellation is cooperative: the same `AbortSignal` is checked in retry waits, before each new chunk, and inside each provider request.
- The service still applies categorizations only after full completion; the main process keeps persistence all-or-nothing by saving `SessionData` only after `categorizeBugs()` resolves successfully.

## FT-11 Notes

- OpenRouter introduced a new category of blocking parse failure: the request itself is valid, but provider/model routing can downgrade `json_schema` structured output and make the upstream response unusable.
- The service now treats that parse error as a run-level stop condition instead of a per-chunk degradation path.

## FT-09 Notes

- The service now specifies output intent once through `ChatOptions.responseSchema` instead of embedding provider-specific JSON Schema parameters.
- Structured output reduces parse risk, but `validateLLMResponse()` remains mandatory because providers can still return incomplete or empty payloads.
- FT-09 does not change chunking or retry semantics; it hardens the provider call boundary.

## FT-10 Notes

- `chatWithRetry()` is now a shared LLM transport primitive, not only a categorization detail.
- The dedicated [[wiki/entities/similarity-service]] reuses the same provider selection and retry behavior, but swaps chunking for macro-category iteration and swaps `categorization` for the `similar-bugs` response schema.

## Dependencies

- [[wiki/entities/llm-provider-factory]] - `createLLMProvider`
- [[wiki/entities/llm-prompts]] - `buildSystemPrompt`, `buildUserMessage`
- [[wiki/entities/chunking-utility]] - `splitIntoChunks`
- [[wiki/entities/llm-error-policy]] - shared blocking error classification
- [[wiki/entities/response-validator]] - `validateLLMResponse`
- [[wiki/entities/categorization-sentinels]] - `UNCATEGORIZED`, `PROCESSING_ERROR`, `NOT_AVAILABLE`, `NO_LLM_RESPONSE`, `isFailedCategorization`

## See also

- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/similarity-service]]
- [[wiki/entities/llm-error-policy]]
- [[wiki/entities/categorization-sentinels]]
- [[wiki/concepts/sentinel-value-label-separation]]
- [[wiki/concepts/chunk-retry-pattern]]
- [[wiki/concepts/provider-native-structured-output]]
- [[wiki/topics/llm-categorization-pipeline]]
