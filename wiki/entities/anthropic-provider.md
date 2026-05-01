---
title: 'Anthropic Provider'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-05-01
sources: ['[[wiki/sources/ft-04-llm-provider]]', '[[wiki/sources/ft-09-structured-output]]']
tags: [llm, anthropic, provider]
lang: en
---

## Description

LLM provider implementation for Anthropic Claude. Uses `@anthropic-ai/sdk` with `claude-sonnet-4.6` as default model and maps the shared schema contract onto Anthropic's tool-use API.

## Location

`src/main/llm/providers/anthropic-provider.ts`

## Configuration

- **API Key**: Required (throws `LLM_AUTH_ERROR` if missing)
- **Model**: `config.model ?? 'claude-sonnet-4.6'`
- **Max tokens**: `4096`
- **Temperature**: `0.1`
- **Timeout**: 60s via `AbortController`

## Structured Output

- Uses top-level `system` instead of a system message inside `messages`.
- When `options.responseSchema` is present, registers a single tool with `input_schema: getSchema(...)` and forces execution with `tool_choice`.
- Returns `JSON.stringify(toolUseBlock.input)` when Anthropic emits a `tool_use` block.
- Falls back to plain text extraction when no tool block is returned.

## Error Mapping

Same pattern as [[wiki/entities/openai-provider]] - SDK-specific status codes are normalized into the shared `AppError` taxonomy.

## See also

- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/llm-schemas]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/concepts/provider-native-structured-output]]
