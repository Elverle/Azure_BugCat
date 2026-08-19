---
title: 'FT-11 - OpenRouter Provider'
type: source
created: 2026-05-02
updated: 2026-08-18
sources: []
tags: [llm, openrouter, structured-output, json-schema, electron-vite]
lang: en
---

## Summary

FT-11 adds a dedicated [[wiki/entities/openrouter-provider]] implementation. As delivered on 2026-05-02, the adapter was built on the official `@openrouter/sdk` package: it translated schema-aware chat requests into the SDK's `chatRequest` envelope, used native `timeoutMs` request options, and read the provider's `responseFormat.jsonSchema` structured-output API. A follow-up hardening pass on 2026-05-03 added detection for the case where OpenRouter routes a request to an upstream provider/model that downgrades `json_schema` structured output, and promoted that failure into a blocking categorization error with renderer-visible feedback instead of silently falling back to uncategorized chunks.

**That SDK-backed implementation no longer exists.** During the production-ready hardening phase (2026-08-11), `@openrouter/sdk` was removed from `package.json` and `OpenRouterProvider` was rewritten as a thin configuration over the shared `openAiCompatibleChat()` fetch core in `provider-shared.ts` — the same core the [[wiki/entities/generic-provider]] uses. The `LLMProvider` contract the rest of the app depends on did not change, and the routing-mismatch detection this page describes below is still present, but it now reads the failing response body directly instead of catching an SDK validation error. See [[wiki/entities/openrouter-provider]] for the current implementation and [[wiki/entities/provider-shared-utilities]] for the shared core. The historical delivery is documented below for the record.

## Files Created (2026-05-02, SDK-backed delivery)

| File                                            | Purpose                                                        |
| ------------------------------------------------ | --------------------------------------------------------------- |
| `src/main/llm/providers/openrouter-provider.ts` | `OpenRouterProvider` SDK adapter implementing `LLMProvider`    |
| `tests/main/openrouter-provider.spec.ts`        | Unit coverage for request shape, schemas, defaults, and errors |

## Files Modified (2026-05-02 to 2026-05-03)

