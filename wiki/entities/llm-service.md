---
title: 'LLM Service'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-05-03
sources:
  [
    '[[wiki/sources/ft-04-llm-provider]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-09-structured-output]]',
    '[[wiki/sources/ft-10-ai-cluster-similarity]]',
    '[[wiki/sources/ft-11-openrouter-provider]]',
    '[[wiki/analyses/llm-provider-cleanup]]'
  ]
tags: [llm, main-process, categorization, orchestration, retry]
lang: en
---

## Description

Top-level orchestration service for LLM-based bug categorization. Coordinates provider instantiation, prompt building, chunking, retry logic, schema-aware provider calls, response validation, and progressive result delivery. FT-10 also reuses its exported retry helper from the dedicated similarity service.

## Location

`src/main/llm/llm-service.ts`

## Public API

| Function            | Signature                                                   | Purpose                                                        |
| ------------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| `categorizeBugs`    | `(settings, bugs, onProgress?) → Promise<CategorizedBug[]>` | Process all bugs through LLM in chunks with progress callbacks |
| `testLLMConnection` | `(settings) → Promise<void>`                                | Verify LLM provider credentials work                           |

## Shared Helper Export

| Function        | Signature                                                           | Purpose                                                                        |
| --------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `chatWithRetry` | `(provider, systemPrompt, userMessage, options?) → Promise<string>` | Shared rate-limit retry wrapper reused by [[wiki/entities/similarity-service]] |

## Internal Functions

| Function                | Purpose                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `applyCategorization`   | Merges `LLMCategorizeResult[]` into `CategorizedBug[]` using a Map lookup by `bugId` |
| `sleep`                 | Promise-based delay utility                                                          |
| `buildErrorDiagnostics` | Normalizes unexpected provider failures for structured logging                       |
| `buildChunkDiagnostics` | Captures provider/chunk context for chunk-level logs                                 |

## Behavior

1. Creates provider via `createLLMProvider(settings.llmProvider, { apiKey, baseUrl, model, timeout })`.
2. Builds system prompt from `settings.categories`.
3. Splits bugs into chunks of `settings.chunkSize`.
4. For each chunk:
   - Builds a user message with id, title, description, and tags.
   - Calls the provider through `chatWithRetry(..., { responseSchema: 'categorization' })`.
   - Validates and parses the raw response.
   - On non-blocking chunk failure, marks that chunk as `Non categorizzato` and continues.
   - Invokes `onProgress` with the categorized chunk.
5. Returns the merged `CategorizedBug[]` with a fresh `categorizedAt` timestamp.

## Error Handling

- [[wiki/entities/llm-error-policy]] defines which failures are blocking across LLM workflows.
- `LLM_AUTH_ERROR` and `LLM_TIMEOUT` -> re-thrown immediately and abort the whole categorization run.
- `LLM_PARSE_ERROR` with `details.reason === 'structured-output-routing-mismatch'` -> also re-thrown immediately, because continuing with fallback chunk labels would hide a provider/model compatibility problem from the user.
- `LLM_RATE_LIMIT` -> retried with exponential backoff.
- Other chunk errors -> graceful degradation with fallback categories.
- Abort-like provider errors are normalized to `LLM_TIMEOUT` diagnostics.

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

## See also

- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/similarity-service]]
- [[wiki/entities/llm-error-policy]]
- [[wiki/concepts/chunk-retry-pattern]]
- [[wiki/concepts/provider-native-structured-output]]
- [[wiki/topics/llm-categorization-pipeline]]
