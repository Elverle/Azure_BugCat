---
title: 'Generic Provider'
type: entity
subtype: service
created: 2026-05-01
updated: 2026-05-01
sources: ['[[wiki/sources/ft-08-generic-provider]]']
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
- **Timeout**: `config.timeout ?? 60000`

## Behavior

1. Validates `apiKey` and `baseUrl` at construction time.
2. Enforces URL scheme in the main process: `https:` is required, except `http:` is allowed for `localhost` and `127.0.0.1`.
3. Sends standard OpenAI-compatible payloads with `model`, `messages`, and `temperature: 0.2`.
4. Parses `choices[0].message.content` from the JSON response.
5. Exposes `testConnection()` by reusing the same chat path with a lightweight prompt.

## Error Mapping

- `401` / `403` → `LLM_AUTH_ERROR`
- `429` → `LLM_RATE_LIMIT`
- `AbortError` → `LLM_TIMEOUT`
- Non-JSON or empty response body → `LLM_PARSE_ERROR`
- Other failures → `UNKNOWN_ERROR`

## Security Notes

- Renderer-side validation improves UX, but the authoritative URL-scheme enforcement lives here in the main process.
- Error messages do not include the API key or request payload.

## Dependencies

- [[wiki/entities/llm-provider-interface]]
- [[wiki/entities/shared-types]] — `AppError`
- native `fetch`, `URL`, `AbortController`

## See also

- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/llm-service]]
- [[wiki/entities/validation-utils]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/topics/llm-categorization-pipeline]]
