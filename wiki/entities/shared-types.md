---
title: 'Shared Domain Types'
type: entity
subtype: model
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-01-scaffold]]']
tags: [typescript, types, shared, domain-model]
lang: en
---

## Description

Shared TypeScript type definitions used across main, preload, and renderer processes. Defines the domain model for bugs, settings, sessions, and errors.

## Location

`src/shared/types.ts`

## Types

### Core types

| Type              | Purpose                                                           |
| ----------------- | ----------------------------------------------------------------- |
| `LLMProviderType` | Union: `'openai' \| 'anthropic' \| 'github-copilot' \| 'gemini'`  |
| `ErrorCode`       | Union of known error codes (ADO*\*, LLM*_, STORE\__, UNKNOWN\_\*) |

### Bug types

| Type             | Purpose                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `BugItem`        | Raw bug from Azure DevOps (id, title, state, assignee, areaPath, description, priority, dates, tags) |
| `CategorizedBug` | Extends `BugItem` with `macroCategory`, `subCategory`, `categoryReason`, `categorizedAt`             |

### Configuration

| Type          | Purpose                                                                         |
| ------------- | ------------------------------------------------------------------------------- |
| `AppSettings` | Full settings object (ADO connection, LLM provider, API keys, categories, etc.) |
| `SessionData` | Cached bug list with fetch/categorize timestamps                                |

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

## See also

- [[wiki/entities/electron-store]] — persists `AppSettings` and `SessionData`
- [[wiki/entities/ipc-handlers]] — serves settings/session over IPC
