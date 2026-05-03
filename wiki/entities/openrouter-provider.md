---
title: 'OpenRouter Provider'
type: entity
subtype: service
created: 2026-05-02
updated: 2026-05-03
sources:
  [
    '[[wiki/sources/ft-11-openrouter-provider]]',
    '[[wiki/analyses/llm-provider-cleanup]]',
    '[[wiki/analyses/cancel-categorization-flow]]'
  ]
tags: [llm, openrouter, provider, sdk]
lang: en
---

## Description

LLM provider implementation for OpenRouter. Uses the official `@openrouter/sdk` package, wraps requests in the SDK's `chatRequest` envelope, and supports FT-09 structured output through OpenRouter's `json_schema` response format.

## Location

`src/main/llm/providers/openrouter-provider.ts`

## Configuration

- **API Key**: Required at construction time (throws `LLM_AUTH_ERROR` if missing or blank)
- **Model**: `config.model ?? 'openai/gpt-4o'`
- **Temperature**: `0.1`
- **Timeout**: `config.timeout ?? 60000` through SDK request options: `{ timeoutMs }`, merged with an upstream cancel signal before the SDK call

The settings UI currently suggests `openai/gpt-4.1-mini` as a starter value, but the main-process runtime fallback remains `openai/gpt-4o` when no model is stored.

## Request Shape

The provider sends:

```typescript
client.chat.send(
  {
    chatRequest: {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
      stream: false,
      responseFormat
    }
  },
  { timeoutMs, signal }
)
```

It then reads `response.choices?.[0]?.message?.content` and requires that value to be a non-empty string.

## Structured Output

When `options.responseSchema` is present, the provider adds:

```typescript
provider: {
  requireParameters: true
}

responseFormat: {
  type: 'json_schema',
  jsonSchema: {
    name,
    strict: true,
    schema: getSchema(options.responseSchema)
  }
}
```

Schema names are mapped to the logical FT-09 contracts:

- `categorization` -> `bug_categorization`
- `similar-bugs` -> `similar_bugs_detection`

The provider also stores a request preview in error details for validation failures, but does not emit request-level console logs during normal execution.

## Validation

`tests/main/openrouter-provider.spec.ts` now also verifies that a custom provider timeout is forwarded to the SDK request options, alongside the existing structured-output and error-mapping coverage.

## Error Mapping

| SDK condition                                                                                     | AppError code                                                                  |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `statusCode === 429`                                                                              | `LLM_RATE_LIMIT`                                                               |
| `statusCode === 401` or `statusCode === 403`                                                      | `LLM_AUTH_ERROR`                                                               |
| `RequestAbortedError` or `AbortError` after user cancel                                           | `OPERATION_CANCELLED`                                                          |
| `RequestTimeoutError` or timeout-originated abort                                                 | `LLM_TIMEOUT`                                                                  |
| OpenRouter routes a `json_schema` request to an upstream provider that downgrades to plain `json` | `LLM_PARSE_ERROR` with `details.reason = 'structured-output-routing-mismatch'` |
| Missing or non-string `choices[0].message.content`                                                | `LLM_PARSE_ERROR`                                                              |
| Other failures                                                                                    | `UNKNOWN_ERROR`                                                                |

## Behavior Notes

- `testConnection()` reuses `chat()` with a lightweight prompt rather than calling a separate health endpoint.
- The provider now reuses [[wiki/entities/provider-shared-utilities]] for API-key validation, timeout resolution, shared AppError helpers, schema metadata, and test-connection prompt strings.
- Unlike [[wiki/entities/generic-provider]], this adapter does not expose a configurable base URL because endpoint routing is delegated to the SDK.
- `ResponseValidationError` is treated specially: the provider first tries to recover usable content from `rawValue` or the raw response body, then promotes unrecoverable structured-output routing mismatches into a dedicated parse error reason that higher layers can treat as blocking.
- The same helper now lets OpenRouter preserve native `timeoutMs` usage while still honoring user-triggered cancellation from the categorization workflow.

## Dependencies

- [[wiki/entities/llm-provider-interface]]
- [[wiki/entities/llm-schemas]]
- [[wiki/entities/provider-shared-utilities]]
- [[wiki/entities/shared-types]] - `AppError`
- `@openrouter/sdk`

## See also

- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/llm-provider-section]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/concepts/provider-native-structured-output]]
- [[wiki/topics/llm-categorization-pipeline]]
