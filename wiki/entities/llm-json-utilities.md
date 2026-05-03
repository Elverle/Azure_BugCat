---
title: 'LLM JSON Utilities'
type: entity
subtype: service
created: 2026-05-03
updated: 2026-05-03
sources: ['[[wiki/analyses/llm-provider-cleanup]]']
tags: [llm, json, parsing, validation]
lang: en
---

## Description

Shared tolerant JSON parsing helpers for LLM responses. The module strips markdown fences, extracts the first balanced JSON object or array from prose-wrapped output, and exposes a single `parseLlmJson()` entry point reused by categorization and similarity flows.

## Location

`src/main/llm/llm-json.ts`

## Exports

- `stripMarkdownFences(text)`
- `extractJsonCandidate(text)`
- `parseLlmJson(raw)`

## Behavior

- Removes optional ```json fences and BOM prefixes.
- Accepts responses where the model adds explanatory text before or after the JSON payload.
- Returns `null` instead of throwing when no valid JSON candidate can be parsed.

## Used By

- [[wiki/entities/response-validator]]
- [[wiki/entities/similarity-service]]

## See also

- [[wiki/entities/llm-schemas]]
- [[wiki/topics/llm-categorization-pipeline]]
- [[wiki/analyses/llm-provider-cleanup]]
