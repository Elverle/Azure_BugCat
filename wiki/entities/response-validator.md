---
title: 'Response Validator'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-04-llm-provider]]']
tags: [llm, validation, json-parsing]
lang: en
---

## Description

Validates and normalizes raw LLM string responses into typed `LLMCategorizeResult[]`. Handles markdown fence stripping, JSON parsing, schema validation, and graceful fallback for missing/malformed results.

## Location

`src/main/llm/response-validator.ts`

## Public API

```typescript
function validateLLMResponse(raw: string, chunkBugs: BugItem[]): LLMCategorizeResult[]
```

## Processing Pipeline

1. **Strip markdown fences** — Removes opening ` ```json ` and closing ` ``` ` markers (LLMs often wrap JSON in code fences despite instructions).
2. **Parse JSON** — Attempts `JSON.parse()`. On failure → returns fallback for all bugs.
3. **Validate structure** — Checks `parsed.results` is an array. On failure → returns fallback.
4. **Map results** — Iterates `parsed.results`, builds Map by `bugId` (skips entries where `typeof bugId !== 'number'`).
5. **Ensure completeness** — For each bug in the chunk, looks up in Map. Missing bugs get fallback categories.

## Fallback Behavior

When parsing fails or a bug is missing from the response:

- `macroCategory`: `'Non categorizzato'`
- `subCategory`: `'Errore parsing'` or `'Nessuna risposta LLM'`
- `categoryReason`: `'N/D'`

## See also

- [[wiki/entities/llm-service]]
- [[wiki/concepts/chunk-retry-pattern]]
- [[wiki/topics/llm-categorization-pipeline]]
