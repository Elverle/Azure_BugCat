---
title: 'LLM Provider Abstraction'
type: concept
created: 2026-04-30
updated: 2026-05-01
sources: ['[[wiki/sources/ft-04-llm-provider]]', '[[wiki/sources/ft-08-generic-provider]]']
tags: [llm, design-pattern, factory-pattern, strategy-pattern]
lang: en
---

## Definition

A polymorphic provider abstraction allowing the application to switch between multiple LLM backends (OpenAI, Anthropic, Generic OpenAI-compatible, Gemini) at runtime without changing orchestration code.

## Pattern

Combines **Strategy Pattern** (runtime-swappable behavior via `LLMProvider` interface) with a **Simple Factory** (`createLLMProvider`) for instantiation. No DI framework — just a switch statement mapping type strings to concrete classes.

## Interface Contract

```typescript
interface LLMProvider {
  readonly name: string
  chat(systemPrompt: string, userMessage: string): Promise<string>
  testConnection(): Promise<void>
}
```

All providers:

- Accept system + user message, return raw string
- Implement 60s timeout via `AbortController`
- Map SDK-specific errors to a unified `AppError` taxonomy
- Validate required configuration at construction

## Implementation in This Project

```
LLMProviderType (settings) → createLLMProvider() → LLMProvider instance
                                    ↓
         OpenAIProvider | AnthropicProvider | GenericProvider | GeminiProvider
```

Each provider presents the same interface to `llm-service.ts`; FT-08 shows that the abstraction is not limited to SDK-backed implementations because `GenericProvider` uses raw `fetch()`.

## Trade-offs

| Advantage                             | Disadvantage                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| Easy to add new providers             | `throwAppError`/`isAppError` duplicated in each provider (DRY violation)                 |
| Runtime switching from settings       | No shared base class for common timeout/error logic                                      |
| Clean separation of transport details | Provider-specific validation still lives in concrete classes (`baseUrl`, SDK auth, etc.) |

## Extensibility

To add a new provider:

1. Create `src/main/llm/providers/new-provider.ts` implementing `LLMProvider`
2. Add case to `provider-factory.ts` switch
3. Add type to `LLMProviderType` union in `shared/types.ts`

## See also

- [[wiki/entities/llm-provider-interface]]
- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/openai-provider]]
- [[wiki/entities/anthropic-provider]]
- [[wiki/entities/generic-provider]]
- [[wiki/entities/gemini-provider]]
- [[wiki/topics/llm-categorization-pipeline]]
