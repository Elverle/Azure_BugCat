---
title: 'LLM Schemas'
type: entity
subtype: model
created: 2026-05-01
updated: 2026-05-01
sources: ['[[wiki/sources/ft-09-structured-output]]']
tags: [llm, json-schema, structured-output, types]
lang: en
---

## Description

Shared schema registry for structured LLM outputs. Centralizes the JSON contracts used by providers when the orchestration layer requests schema-enforced responses.

## Location

`src/main/llm/schemas.ts`

## Exports

| Export                  | Purpose                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------- | --------------- |
| `CATEGORIZATION_SCHEMA` | JSON Schema for `{ results: [{ bugId, macroCategory, subCategory, categoryReason }] }` |
| `SIMILAR_BUGS_SCHEMA`   | JSON Schema for `{ groups: [{ similarityScore, reason, bugIds[] }] }`                  |
| `SchemaType`            | Logical schema selector union: `'categorization'                                       | 'similar-bugs'` |
| `getSchema(type)`       | Returns the matching schema object for provider adapters                               |

## Design Notes

- Both schemas use `additionalProperties: false` at the top level and nested item level.
- The module is provider-agnostic; concrete adapters decide how to encode the schema for each vendor API.
- `similar-bugs` is already modeled even though FT-09 wires the categorization path first, which keeps the abstraction ready for adjacent LLM workflows.

## Validation

`tests/main/llm-schemas.spec.ts` verifies top-level requirements, nested required fields, property types, and `getSchema()` dispatch.

## See also

- [[wiki/entities/llm-provider-interface]]
- [[wiki/entities/llm-service]]
- [[wiki/concepts/provider-native-structured-output]]
- [[wiki/topics/llm-categorization-pipeline]]
