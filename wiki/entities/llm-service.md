---
title: 'LLM Service'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-05-01
sources: ['[[wiki/sources/ft-04-llm-provider]]', '[[wiki/sources/ft-08-generic-provider]]']
tags: [llm, main-process, categorization, orchestration]
lang: en
---

## Description

Top-level orchestration service for LLM-based bug categorization. Coordinates provider instantiation, prompt building, chunking, retry logic, response validation, and progressive result delivery.

## Location

`src/main/llm/llm-service.ts`

## Public API

| Function            | Signature                                                   | Purpose                                                        |
| ------------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| `categorizeBugs`    | `(settings, bugs, onProgress?) → Promise<CategorizedBug[]>` | Process all bugs through LLM in chunks with progress callbacks |
| `testLLMConnection` | `(settings) → Promise<void>`                                | Verify LLM provider credentials work                           |

## Internal Functions

| Function              | Purpose                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `chatWithRetry`       | Wraps `provider.chat()` with up to 3 retries on rate-limit, exponential backoff `[2s, 4s, 8s]` |
| `applyCategorization` | Merges `LLMCategorizeResult[]` into `CategorizedBug[]` using a Map lookup by bugId             |
| `sleep`               | Promise-based delay utility                                                                    |

## Behavior

1. Creates provider via `createLLMProvider(settings.llmProvider, { apiKey, baseUrl, model, timeout })`
2. Builds system prompt from `settings.categories`
3. Splits bugs into chunks of `settings.chunkSize`
4. For each chunk:
   - Builds user message (JSON payload of id/title/description)
   - Calls LLM with retry on rate-limit
   - Validates and parses response
   - On unrecoverable chunk error: marks all bugs as "Non categorizzato"
   - Invokes `onProgress` callback with chunk results
5. Returns full `CategorizedBug[]`

## Error Handling

- `LLM_AUTH_ERROR` and `LLM_TIMEOUT` → re-thrown immediately (abort all)
- `LLM_RATE_LIMIT` → retried with exponential backoff
- Other chunk errors → graceful degradation (fallback categories)

## FT-08 Notes

- Generic-provider requests now receive `settings.baseUrl` and `settings.llmModel` from the orchestration layer instead of relying on provider-local defaults only.
- The retry behavior is unchanged; FT-08 only swaps one provider implementation and its config surface, not the chunking or fallback semantics.

## Dependencies

- [[wiki/entities/llm-provider-factory]] — `createLLMProvider`
- [[wiki/entities/llm-prompts]] — `buildSystemPrompt`, `buildUserMessage`
- [[wiki/entities/chunking-utility]] — `splitIntoChunks`
- [[wiki/entities/response-validator]] — `validateLLMResponse`

## See also

- [[wiki/entities/ipc-handlers]]
- [[wiki/concepts/chunk-retry-pattern]]
- [[wiki/topics/llm-categorization-pipeline]]
