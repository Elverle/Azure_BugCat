---
title: 'LLM Provider Interface'
type: entity
subtype: model
created: 2026-04-30
updated: 2026-05-03
sources:
  [
    '[[wiki/sources/ft-04-llm-provider]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-09-structured-output]]',
    '[[wiki/analyses/llm-provider-cleanup]]',
    '[[wiki/analyses/cancel-categorization-flow]]'
  ]
tags: [llm, interface, types]
lang: en
---

## Description

Core type definitions for the LLM provider abstraction layer. Defines the contract all providers must implement, the transport-neutral configuration surface, and the schema-aware chat options introduced in FT-09.

## Location

`src/main/llm/types.ts`

## Types

### LLMProvider (interface)

```typescript
interface LLMProvider {
  readonly name: string
  chat(systemPrompt: string, userMessage: string, options?: ChatOptions): Promise<string>
  testConnection(): Promise<void>
}
```

### ChatOptions

```typescript
interface ChatOptions {
  responseSchema?: SchemaType
  signal?: AbortSignal
}
```

This keeps the orchestration layer focused on output intent plus cooperative cancellation instead of vendor request syntax.

### LLMProviderConfig

```typescript
interface LLMProviderConfig {
  apiKey?: string
  model?: string
  baseUrl?: string
  timeout?: number
}
```

`timeout` is now honored consistently by all current providers through shared helper logic, and `ChatOptions.signal` lets the orchestrator propagate user-triggered cancellation without changing the provider interface itself.

### SchemaType

Logical selector for shared output contracts: `'categorization' | 'similar-bugs'`.

### ChunkInput / ChunkResult

Supporting types for chunk processing used internally by the orchestration layer.

## See also

- [[wiki/entities/llm-schemas]]
- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/provider-shared-utilities]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/concepts/provider-native-structured-output]]
