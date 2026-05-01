---
title: 'LLM Prompts'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-05-01
sources: ['[[wiki/sources/ft-04-llm-provider]]', '[[wiki/sources/ft-09-structured-output]]']
tags: [llm, prompts, categorization, similar-bugs]
lang: en
---

## Description

Builder functions for the system prompts and user messages sent to LLM providers for categorization and similar-bug detection flows.

## Location

`src/main/llm/prompts.ts`

## Public API

| Function                       | Signature                                                        | Purpose                                                                                   |
| ------------------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `buildSystemPrompt`            | `(categories: string[]) -> string`                               | Builds the categorization system prompt with task rules and optional category constraints |
| `buildUserMessage`             | `(bugs: { id, title, description, tags? }[]) -> string`          | Serializes categorization input payload with tags included                                |
| `buildSimilarBugsSystemPrompt` | `() -> string`                                                   | Builds the duplicate/similar-bug detection prompt                                         |
| `buildSimilarBugsUserMessage`  | `(bugs: { id, title, description, macroCategory? }[]) -> string` | Serializes similar-bugs input payload                                                     |

## FT-09 Prompt Role

- Prompts still define the task, decision criteria, and allowed categories.
- Output-format language is now lighter because provider APIs enforce the JSON structure when `responseSchema` is passed.
- The prompt still asks for JSON-only output as a secondary guard in case a provider ignores or weakly applies structured-output settings.

## Categorization Prompt Structure

- Role: bilingual software quality analyst.
- Decision signals: title and tags first, description as supporting evidence.
- Category discipline: choose exactly one configured macro-category when a list is provided.
- Output guidance: return one result per input bug with `bugId`, `macroCategory`, `subCategory`, and `categoryReason`.

## See also

- [[wiki/entities/llm-service]]
- [[wiki/entities/llm-schemas]]
- [[wiki/concepts/provider-native-structured-output]]
- [[wiki/topics/llm-categorization-pipeline]]
