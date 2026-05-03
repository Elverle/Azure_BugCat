---
title: 'LLM Error Policy'
type: entity
subtype: service
created: 2026-05-03
updated: 2026-05-03
sources: ['[[wiki/analyses/llm-provider-cleanup]]']
tags: [llm, errors, policy, orchestration]
lang: en
---

## Description

Shared classification helper for deciding which provider failures must stop an entire LLM workflow instead of degrading locally.

## Location

`src/main/llm/error-policy.ts`

## Public API

```typescript
function isBlockingLLMError(error: AppError): boolean
```

## Current Blocking Conditions

- `LLM_AUTH_ERROR`
- `LLM_TIMEOUT`
- `LLM_PARSE_ERROR` with `details.reason === 'structured-output-routing-mismatch'`

## Role in the System

- [[wiki/entities/llm-service]] uses this policy to stop categorization runs when continuing would hide an infrastructure or credential problem.
- [[wiki/entities/similarity-service]] now reuses the same rule instead of treating every provider failure as a category-local warning.

## See also

- [[wiki/entities/llm-service]]
- [[wiki/entities/similarity-service]]
- [[wiki/analyses/structured-output-routing-mismatch]]
- [[wiki/analyses/llm-provider-cleanup]]
