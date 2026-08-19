---
title: 'Analysis: OpenRouter structured-output routing mismatch'
type: analysis
created: 2026-05-03
updated: 2026-08-18
sources: ['[[wiki/sources/ft-11-openrouter-provider]]']
tags: [analysis, llm, openrouter, structured-output, json-schema]
lang: en
---

## Problem

Categorization requests sent through [[wiki/entities/openrouter-provider]] could fail even when the app generated a correct `json_schema` structured-output request. In the failing cases, the user saw an OpenRouter validation failure and categorization either degraded silently to uncategorized chunks or exposed a generic parse error that did not explain the real issue.

## Symptoms

- As originally reported (2026-05-03, SDK-backed provider): the SDK raised `ResponseValidationError` while the request payload already contained `responseFormat.type = 'json_schema'`.
- Diagnostic previews showed upstream response bodies containing `response_format.type = 'json'` instead of `json_schema`.
- The failure depended on the selected routed model/provider combination, not on the application prompt or schema definition.

## Root Cause

The failure was caused by OpenRouter routing a structured-output request to an upstream provider or model that did not preserve `json_schema` support end to end. The application requested structured output correctly, but the routed backend downgraded the format to plain JSON mode. Originally (SDK-backed provider) this caused the SDK's own response validator to reject the payload with `ResponseValidationError`; since the provider was rewritten around a shared fetch core (2026-08-11), there is no SDK validator in the loop, and the same downgrade instead shows up as a failing (or occasionally `200`-with-error-envelope) HTTP response whose body the provider reads directly.

This means the defect is not primarily in the local schema registry or prompt construction. The controlling compatibility boundary is the OpenRouter routing/provider layer.

## Detection

[[wiki/entities/openrouter-provider]] inspects the raw response body of a failing (or unusable) request for a specific pattern — originally by catching the SDK's `ResponseValidationError`, now (2026-08-11 onward) by reading `bodyText` directly inside `openAiCompatibleChat()`'s `onUnusableResponse` hook:

- a `404` whose body says `no endpoints found` together with a mention of `structured output`, `response_format`, or `json_schema`;
- a body that mentions both `response_format` and `json_schema` together with a marker that the upstream received plain `json` (`input: 'json'`, `"type":"json"`, and JSON-escaped/spaced variants of both) — checked regardless of HTTP status, since a router can report the same refusal inside a `200` error envelope.

When this pattern is found, the provider throws `LLM_PARSE_ERROR` with `details.reason = 'structured-output-routing-mismatch'` instead of reporting only a generic validation failure. A 2026-08-12 review found and fixed two regressions introduced by the rewrite of this detection logic — the `404` branch matching an unrelated unknown-model-slug error, and the `200`-with-error-envelope case being unreachable — both closed in commit `54feec8` with dedicated regression tests.

## Product Behavior

- [[wiki/entities/llm-service]] treats `structured-output-routing-mismatch` as a blocking categorization error.
- [[wiki/entities/use-dashboard-hook]] stores the renderer-facing `categorizeError` message.
- [[wiki/entities/dashboard-page]] shows the message in [[wiki/entities/confirm-dialog]] as a modal popup.

This prevents the app from hiding an infrastructure/model-compatibility problem behind partial fallback categorization.

## Mitigation

- Select an OpenRouter model/provider combination that preserves `json_schema` structured outputs.
- Keep the request's `provider: { require_parameters: true }` body field set when requesting structured output through OpenRouter.
- Treat this failure as a routing or capability issue first, not as a prompt-formatting issue.

## Components Involved

- [[wiki/entities/openrouter-provider]]
- [[wiki/entities/llm-service]]
- [[wiki/entities/use-dashboard-hook]]
- [[wiki/entities/dashboard-page]]
- [[wiki/entities/confirm-dialog]]
- [[wiki/topics/llm-categorization-pipeline]]

## See also

- [[wiki/sources/ft-11-openrouter-provider]]
- [[wiki/entities/llm-schemas]]
- [[wiki/concepts/provider-native-structured-output]]
- [[wiki/concepts/chunk-retry-pattern]]
