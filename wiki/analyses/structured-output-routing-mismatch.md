---
title: 'Analysis: OpenRouter structured-output routing mismatch'
type: analysis
created: 2026-05-03
updated: 2026-05-03
sources: ['[[wiki/sources/ft-11-openrouter-provider]]']
tags: [analysis, llm, openrouter, structured-output, json-schema]
lang: en
---

## Problem

Categorization requests sent through [[wiki/entities/openrouter-provider]] could fail even when the app generated a correct `json_schema` structured-output request. In the failing cases, the user saw an OpenRouter validation failure and categorization either degraded silently to `Non categorizzato` chunks or exposed a generic parse error that did not explain the real issue.

## Symptoms

- The SDK raised `ResponseValidationError` while the request payload already contained `responseFormat.type = 'json_schema'`.
- Diagnostic previews showed upstream response bodies containing `response_format.type = 'json'` instead of `json_schema`.
- The failure depended on the selected routed model/provider combination, not on the application prompt or schema definition.

## Root Cause

The failure was caused by OpenRouter routing a structured-output request to an upstream provider or model that did not preserve `json_schema` support end to end. The application requested structured output correctly, but the routed backend downgraded the format to plain JSON mode, causing the SDK response validator to reject the payload.

This means the defect is not primarily in the local schema registry or prompt construction. The controlling compatibility boundary is the OpenRouter routing/provider layer.

## Detection

[[wiki/entities/openrouter-provider]] now inspects validation failures for a specific pattern:

- `response_format`
- `json_schema`
- `input: 'json'`
- payload previews that show `type: 'json'` where `json_schema` was expected

When this pattern is found, the provider throws `LLM_PARSE_ERROR` with `details.reason = 'structured-output-routing-mismatch'` instead of reporting only a generic validation failure.

## Product Behavior

- [[wiki/entities/llm-service]] treats `structured-output-routing-mismatch` as a blocking categorization error.
- [[wiki/entities/use-dashboard-hook]] stores the renderer-facing `categorizeError` message.
- [[wiki/entities/dashboard-page]] shows the message in [[wiki/entities/confirm-dialog]] as a modal popup.

This prevents the app from hiding an infrastructure/model-compatibility problem behind partial fallback categorization.

## Mitigation

- Select an OpenRouter model/provider combination that preserves `json_schema` structured outputs.
- Keep `provider.requireParameters = true` when requesting structured output through OpenRouter.
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
