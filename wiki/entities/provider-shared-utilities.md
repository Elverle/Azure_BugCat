---
title: 'Provider Shared Utilities'
type: entity
subtype: service
created: 2026-05-03
updated: 2026-08-18
sources:
  [
    '[[wiki/analyses/llm-provider-cleanup]]',
    '[[wiki/analyses/cancel-categorization-flow]]'
  ]
tags: [llm, provider, utilities, timeout, schema, fetch]
lang: en
---

## Description

Shared helper module for every LLM provider adapter. It centralizes configuration guards, timeout creation, test-connection prompts, shared AppError helpers, logical structured-output metadata, and — since the 2026-08-11 hardening pass — the whole OpenAI-compatible HTTP request/response cycle itself, so the two fetch-based providers ([[wiki/entities/generic-provider]] and [[wiki/entities/openrouter-provider]]) share one implementation of it instead of each keeping a near-identical copy.

## Location

`src/main/llm/providers/provider-shared.ts`

## Exports

- `DEFAULT_PROVIDER_TIMEOUT_MS` - default 60 s timeout baseline for all providers
- `TEST_CONNECTION_SYSTEM_PROMPT` / `TEST_CONNECTION_USER_MESSAGE` - shared lightweight probe reused by every `testConnection()` implementation
- `throwAppError()` / `isAppError()` - re-exported from `@shared/app-error` so providers keep a single import site for the whole AppError toolkit
- `assertApiKey()` - construction-time API-key validation helper
- `getProviderTimeout()` - resolves `config.timeout ?? 60000`
- `createRequestTimeout()` - creates merged timeout plus optional external-cancel `AbortController` state, cleanup, and `didTimeout()` introspection
- `throwIfRequestAborted()` - classifies an aborted request as `LLM_TIMEOUT` or `OPERATION_CANCELLED` using the abort signal's own state (`signal.aborted` / `didTimeout()`), never the thrown error's `.name` — the OpenAI and Anthropic SDKs raise `APIUserAbortError` on abort, whose `.name` is `'Error'`, so name-matching is dead code for those two adapters
- `getStructuredOutputMetadata()` - maps logical schemas to shared schema names and Anthropic tool metadata
- `toResponseBodyPreview()` - truncates a raw body for safe inclusion in `AppError.details`
- `OpenAiCompatibleProfile` - the interface a concrete provider fills in to describe itself to the shared chat core (base URL, headers, structured-output body fields, and optional `onUnusableResponse` / `onNonJsonResponse` hooks for provider-specific failure reading)
- `openAiCompatibleChat(profile, systemPrompt, userMessage, options)` - the shared chat call every OpenAI-compatible provider makes: `POST {baseUrl}/chat/completions` with a Bearer key, read the body once, map the status, parse, extract content. Everything a specific provider needs on top of that — extra headers, extra body fields, a sharper reading of a failing response — arrives through the profile, so no provider has to own a copy of this logic

## Design Notes

- The project still avoids an inheritance-heavy provider base class; shared mechanics are composed through plain functions instead of a common abstract provider.
- `openAiCompatibleChat()` reads the response body exactly once as text before deciding whether it is a failure, non-JSON, or usable content — a router or gateway can return either shape behind a `2xx` or a `4xx`, so both `onUnusableResponse` and `onNonJsonResponse` fire from more than one call site inside the core.
- Provider-specific error decoding and response extraction remain in the concrete adapters through the `onUnusableResponse` / `onNonJsonResponse` hooks; the shared core owns only the parts that are identical across every OpenAI-compatible endpoint.
- The timeout helper combines two abort sources: the provider timeout budget and an upstream workflow `AbortSignal`. Concrete providers (and the shared core itself) use `didTimeout()` / `throwIfRequestAborted()` to map user cancellation to `OPERATION_CANCELLED` and real elapsed budgets to `LLM_TIMEOUT`.
- Extracting a shared fetch core from what were separate `OpenRouterProvider` and `GenericProvider` implementations left roughly 60 near-identical lines out of ~90 in each file; that duplication is what this module now owns instead.

## Used By

- [[wiki/entities/openai-provider]] - config guards, timeout helper, AppError helpers, schema metadata (SDK-backed, does not use `openAiCompatibleChat()`)
- [[wiki/entities/anthropic-provider]] - same as above (SDK-backed)
- [[wiki/entities/gemini-provider]] - same as above (SDK-backed)
- [[wiki/entities/generic-provider]] - full `openAiCompatibleChat()` core
- [[wiki/entities/openrouter-provider]] - full `openAiCompatibleChat()` core, plus `structuredOutputBody` and `onUnusableResponse` for routing-mismatch detection

## See also

- [[wiki/entities/llm-provider-interface]]
- [[wiki/entities/generic-provider]]
- [[wiki/entities/openrouter-provider]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/analyses/llm-provider-cleanup]]
