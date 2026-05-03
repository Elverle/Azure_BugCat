---
title: 'Provider Shared Utilities'
type: entity
subtype: service
created: 2026-05-03
updated: 2026-05-03
sources: ['[[wiki/analyses/llm-provider-cleanup]]', '[[wiki/analyses/cancel-categorization-flow]]']
tags: [llm, provider, utilities, timeout, schema]
lang: en
---

## Description

Shared helper module for SDK-backed and HTTP-backed LLM providers. It centralizes configuration guards, timeout creation, test-connection prompts, shared AppError helpers, and logical structured-output metadata so concrete adapters only keep transport-specific code.

## Location

`src/main/llm/providers/provider-shared.ts`

## Exports

- `DEFAULT_PROVIDER_TIMEOUT_MS` - default 60 s timeout baseline for all providers
- `TEST_CONNECTION_SYSTEM_PROMPT` / `TEST_CONNECTION_USER_MESSAGE` - shared lightweight probe reused by every `testConnection()` implementation
- `throwAppError()` / `isAppError()` - shared helpers for the common AppError taxonomy
- `assertApiKey()` - construction-time API-key validation helper
- `getProviderTimeout()` - resolves `config.timeout ?? 60000`
- `createRequestTimeout()` - creates merged timeout plus optional external-cancel `AbortController` state, cleanup, and `didTimeout()` introspection
- `getStructuredOutputMetadata()` - maps logical schemas to shared schema names and Anthropic tool metadata

## Design Notes

- The project still avoids an inheritance-heavy provider base class.
- Shared mechanics are composed through plain functions instead of a common abstract provider.
- Provider-specific error decoding and response extraction remain in the concrete adapters.
- The timeout helper now combines two abort sources: the provider timeout budget and an upstream workflow `AbortSignal`. Concrete providers use `didTimeout()` to map user cancellation to `OPERATION_CANCELLED` and real elapsed budgets to `LLM_TIMEOUT`.

## Used By

- [[wiki/entities/openai-provider]]
- [[wiki/entities/anthropic-provider]]
- [[wiki/entities/gemini-provider]]
- [[wiki/entities/generic-provider]]
- [[wiki/entities/openrouter-provider]]

## See also

- [[wiki/entities/llm-provider-interface]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/analyses/llm-provider-cleanup]]
