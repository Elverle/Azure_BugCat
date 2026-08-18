---
title: 'OpenRouter Provider'
type: entity
subtype: service
created: 2026-05-02
updated: 2026-08-18
sources:
  [
    '[[wiki/sources/ft-11-openrouter-provider]]',
    '[[wiki/analyses/llm-provider-cleanup]]',
    '[[wiki/analyses/cancel-categorization-flow]]'
  ]
tags: [llm, openrouter, provider, fetch]
lang: en
---

## Description

LLM provider implementation for OpenRouter. It no longer wraps the official `@openrouter/sdk` package — that dependency was removed during the production-ready hardening pass. `OpenRouterProvider` is now a thin configuration object over [[wiki/entities/provider-shared-utilities]]'s `openAiCompatibleChat()`, the same OpenAI-compatible `fetch()` core used by [[wiki/entities/generic-provider]]. What remains OpenRouter-specific is the fixed API root, two attribution headers, a routing-enforcement body field, and a heuristic that reads a failing response body to tell a genuine routing/capability mismatch apart from an ordinary error.

## Location

`src/main/llm/providers/openrouter-provider.ts`

## Configuration

- **API Key**: Required at construction time (throws `LLM_AUTH_ERROR` if missing or blank, via `assertApiKey()`)
- **Base URL**: Fixed — `https://openrouter.ai/api/v1`, not configurable from settings
- **Model**: `config.model ?? 'openai/gpt-4o'`
- **Temperature**: `0.1` (set inside `openAiCompatibleChat()`)
- **Timeout**: `config.timeout ?? 60000`, merged with an upstream cancel signal by the shared `createRequestTimeout()` helper

The settings UI still suggests `openai/gpt-4.1-mini` as a starter value, while the runtime fallback when no model is stored remains `openai/gpt-4o`.

## Request Shape

`chat()` delegates the whole HTTP call to the shared core, passing an `OpenAiCompatibleProfile`:

```typescript
openAiCompatibleChat(
  {
    baseUrl: OPENROUTER_BASE_URL,
    apiKey: config.apiKey,
    model: config.model ?? 'openai/gpt-4o',
    timeoutMs: getProviderTimeout(config),
    displayName: 'OpenRouter',
    errorPrefix: 'OpenRouter error',
    headers: { 'HTTP-Referer': '...', 'X-Title': 'BugCat' },
    structuredOutputBody: { provider: { require_parameters: true } },
    onUnusableResponse: /* routing-mismatch check, see below */
  },
  systemPrompt,
  userMessage,
  options
)
```

The shared core POSTs to `{baseUrl}/chat/completions`, reads the body once as text, and only then decides whether it parses as JSON and whether it contains usable `choices[0].message.content`. The `HTTP-Referer` / `X-Title` headers are attribution only — they place the app in the openrouter.ai rankings and mirror `productName` from `package.json`; they have no effect on routing or on the response.

## Structured Output

When `options.responseSchema` is present, the shared core adds `response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } }`, and — because `structuredOutputBody` is set — also merges in `provider: { require_parameters: true }`. That field is OpenRouter's own routing guard: without it, the router is free to send a structured-output request to a backend that ignores `response_format` and answers in free text, which would silently break the whole categorization pipeline. Schema names follow the shared FT-09 contract (`categorization` -> `bug_categorization`, `similar-bugs` -> `similar_bugs_detection`) via `getStructuredOutputMetadata()`.

## Routing-Mismatch Detection

OpenRouter is a router, not a model host, so a `response_format: json_schema` request can fail for a reason no direct provider has: no backend behind the chosen model honors structured outputs. `isStructuredOutputRoutingMismatch(status, bodyText)` reads the raw response body directly — there is no SDK validation error to lean on — and recognizes two signatures:

- a `404` whose body says `"no endpoints found"` together with a mention of `structured output`, `response_format`, or `json_schema` (a model-agnostic capability refusal);
- a body that mentions both `response_format` and `json_schema` (or `expected json_schema`) together with a marker that the upstream actually received plain `json` (`input': 'json'`, `"type":"json"`, and their JSON-escaped/spaced variants) — this branch fires regardless of HTTP status, because a router can report an upstream refusal inside a `200` error envelope just as readily as behind a `4xx`.

The `404` branch is deliberately narrow: `No endpoints found` is also OpenRouter's answer to an unknown model slug or to a data-policy refusal, and blaming structured outputs for a typo would point the user at the wrong setting, so the body has to name the capability, not just the missing endpoint. When the check matches, `onUnusableResponse` throws `LLM_PARSE_ERROR` with `details.reason = 'structured-output-routing-mismatch'` before the shared core's own generic error mapping runs; when it does not match, control falls through to that generic mapping and the failure surfaces as `UNKNOWN_ERROR`.

A follow-up review (2026-08-12) found and fixed two regressions in an earlier version of this heuristic — the `404` branch matching an unrelated unknown-model error, and the `200`-with-error-envelope case being unreachable — both closed in commit `54feec8` with dedicated regression tests (`tests/main/openrouter-provider.spec.ts`).

## Error Mapping

| Condition                                                                                          | AppError code                                                                  |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `status === 401` or `status === 403`                                                                 | `LLM_AUTH_ERROR`                                                                |
| `status === 429`                                                                                      | `LLM_RATE_LIMIT`                                                                |
| Response body matches the routing-mismatch heuristic and a schema was requested                     | `LLM_PARSE_ERROR` with `details.reason = 'structured-output-routing-mismatch'` |
| Request aborted and the timeout budget elapsed                                                       | `LLM_TIMEOUT`                                                                   |
| Request aborted by the caller's own signal (user cancel)                                             | `OPERATION_CANCELLED`                                                          |
| Body is not valid JSON                                                                               | `LLM_PARSE_ERROR`                                                               |
| Missing or empty `choices[0].message.content`                                                        | `LLM_PARSE_ERROR`                                                               |
| Any other non-2xx response                                                                            | `UNKNOWN_ERROR`                                                                 |

## Behavior Notes

- `testConnection()` reuses `chat()` with the shared lightweight probe (`TEST_CONNECTION_SYSTEM_PROMPT` / `TEST_CONNECTION_USER_MESSAGE`) rather than calling a separate health endpoint.
- Unlike [[wiki/entities/generic-provider]], this adapter does not expose a configurable base URL — OpenRouter's endpoint is fixed, only routing among upstream models is OpenRouter's concern.
- The provider accepts the router's `choices[0].message.content` as either a plain string or an array of `{type:'text',text}` parts, because a router can hand back the array shape its upstream produced; both are handled by the shared `extractMessageContent()`.
- `tests/main/openrouter-provider.spec.ts` only asserts what is genuinely OpenRouter-specific (API root, attribution headers, namespaced default model, `require_parameters`, and the routing-mismatch reading of a failing response); the fetch/parse/status-mapping/timeout behavior it shares with every other OpenAI-compatible provider is covered once in `tests/main/provider-shared.spec.ts`.

## Dependencies

- [[wiki/entities/llm-provider-interface]]
- [[wiki/entities/llm-schemas]]
- [[wiki/entities/provider-shared-utilities]] - `openAiCompatibleChat`, `assertApiKey`, `getProviderTimeout`, `throwAppError`, `toResponseBodyPreview`
- [[wiki/entities/shared-types]] - `AppError`
- native `fetch`

## See also

- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/llm-provider-section]]
- [[wiki/entities/generic-provider]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/concepts/provider-native-structured-output]]
- [[wiki/analyses/structured-output-routing-mismatch]]
- [[wiki/topics/llm-categorization-pipeline]]
