---
title: 'Chunk & Retry Pattern'
type: concept
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-04-llm-provider]]']
tags: [llm, resilience, chunking, retry, exponential-backoff]
lang: en
---

## Definition

A two-layer resilience strategy for LLM-based batch processing:

1. **Chunking** — splits large bug lists into manageable batches to stay within token limits
2. **Retry with exponential backoff** — retries rate-limited requests with increasing delays

## Chunking Layer

```typescript
splitIntoChunks(bugs: BugItem[], chunkSize: number): BugItem[][]
```

- Chunk size is user-configurable via settings (`settings.chunkSize`)
- Each chunk is processed independently — failure in one chunk does not abort others
- Progressive results are reported per-chunk via `onProgress` callback

## Retry Layer

```typescript
chatWithRetry(provider, systemPrompt, userMessage): Promise<string>
```

- **Retries only on**: `LLM_RATE_LIMIT` errors
- **Max attempts**: 4 (1 initial + 3 retries)
- **Delay schedule**: `[2000ms, 4000ms, 8000ms]` (exponential)
- **Non-retryable errors**: `LLM_AUTH_ERROR`, `LLM_TIMEOUT` → thrown immediately

## Error Escalation

```
Per-request: retry on rate-limit
Per-chunk: catch errors → fallback results ("Non categorizzato")
Per-session: LLM_AUTH_ERROR or LLM_TIMEOUT → abort entire categorization
```

## Progressive Updates

After each chunk completes (success or fallback), the service emits:

```typescript
interface ChunkProgress {
  total: number // total chunks
  completed: number // chunks done so far
  currentChunk: CategorizedBug[] // results from this chunk
}
```

Delivered to renderer via `event.sender.send(IPC_CHANNELS.LLM_CATEGORIZE_PROGRESS, progress)`.

## Trade-offs

| Advantage                                         | Disadvantage                                                      |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| Graceful degradation — partial results on failure | Fixed delay schedule (not adaptive to server retry-after headers) |
| User sees progress incrementally                  | No per-bug retry (whole chunk retried)                            |
| Token limits avoided via chunking                 | Chunk boundaries may split related bugs                           |

## See also

- [[wiki/entities/llm-service]]
- [[wiki/entities/chunking-utility]]
- [[wiki/entities/response-validator]]
- [[wiki/topics/llm-categorization-pipeline]]
