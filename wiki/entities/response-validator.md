---
title: 'Response Validator'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-08-18
sources:
  [
    '[[wiki/sources/ft-04-llm-provider]]',
    '[[wiki/sources/ft-09-structured-output]]',
    '[[wiki/analyses/llm-provider-cleanup]]'
  ]
tags: [llm, validation, json-parsing]
lang: en
---

## Description

Validates and normalizes raw LLM string responses into typed `LLMCategorizeResult[]`. Handles tolerant JSON parsing, structure checks, and graceful fallback for missing or malformed results.

## Location

`src/main/llm/response-validator.ts`

## Public API

```typescript
function validateLLMResponse(raw: string, chunkBugs: BugItem[]): LLMCategorizeResult[]
```

## Processing Pipeline

1. **Parse tolerant JSON** - Reuses [[wiki/entities/llm-json-utilities]] to strip fences, remove BOM markers, and recover the first valid JSON object or array from prose-wrapped model output.
2. **Parse JSON** - If no candidate can be parsed, returns a fallback result for every bug in the chunk.
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

All fallback values are the machine sentinels from [[wiki/entities/categorization-sentinels]], never the raw strings shown to the user — the renderer maps them to labels through `sentinelLabel()`.

- When the raw response cannot be parsed as JSON, or `results` (or a recognized alias) is not an array: every bug in the chunk gets `macroCategory: UNCATEGORIZED`, `technicalLayer: PARSE_ERROR`, `categoryReason: NOT_AVAILABLE`.
- When a bug is present in `chunkBugs` but absent from the parsed response: `macroCategory: UNCATEGORIZED`, `technicalLayer: NO_LLM_RESPONSE`, `categoryReason: NOT_AVAILABLE`.
- When a result item exists for the bug but omits (or blanks) one of its own string fields: `getStringField()` falls back to `NOT_AVAILABLE` for `macroCategory` and `categoryReason` individually, and `normalizeTechnicalLayer()` falls back to `'Undetermined'` for `technicalLayer`.

`macroCategory` and `technicalLayer` also accept several field-name aliases from the model's raw JSON (`macro_category`/`category`/`macro`, and the legacy pre-rename `subCategory`/`sub_category`/`subcategory` alongside `technicalLayer`/`technical_layer`), so a model that still answers with the pre-FT rename shape keeps working.

**Known limitation:** because `getStringField()`'s fallback for a present-but-empty `macroCategory` field is `NOT_AVAILABLE`, a pre-sentinel-split store could hold the literal string `'N/D'` in `macroCategory` (the Italian text that constant used to hold). The v4 store migration does not convert that value — see [[wiki/entities/store-migration]] and [[wiki/concepts/schema-versioned-store-migration]] for why.

## See also

- [[wiki/entities/llm-service]]
- [[wiki/entities/llm-json-utilities]]
- [[wiki/entities/categorization-sentinels]]
- [[wiki/concepts/sentinel-value-label-separation]]
- [[wiki/concepts/chunk-retry-pattern]]
- [[wiki/concepts/provider-native-structured-output]]
- [[wiki/topics/llm-categorization-pipeline]]
