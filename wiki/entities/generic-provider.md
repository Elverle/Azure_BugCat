---
title: 'Generic Provider'
type: entity
subtype: service
created: 2026-05-01
updated: 2026-05-03
sources:
  [
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-09-structured-output]]',
    '[[wiki/analyses/llm-provider-cleanup]]',
    '[[wiki/analyses/cancel-categorization-flow]]'
  ]
tags: [llm, provider, openai-compatible, fetch]
lang: en
---

## Description

LLM provider implementation for any OpenAI-compatible HTTP endpoint. Unlike the SDK-backed providers, this class uses raw `fetch()` against `POST {baseUrl}/chat/completions`, which makes the backend configurable from settings without introducing a provider-specific dependency.

## Location

`src/main/llm/providers/generic-provider.ts`

## Configuration

- **API Key**: Required
- **Base URL**: Required; trailing slashes are stripped before appending `/chat/completions`
- **Model**: `config.model ?? 'gpt-4o'`
- **Timeout**: `config.timeout ?? 60000`, merged with any upstream cancellation signal through the shared timeout helper

## Behavior

1. Validates `apiKey` and `baseUrl` at construction time.
2. Enforces URL scheme in the main process: `https:` is required, except `http:` is allowed for `localhost` and `127.0.0.1`.
3. Sends OpenAI-compatible payloads with `model`, `messages`, `temperature: 0.1`, optional `response_format` when `responseSchema` is requested, and a merged abort signal.
4. Parses `choices[0].message.content` from the JSON response.
5. Exposes `testConnection()` by reusing the same chat path with a lightweight prompt.

## Structured Output

Uses the same `response_format.json_schema` contract as [[wiki/entities/openai-provider]], but emits it over plain HTTP instead of an SDK wrapper. Schema-name metadata and test-connection prompt strings are now aligned with the SDK-backed providers through [[wiki/entities/provider-shared-utilities]].

## Error Mapping

- `401` / `403` -> `LLM_AUTH_ERROR`
- `429` -> `LLM_RATE_LIMIT`
- `AbortError` after user cancel -> `OPERATION_CANCELLED`
- `AbortError` after timeout budget -> `LLM_TIMEOUT`
- Non-JSON or empty response body -> `LLM_PARSE_ERROR`
- Other failures -> `UNKNOWN_ERROR`

## Security Notes

- Renderer-side validation improves UX, but the authoritative URL-scheme enforcement lives here in the main process.
- Error messages do not include the API key or request payload.

## Dependencies

- [[wiki/entities/llm-provider-interface]]
- [[wiki/entities/llm-schemas]]
- [[wiki/entities/provider-shared-utilities]]
- [[wiki/entities/shared-types]] - `AppError`
- native `fetch`, `URL`, `AbortController`

## See also

- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/llm-service]]
- [[wiki/entities/validation-utils]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/concepts/provider-native-structured-output]]
- [[wiki/topics/llm-categorization-pipeline]]
