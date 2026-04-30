---
title: 'Chunking Utility'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-04-llm-provider]]']
tags: [llm, chunking, utility]
lang: en
---

## Description

Splits an array of bugs into fixed-size chunks for batch LLM processing. Avoids token limit issues by controlling how many bugs are sent per request.

## Location

`src/main/llm/chunking.ts`

## Public API

```typescript
function splitIntoChunks(bugs: BugItem[], chunkSize: number): BugItem[][]
```

## Behavior

- If `chunkSize <= 0`, returns a single chunk containing all bugs (no splitting).
- Otherwise slices the array into sequential chunks of `chunkSize` elements.

## See also

- [[wiki/entities/llm-service]]
- [[wiki/concepts/chunk-retry-pattern]]
