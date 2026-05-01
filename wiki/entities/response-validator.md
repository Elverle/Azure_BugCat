---
title: 'Response Validator'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-05-01
sources: ['[[wiki/sources/ft-04-llm-provider]]', '[[wiki/sources/ft-09-structured-output]]']
tags: [llm, validation, json-parsing]
lang: en
---

## Description

Validates and normalizes raw LLM string responses into typed `LLMCategorizeResult[]`. Handles markdown fence stripping, JSON parsing, structure checks, and graceful fallback for missing or malformed results.

## Location

`src/main/llm/response-validator.ts`

## Public API

```typescript
function validateLLMResponse(raw: string, chunkBugs: BugItem[]): LLMCategorizeResult[]
```

## Processing Pipeline

1. **Strip markdown fences** - Removes opening ` ```json ` and closing ` ``` ` markers when providers still wrap JSON in code fences.
2. **Parse JSON** - Attempts `JSON.parse()`. On failure, returns a fallback result for every bug in the chunk.
3. **Validate structure** - Checks that `parsed.results` is an array.
4. **Map results** - Builds a `Map` by `bugId`, skipping invalid entries.
5. **Ensure completeness** - Any bug missing from the response receives fallback categories.

## FT-09 Role

Structured output now shifts most shape enforcement into provider APIs, but this validator remains necessary because it covers:

- providers that ignore or partially respect schema settings,
- empty or truncated payloads,
- missing bug rows inside otherwise valid JSON,
- any future flows that still return free-form text.

## Fallback Behavior

When parsing fails or a bug is missing from the response:

- `macroCategory`: `'Non categorizzato'`
- `subCategory`: `'Errore parsing'` or `'Nessuna risposta LLM'`
- `categoryReason`: `'N/D'`

## See also

- [[wiki/entities/llm-service]]
- [[wiki/concepts/chunk-retry-pattern]]
- [[wiki/concepts/provider-native-structured-output]]
- [[wiki/topics/llm-categorization-pipeline]]
