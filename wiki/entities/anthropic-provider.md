---
title: 'Anthropic Provider'
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
- **Timeout**: `config.timeout ?? 60000`, enforced through the shared request-timeout helper and any upstream cancellation signal

## Structured Output

- Uses top-level `system` instead of a system message inside `messages`.
- When `options.responseSchema` is present, registers a single tool with `input_schema: getSchema(...)` and forces execution with `tool_choice`.
- Tool names and descriptions now come from [[wiki/entities/provider-shared-utilities]] so the schema-to-tool mapping stays aligned with the other providers.
- Returns `JSON.stringify(toolUseBlock.input)` when Anthropic emits a `tool_use` block.
- Falls back to plain text extraction when no tool block is returned.

## Validation

`tests/main/anthropic-provider.spec.ts` covers constructor validation, tool-use structured output, text fallback extraction, status-code mapping, empty payloads, and timeout abortion.

## Error Mapping

Same pattern as [[wiki/entities/openai-provider]] - SDK-specific status codes are normalized into the shared `AppError` taxonomy, and `AbortError` is now split into `OPERATION_CANCELLED` vs `LLM_TIMEOUT` based on the merged timeout helper.

## See also

- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/llm-schemas]]
- [[wiki/entities/provider-shared-utilities]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/concepts/provider-native-structured-output]]
