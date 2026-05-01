---
title: 'Provider-Native Structured Output'
type: concept
created: 2026-05-01
updated: 2026-05-01
sources: ['[[wiki/sources/ft-09-structured-output]]']
tags: [llm, structured-output, json-schema, abstraction]
lang: en
---

## Definition

A portability pattern where the application defines one logical JSON Schema contract, then each LLM adapter translates that contract into the provider's native structured-output mechanism instead of relying only on prompt wording.

## Implementation in This Project

`llm-service.ts` asks for a schema by semantic intent through `ChatOptions.responseSchema`. The provider layer keeps the orchestration code vendor-neutral while still exploiting each backend's strongest output-enforcement primitive.

| Provider                             | Native mechanism                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| [[wiki/entities/openai-provider]]    | `response_format: { type: 'json_schema', json_schema: { strict: true, schema } }` |
| [[wiki/entities/generic-provider]]   | Same OpenAI-compatible `response_format` payload over raw HTTP                    |
| [[wiki/entities/anthropic-provider]] | Tool-use with `tools[].input_schema` and forced `tool_choice`                     |
| [[wiki/entities/gemini-provider]]    | `responseMimeType: 'application/json'` plus `responseSchema`                      |

## Why It Matters

- Reduces dependence on long prompt-format instructions.
- Makes provider behavior more deterministic for machine-read JSON responses.
- Keeps structured-output concerns behind the provider abstraction instead of leaking vendor SDK details into `llm-service.ts`.
- Preserves a fallback path because the validator still checks completeness and missing bug coverage after transport-level enforcement.

## Trade-offs

| Advantage                                | Cost                                                           |
| ---------------------------------------- | -------------------------------------------------------------- |
| Better response-shape reliability        | Adapter logic becomes slightly more provider-specific          |
| Stronger contract reuse via `schemas.ts` | Some SDK typings require casts, as in Anthropic `input_schema` |
| Orchestration stays portable             | Not every provider exposes the same strictness semantics       |

## See also

- [[wiki/entities/llm-schemas]]
- [[wiki/entities/llm-provider-interface]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/topics/llm-categorization-pipeline]]
