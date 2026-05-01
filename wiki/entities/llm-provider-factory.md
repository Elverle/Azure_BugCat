---
title: 'LLM Provider Factory'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-05-01
sources: ['[[wiki/sources/ft-04-llm-provider]]', '[[wiki/sources/ft-08-generic-provider]]']
tags: [llm, factory-pattern, main-process]
lang: en
---

## Description

Factory function that instantiates the correct `LLMProvider` implementation based on the `LLMProviderType` string from settings. Uses a simple switch statement — no registry or DI container.

## Location

`src/main/llm/provider-factory.ts`

## Public API

```typescript
function createLLMProvider(type: LLMProviderType, config: LLMProviderConfig): LLMProvider
```

## Supported Providers

| Type string   | Class               | Transport / SDK     |
| ------------- | ------------------- | ------------------- |
| `'openai'`    | `OpenAIProvider`    | `openai`            |
| `'anthropic'` | `AnthropicProvider` | `@anthropic-ai/sdk` |
| `'generic'`   | `GenericProvider`   | native `fetch()`    |
| `'gemini'`    | `GeminiProvider`    | `@google/genai`     |

Throws `UNKNOWN_ERROR` for unsupported provider type.

## Dependencies

- [[wiki/entities/openai-provider]]
- [[wiki/entities/anthropic-provider]]
- [[wiki/entities/generic-provider]]
- [[wiki/entities/gemini-provider]]

## See also

- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/entities/llm-service]]
