---
title: 'LLM Prompts'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-04-llm-provider]]']
tags: [llm, prompts, categorization]
lang: en
---

## Description

Builder functions for the system prompt and user message sent to LLM providers during categorization.

## Location

`src/main/llm/prompts.ts`

## Public API

| Function            | Signature                                       | Purpose                                                                    |
| ------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| `buildSystemPrompt` | `(categories: string[]) → string`               | Builds the system prompt with JSON schema and optional category constraint |
| `buildUserMessage`  | `(bugs: { id, title, description }[]) → string` | Serializes bugs as JSON payload                                            |

## System Prompt Structure

- Role: "software quality analyst"
- Output format: JSON only, no markdown, no preamble
- Schema: `{ "results": [{ "bugId", "macroCategory", "subCategory", "categoryReason" }] }`
- If `categories.length > 0`: constrains to provided categories list
- If empty: allows free-form categorization

## User Message

Minimal payload: `Categorize these bugs:\n` + JSON array of `{ id, title, description }`.

## See also

- [[wiki/entities/llm-service]]
- [[wiki/topics/llm-categorization-pipeline]]