| File                                                          | Change                                                                                      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/shared/types.ts`                                         | Added `'openrouter'` to `LLMProviderType` so settings can select the new backend             |
| `src/main/llm/provider-factory.ts`                            | Registered `OpenRouterProvider` in `createLLMProvider()`                                     |
| `src/renderer/src/components/settings/LlmProviderSection.tsx` | Added OpenRouter dropdown option plus provider-specific API key label and model placeholder  |
| `src/main/llm/llm-service.ts`                                 | Treats OpenRouter structured-output routing mismatch as a blocking categorization error      |
| `src/renderer/src/hooks/useDashboard.ts`                      | Exposes `categorizeError` state for renderer-visible categorization failures                 |
| `src/renderer/src/pages/DashboardPage.tsx`                    | Shows a modal popup when categorization aborts with a blocking provider error                |
| `src/renderer/src/components/ui/confirm-dialog.tsx`           | Supports a single-action dialog by making the cancel action optional                         |
| `electron.vite.config.ts`                                     | Bundled `@openrouter/sdk` in the main process via `externalizeDeps.exclude` (removed 2026-08-11 along with the dependency) |
| `tests/main/llm-provider-factory.spec.ts`                     | Added factory coverage for OpenRouter creation and auth validation                            |
| `tests/main/llm-service.spec.ts`                              | Verifies routing-mismatch parse errors abort categorization immediately                       |
| `tests/renderer/useDashboard.spec.ts`                         | Verifies categorization errors are stored and reset in dashboard state                        |
| `tests/renderer/DashboardPage.spec.tsx`                       | Verifies the blocking categorization error is shown in a modal popup                          |

## Key Takeaways (as delivered)

1. **SDK-backed without changing orchestration** — `llm-service.ts` only ever talked to `LLMProvider`; OpenRouter-specific transport details stayed inside the concrete adapter. That separation is exactly what let the SDK be removed later without touching `llm-service.ts`.
2. **Structured output stayed provider-native** — FT-09's logical schema contract mapped to OpenRouter's `responseFormat: { type: 'json_schema', jsonSchema: ... }` API. The successor implementation maps to the same wire-level `response_format.json_schema` shape, now built by hand instead of by the SDK.
3. **Timeouts used the SDK's native mechanism** — instead of wrapping calls with `AbortController` + `Promise.race`, the provider passed `{ timeoutMs: 60000 }` as request options. The successor uses the shared `createRequestTimeout()` helper instead, which every OpenAI-compatible provider now shares.
4. **Error mapping followed SDK semantics** — rate limits and auth failures came from `statusCode`, while timeout/abort cases were identified through `RequestTimeoutError` and `RequestAbortedError` names. The successor reads the same HTTP status codes directly off the `fetch()` response.
5. **Settings and runtime defaults are related but distinct** — the UI suggests `openai/gpt-4.1-mini` as a starting model, while the provider falls back to `openai/gpt-4o` if no model is saved. Unchanged by the later rewrite.
6. **Routing mismatch is treated as a product-level failure, not a soft chunk error** — when OpenRouter downgrades `response_format` and the upstream provider no longer supports `json_schema`, the provider emits a dedicated `LLM_PARSE_ERROR` reason and `llm-service.ts` aborts the run. This behavior is unchanged, only its detection mechanism moved from an SDK validation-error catch to a direct read of the response body — see [[wiki/entities/openrouter-provider]].
7. **The renderer exposes the failure explicitly to the user** — `useDashboard()` stores the categorization error and [[wiki/entities/dashboard-page]] displays it in a modal instead of allowing the failure to disappear behind partial fallback results. Unchanged by the later rewrite.
8. **Regression coverage was targeted and behavior-focused** — the provider spec verified request envelope shape, schema naming, error normalization, routing-mismatch detection, and `testConnection()` reuse, while service/renderer tests covered blocking propagation. The successor spec keeps the same behavioral coverage against the new fetch-based implementation, plus a shared `provider-shared.spec.ts` for the transport mechanics now common to every OpenAI-compatible provider.

## Architecture Delta (as delivered, 2026-05-02)

```text
AppSettings.llmProvider = 'openrouter'
  -> createLLMProvider('openrouter', config)
      -> new OpenRouterProvider(config)
          -> openrouter.chat.send({ chatRequest: { ... } }, { timeoutMs: 60000 })
              -> provider-native json_schema enforcement
              -> raw JSON string response
          -> validateLLMResponse(raw, chunk)
```

The 2026-08-11 rewrite replaces the middle two lines with a call into the shared `openAiCompatibleChat()` core; see [[wiki/entities/provider-shared-utilities]] for the current shape.

## Validation Surface (as delivered)

- `tests/main/openrouter-provider.spec.ts` covered constructor validation, request payload shape, schema selection, timeout handling, routing-mismatch detection, and error normalization against the SDK adapter. The file still exists and still covers the same behaviors, now against the fetch-based implementation, with the transport mechanics it shares with other providers split out into `tests/main/provider-shared.spec.ts`.
- `tests/main/llm-provider-factory.spec.ts` verifies that `createLLMProvider('openrouter', ...)` returns the adapter and still rejects missing API keys.
- `tests/main/llm-service.spec.ts` verifies that a structured-output routing mismatch aborts categorization instead of degrading the chunk.
- `tests/renderer/useDashboard.spec.ts` and `tests/renderer/DashboardPage.spec.tsx` verify that blocking categorization errors are surfaced to the user through dashboard state and a popup.

## See also

- [[wiki/entities/openrouter-provider]]
- [[wiki/entities/provider-shared-utilities]]
- [[wiki/entities/generic-provider]]
- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/llm-provider-section]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/concepts/provider-native-structured-output]]
- [[wiki/topics/llm-categorization-pipeline]]
