---
title: 'FT-11 - OpenRouter SDK Provider'
type: source
created: 2026-05-02
updated: 2026-05-03
sources: []
tags: [llm, openrouter, sdk, structured-output, json-schema, electron-vite]
lang: en
---

## Summary

FT-11 adds a dedicated [[wiki/entities/openrouter-provider]] implementation built on the official `@openrouter/sdk` package. The adapter keeps the existing `LLMProvider` contract intact while translating schema-aware chat requests into OpenRouter's SDK-specific `chatRequest` envelope, using native `timeoutMs` request options and the provider's `responseFormat.jsonSchema` structured-output API. A follow-up hardening pass also documents and detects the case where OpenRouter routes a request to an upstream provider/model that downgrades `json_schema` structured output, then promotes that failure into a blocking categorization error with renderer-visible feedback instead of silently falling back to `Non categorizzato` chunks.

## Files Created

| File                                            | Purpose                                                        |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `src/main/llm/providers/openrouter-provider.ts` | `OpenRouterProvider` SDK adapter implementing `LLMProvider`    |
| `tests/main/openrouter-provider.spec.ts`        | Unit coverage for request shape, schemas, defaults, and errors |

## Files Modified

| File                                                          | Change                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/shared/types.ts`                                         | Added `'openrouter'` to `LLMProviderType` so settings can select the new backend            |
| `src/main/llm/provider-factory.ts`                            | Registered `OpenRouterProvider` in `createLLMProvider()`                                    |
| `src/renderer/src/components/settings/LlmProviderSection.tsx` | Added OpenRouter dropdown option plus provider-specific API key label and model placeholder |
| `src/main/llm/llm-service.ts`                                 | Treats OpenRouter structured-output routing mismatch as a blocking categorization error     |
| `src/renderer/src/hooks/useDashboard.ts`                      | Exposes `categorizeError` state for renderer-visible categorization failures                |
| `src/renderer/src/pages/DashboardPage.tsx`                    | Shows a modal popup when categorization aborts with a blocking provider error               |
| `src/renderer/src/components/ui/confirm-dialog.tsx`           | Supports a single-action dialog by making the cancel action optional                        |
| `electron.vite.config.ts`                                     | Bundles `@openrouter/sdk` in the main process via `externalizeDeps.exclude`                 |
| `tests/main/llm-provider-factory.spec.ts`                     | Added factory coverage for OpenRouter creation and auth validation                          |
| `tests/main/llm-service.spec.ts`                              | Verifies routing-mismatch parse errors abort categorization immediately                     |
| `tests/renderer/useDashboard.spec.ts`                         | Verifies categorization errors are stored and reset in dashboard state                      |
| `tests/renderer/DashboardPage.spec.tsx`                       | Verifies the blocking categorization error is shown in a modal popup                        |

## Key Takeaways

1. **SDK-backed without changing orchestration** - `llm-service.ts` still talks only to `LLMProvider`; OpenRouter-specific transport details stay inside the concrete adapter.
2. **Structured output stays provider-native** - FT-09's logical schema contract now maps to OpenRouter's `responseFormat: { type: 'json_schema', jsonSchema: ... }` API.
3. **Timeouts use the SDK's native mechanism** - instead of wrapping calls with `AbortController` + `Promise.race`, the provider passes `{ timeoutMs: 60000 }` as request options.
4. **Error mapping follows SDK semantics** - rate limits and auth failures come from `statusCode`, while timeout/abort cases are identified through `RequestTimeoutError` and `RequestAbortedError` names.
5. **Settings and runtime defaults are related but distinct** - the UI suggests `openai/gpt-4.1-mini` as a starting model, while the provider falls back to `openai/gpt-4o` if no model is saved.
6. **Routing mismatch is treated as a product-level failure, not a soft chunk error** - when OpenRouter downgrades `response_format` and the upstream provider no longer supports `json_schema`, the provider emits a dedicated `LLM_PARSE_ERROR` reason and `llm-service.ts` aborts the run.
7. **The renderer now exposes the failure explicitly to the user** - `useDashboard()` stores the categorization error and [[wiki/entities/dashboard-page]] displays it in a modal instead of allowing the failure to disappear behind partial fallback results.
8. **Regression coverage is targeted and behavior-focused** - the provider spec verifies request envelope shape, schema naming, error normalization, routing-mismatch detection, and `testConnection()` reuse, while service/renderer tests cover blocking propagation.

## Architecture Delta

```text
AppSettings.llmProvider = 'openrouter'
  -> createLLMProvider('openrouter', config)
      -> new OpenRouterProvider(config)
          -> openrouter.chat.send({ chatRequest: { ... } }, { timeoutMs: 60000 })
              -> provider-native json_schema enforcement
              -> raw JSON string response
          -> validateLLMResponse(raw, chunk)
```

## Validation Surface

- `tests/main/openrouter-provider.spec.ts` covers constructor validation, request payload shape, schema selection, timeout handling, routing-mismatch detection, and error normalization.
- `tests/main/llm-provider-factory.spec.ts` verifies that `createLLMProvider('openrouter', ...)` returns the new adapter and still rejects missing API keys.
- `tests/main/llm-service.spec.ts` verifies that a structured-output routing mismatch aborts categorization instead of degrading the chunk.
- `tests/renderer/useDashboard.spec.ts` and `tests/renderer/DashboardPage.spec.tsx` verify that blocking categorization errors are surfaced to the user through dashboard state and a popup.

## See also

- [[wiki/entities/openrouter-provider]]
- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/llm-provider-section]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/concepts/provider-native-structured-output]]
- [[wiki/topics/llm-categorization-pipeline]]
