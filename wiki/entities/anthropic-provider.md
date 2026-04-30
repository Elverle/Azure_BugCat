---
title: 'Anthropic Provider'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-04-llm-provider]]']
tags: [llm, anthropic, provider]
lang: en
---

## Description

LLM provider implementation for Anthropic Claude. Uses `@anthropic-ai/sdk` with `claude-sonnet-4-20250514` as default model.

## Location

`src/main/llm/providers/anthropic-provider.ts`

## Configuration

- **API Key**: Required (throws `LLM_AUTH_ERROR` if missing)
- **Model**: `config.model ?? 'claude-sonnet-4-20250514'`
- **Max tokens**: `4096`
- **Timeout**: 60s via `AbortController`

## Implementation Notes

- Uses `system` parameter (top-level) instead of a system message in the messages array (Anthropic API convention).
- Extracts response from `content[].type === 'text'` block.

## Error Mapping

Same pattern as [[wiki/entities/openai-provider]] — maps SDK errors to typed `AppError` codes.

## See also

- [[wiki/entities/llm-provider-factory]]
- [[wiki/concepts/llm-provider-abstraction]]
