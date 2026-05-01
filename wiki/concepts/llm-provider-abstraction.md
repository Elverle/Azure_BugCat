---
title: 'LLM Provider Abstraction'
type: concept
created: 2026-04-30
updated: 2026-05-01
sources:
  [
    '[[wiki/sources/ft-04-llm-provider]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-09-structured-output]]'
  ]
tags: [llm, design-pattern, factory-pattern, strategy-pattern]
lang: en
---

## Definition

A polymorphic provider abstraction allowing the application to switch between multiple LLM backends (OpenAI, Anthropic, Generic OpenAI-compatible, Gemini) at runtime without changing orchestration code.

## Pattern

Combines **Strategy Pattern** (runtime-swappable behavior via `LLMProvider` interface) with a **Simple Factory** (`createLLMProvider`) for instantiation. No DI framework, just a switch statement mapping provider identifiers to concrete classes.

## Interface Contract

```typescript
interface LLMProvider {
  readonly name: string
  chat(systemPrompt: string, userMessage: string, options?: ChatOptions): Promise<string>
  testConnection(): Promise<void>
}
```

All providers:

- accept system + user message and return a raw string,
- implement a 60 s timeout via `AbortController`,
- map provider-specific failures to the shared `AppError` taxonomy,
- validate required configuration at construction,
- optionally interpret `ChatOptions.responseSchema` using provider-native structured-output features.

## Implementation in This Project

```text
LLMProviderType (settings) -> createLLMProvider() -> LLMProvider instance
                                      |
                                      +-> OpenAIProvider
                                      +-> AnthropicProvider
                                      +-> GenericProvider
                                      +-> GeminiProvider
```

FT-08 proved the abstraction works across SDK and raw-HTTP adapters. FT-09 extends that same abstraction with schema-aware output intent without leaking vendor syntax into `llm-service.ts`.

## Trade-offs

| Advantage                                          | Disadvantage                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| Easy to add new providers                          | `throwAppError` / `isAppError` remain duplicated across providers             |
| Runtime switching from settings                    | No shared base class for common timeout or error helpers                      |
| Clean separation of transport details              | Provider-specific schema translation still lives in concrete classes          |
| Structured output stays behind a neutral interface | The common return type is still `string`, so validation remains a second pass |

## Extensibility

To add a new provider:

1. Create `src/main/llm/providers/new-provider.ts` implementing `LLMProvider`.
2. Add a case to `provider-factory.ts`.
3. Add the new type to `LLMProviderType` in `shared/types.ts`.
4. If the provider supports structured output, map `ChatOptions.responseSchema` to its native request format.

## See also

- [[wiki/entities/llm-provider-interface]]
- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/openai-provider]]
- [[wiki/entities/anthropic-provider]]
- [[wiki/entities/generic-provider]]
- [[wiki/entities/gemini-provider]]
- [[wiki/concepts/provider-native-structured-output]]
- [[wiki/topics/llm-categorization-pipeline]]
