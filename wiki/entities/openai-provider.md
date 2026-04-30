---
title: 'OpenAI Provider'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-04-llm-provider]]']
tags: [llm, openai, provider]
lang: en
---

## Description

LLM provider implementation for OpenAI. Uses the official `openai` SDK with `gpt-4o` as default model.

## Location

`src/main/llm/providers/openai-provider.ts`

## Configuration

- **API Key**: Required at construction time (throws `LLM_AUTH_ERROR` if missing)
- **Model**: `config.model ?? 'gpt-4o'`
- **Temperature**: `0.2` (deterministic categorization)
- **Timeout**: 60s via `AbortController`

## Error Mapping

| SDK condition  | AppError code     |
| -------------- | ----------------- |
| HTTP 429       | `LLM_RATE_LIMIT`  |
| HTTP 401/403   | `LLM_AUTH_ERROR`  |
| AbortError     | `LLM_TIMEOUT`     |
| Empty response | `LLM_PARSE_ERROR` |
| Other          | `UNKNOWN_ERROR`   |

## See also

- [[wiki/entities/llm-provider-factory]]
- [[wiki/concepts/llm-provider-abstraction]]
