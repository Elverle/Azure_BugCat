---
title: 'LLM Provider Interface'
type: entity
subtype: model
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-04-llm-provider]]']
tags: [llm, interface, types]
lang: en
---

## Description

Core type definitions for the LLM provider abstraction layer. Defines the contract all providers must implement and supporting types.

## Location

`src/main/llm/types.ts`

## Types

### LLMProvider (interface)

```typescript
interface LLMProvider {
  readonly name: string
  chat(systemPrompt: string, userMessage: string): Promise<string>
  testConnection(): Promise<void>
}
```

### LLMProviderConfig

```typescript
interface LLMProviderConfig {
  apiKey?: string
  model?: string
  timeout?: number
}
```

### ChunkInput / ChunkResult

Supporting types for chunk processing (used internally by orchestration).

## See also

- [[wiki/entities/llm-provider-factory]]
- [[wiki/concepts/llm-provider-abstraction]]
