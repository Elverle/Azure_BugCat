---
title: 'Gemini Provider'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-04-llm-provider]]']
tags: [llm, gemini, google, provider]
lang: en
---

## Description

LLM provider implementation for Google Gemini. Uses `@google/genai` SDK with `gemini-2.5-flash` as default model.

## Location

`src/main/llm/providers/gemini-provider.ts`

## Configuration

- **API Key**: Required (throws `LLM_AUTH_ERROR` if missing)
- **Model**: `config.model ?? 'gemini-2.5-flash'`
- **Timeout**: 60s via `AbortController` passed as `config.abortSignal`

## Implementation Notes

- Uses `models.generateContent()` with `systemInstruction` in config (Google GenAI API convention).
- Response text extracted via `response.text`.

## Error Mapping

Uses string matching on error messages:

- `429` or `RESOURCE_EXHAUSTED` → `LLM_RATE_LIMIT`
- `401`/`403` or `API_KEY_INVALID` → `LLM_AUTH_ERROR`
- AbortError → `LLM_TIMEOUT`

## See also

- [[wiki/entities/llm-provider-factory]]
- [[wiki/concepts/llm-provider-abstraction]]
