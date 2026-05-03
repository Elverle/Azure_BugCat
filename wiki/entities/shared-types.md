---
title: 'Shared Domain Types'
type: entity
subtype: model
created: 2026-04-29
updated: 2026-05-02
sources:
  [
    '[[wiki/sources/ft-01-scaffold]]',
    '[[wiki/sources/ft-02-settings]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-10-ai-cluster-similarity]]',
    '[[wiki/sources/ft-11-openrouter-provider]]'
  ]
tags: [typescript, types, shared, domain-model]
lang: en
---

## Description

Shared TypeScript type definitions used across main, preload, and renderer processes. Defines the domain model for bugs, settings, sessions, and errors.

## Location

`src/shared/types.ts`

## Types

### Core types

| Type              | Purpose                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| `LLMProviderType` | Union: `'openai' \| 'anthropic' \| 'generic' \| 'gemini' \| 'openrouter'` |
| `ErrorCode`       | Union of known error codes (ADO*\*, LLM*\_, STORE\_\_, UNKNOWN\_\*)       |

### Bug types

| Type             | Purpose                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `BugItem`        | Raw bug from Azure DevOps (id, title, state, assignee, areaPath, description, priority, dates, tags) |
| `CategorizedBug` | Extends `BugItem` with `macroCategory`, `subCategory`, `categoryReason`, `categorizedAt`             |

### Configuration

| Type          | Purpose                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| `AppSettings` | Full settings object, including shared `llmModel`, optional generic `baseUrl`, and the selected `llmProvider` |
| `SessionData` | Cached bug list with fetch/categorize timestamps plus optional `similarityResults` snapshot                   |

### Error & Progress

| Type            | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `AppError`      | Structured error with `code`, `message`, optional `details`   |
| `ChunkProgress` | Categorization progress: `total`, `completed`, `currentChunk` |

### LLM

| Type                  | Purpose                          |
| --------------------- | -------------------------------- |
| `LLMCategorizeResult` | Single bug categorization result |
| `LLMResponse`         | Array of categorization results  |

### Similarity analysis

| Type                       | Purpose                                                                     |
| -------------------------- | --------------------------------------------------------------------------- |
| `SimilarityGroup`          | One detected group with normalized score, reason, and participating bug IDs |
| `CategorySimilarityResult` | Similarity results for a single `macroCategory`, optionally with an error   |
| `SimilarityResult`         | Session-persisted aggregate result with `categories[]` and `analyzedAt`     |
| `SimilarityProgress`       | Per-category progress payload for the AI Cluster renderer                   |

### Connection Testing

| Type                   | Purpose                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `TestConnectionResult` | Structured response from test connection IPC: `{ success, message }` |

_Added in FT-02._ Used by test connection stubs in [[wiki/entities/ipc-handlers]] and consumed by [[wiki/entities/use-settings-hook]].

## FT-08 Notes

- `copilotAuthStatus` was removed from `AppSettings`; generic provider configuration now relies on `apiKey`, `baseUrl`, and optional `llmModel`.
- The settings shape intentionally remains backward-compatible with older persisted payloads because [[wiki/entities/store-migration]] upgrades legacy provider values during bootstrap.

## FT-10 Notes

- `SessionData` now acts as the shared persistence surface for both categorization and AI Cluster similarity analysis.
- Similarity-specific types live alongside categorization types because they cross the same main/preload/renderer boundary.

## FT-11 Notes

- `LLMProviderType` now includes `openrouter`, extending the cross-process provider selector without changing the IPC payload shape.
- `AppSettings.llmModel` remains the shared model override field for both SDK-backed providers and the generic OpenAI-compatible adapter.

## See also

- [[wiki/entities/electron-store]] — persists `AppSettings` and `SessionData`
- [[wiki/entities/ipc-handlers]] — serves settings/session over IPC
- [[wiki/topics/ai-cluster-similar-bug-detection]]
