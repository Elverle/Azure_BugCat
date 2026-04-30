---
title: 'FT-04 — LLM Provider Abstraction e Categorizzazione'
type: source
created: 2026-04-30
updated: 2026-04-30
sources: []
tags: [llm, openai, anthropic, copilot, gemini, categorization, main-process]
lang: en
---

## Summary

Full implementation of the LLM provider layer in the Electron Main Process. Introduces a polymorphic `LLMProvider` interface with four concrete providers (OpenAI, Anthropic, GitHub Copilot, Gemini), a factory for instantiation, chunking for batch processing, response validation with markdown fence stripping, progressive IPC updates via `event.sender`, retry with exponential backoff, and test connection flow.

## Files Created

| File                                           | Purpose                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `src/main/llm/types.ts`                        | `LLMProvider` interface, `LLMProviderConfig`, `ChunkInput`, `ChunkResult` |
| `src/main/llm/prompts.ts`                      | `buildSystemPrompt`, `buildUserMessage`                                   |
| `src/main/llm/chunking.ts`                     | `splitIntoChunks` utility                                                 |
| `src/main/llm/providers/openai-provider.ts`    | `OpenAIProvider` class                                                    |
| `src/main/llm/providers/anthropic-provider.ts` | `AnthropicProvider` class                                                 |
| `src/main/llm/providers/copilot-provider.ts`   | `CopilotProvider` class                                                   |
| `src/main/llm/providers/gemini-provider.ts`    | `GeminiProvider` class                                                    |
| `src/main/llm/provider-factory.ts`             | `createLLMProvider` factory function                                      |
| `src/main/llm/response-validator.ts`           | `validateLLMResponse` with fence stripping + fallback                     |
| `src/main/llm/llm-service.ts`                  | `categorizeBugs` orchestration + `testLLMConnection`                      |
| `src/main/llm/index.ts`                        | Barrel export                                                             |

## Files Modified

| File                       | Change                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `src/main/ipc-handlers.ts` | Replaced LLM placeholder stubs with real `categorizeBugs` / `testLLMConnection` handlers |

## Key Takeaways

1. **Provider abstraction** — All providers implement `LLMProvider { chat(), testConnection() }`, allowing runtime switching via factory.
2. **Chunking** — Bugs are split into configurable-size batches to avoid token limits; each chunk is processed independently.
3. **Progressive IPC** — `event.sender.send()` pushes `ChunkProgress` to renderer after each chunk completes.
4. **Retry with backoff** — On rate-limit errors, retries up to 3 times with delays `[2s, 4s, 8s]`.
5. **Response validation** — Strips markdown fences (```json), parses JSON, validates schema, and builds fallback results for missing bugs.
6. **Error taxonomy** — Typed `AppError` codes: `LLM_AUTH_ERROR`, `LLM_RATE_LIMIT`, `LLM_TIMEOUT`, `LLM_PARSE_ERROR`, `UNKNOWN_ERROR`.
7. **Copilot SDK** — Uses `approveAll` permission handler (intentional security trade-off for automated tool use).
8. **Tech debt** — `throwAppError`/`isAppError` duplicated across providers (DRY violation noted for next sprint).

## Architecture

```
IPC Handler (llm:categorize)
  └─ categorizeBugs(settings, bugs, onProgress)
       ├─ createLLMProvider(type, config) → LLMProvider
       ├─ buildSystemPrompt(categories)
       ├─ splitIntoChunks(bugs, chunkSize)
       └─ for each chunk:
            ├─ buildUserMessage(chunk)
            ├─ chatWithRetry(provider, system, user)
            │    └─ provider.chat() [with exponential backoff]
            ├─ validateLLMResponse(raw, chunk)
            └─ onProgress({ total, completed, currentChunk })
```

## See also

- [[wiki/entities/llm-service]]
- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/response-validator]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/concepts/chunk-retry-pattern]]
- [[wiki/topics/llm-categorization-pipeline]]
