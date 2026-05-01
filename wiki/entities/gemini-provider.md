---
title: 'Gemini Provider'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-05-01
sources: ['[[wiki/sources/ft-04-llm-provider]]', '[[wiki/sources/ft-09-structured-output]]']
tags: [llm, gemini, google, provider]
lang: en
---

## Description

LLM provider implementation for Google Gemini. Uses `@google/genai` with `gemini-2.5-flash` as default model and forwards shared JSON Schema contracts through Gemini's native response-schema configuration.

## Location

`src/main/llm/providers/gemini-provider.ts`

## Configuration

- **API Key**: Required (throws `LLM_AUTH_ERROR` if missing)
- **Model**: `config.model ?? 'gemini-2.5-flash'`
- **Temperature**: `0.1`
- **Timeout**: 60s via `AbortController` passed as `config.abortSignal`

## Structured Output

- Uses `models.generateContent()` with `systemInstruction` in config.
- When `options.responseSchema` is present, sets `responseMimeType: 'application/json'` and `responseSchema: getSchema(...)`.
- Extracts the final body through `response.text`.

## Error Mapping

Uses string matching on error messages:

- `429` or `RESOURCE_EXHAUSTED` -> `LLM_RATE_LIMIT`
- `401` / `403` or `API_KEY_INVALID` -> `LLM_AUTH_ERROR`
- `AbortError` -> `LLM_TIMEOUT`

## See also

- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/llm-schemas]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/concepts/provider-native-structured-output]]
