---
title: 'OpenAI Provider'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-05-03
sources:
  [
    '[[wiki/sources/ft-04-llm-provider]]',
    '[[wiki/sources/ft-09-structured-output]]',
		'[[wiki/analyses/llm-provider-cleanup]]',
		'[[wiki/analyses/cancel-categorization-flow]]'
  ]
tags: [llm, openai, provider]
lang: en
---

## Description

LLM provider implementation for OpenAI. Uses the official `openai` SDK with `gpt-4o` as default model and optionally enables strict JSON Schema enforcement through the Chat Completions `response_format` API.

## Location

`src/main/llm/providers/openai-provider.ts`

## Configuration

- **API Key**: Required at construction time (throws `LLM_AUTH_ERROR` if missing)
- **Model**: `config.model ?? 'gpt-4o'`
- **Temperature**: `0.1`
- **Timeout**: `config.timeout ?? 60000`, enforced through the shared request-timeout helper, which can also merge an upstream cancellation signal

## Structured Output

When `options.responseSchema` is present, the provider adds:

```typescript
response_format: {
	type: 'json_schema',
	json_schema: {
		name,
		strict: true,
		schema: getSchema(options.responseSchema)
	}
}
```

The schema name is derived from the logical output type so the service can stay vendor-neutral.

## Implementation Notes

- Reuses [[wiki/entities/provider-shared-utilities]] for API-key validation, timeout creation, shared AppError helpers, and the common `testConnection()` probe strings.
- Keeps provider-specific behavior limited to OpenAI request shape and SDK error mapping.

## Validation

`tests/main/openai-provider.spec.ts` covers constructor validation, request shape, structured output wiring, status-code mapping, empty responses, and timeout abortion. The categorization-level tests additionally verify that abort propagation stops the workflow before the next chunk.

## Error Mapping

| SDK condition                   | AppError code         |
| ------------------------------- | --------------------- |
| HTTP 429                        | `LLM_RATE_LIMIT`      |
| HTTP 401/403                    | `LLM_AUTH_ERROR`      |
| AbortError after user cancel    | `OPERATION_CANCELLED` |
| AbortError after timeout budget | `LLM_TIMEOUT`         |
| Empty response                  | `LLM_PARSE_ERROR`     |
| Other                           | `UNKNOWN_ERROR`       |

## See also

- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/llm-schemas]]
- [[wiki/entities/provider-shared-utilities]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/concepts/provider-native-structured-output]]
