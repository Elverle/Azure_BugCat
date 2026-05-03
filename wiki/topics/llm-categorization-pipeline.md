---
title: 'LLM Categorization Pipeline'
type: topic
created: 2026-04-30
updated: 2026-05-03
sources:
  [
    '[[wiki/sources/ft-04-llm-provider]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-09-structured-output]]',
    '[[wiki/sources/ft-10-ai-cluster-similarity]]',
    '[[wiki/sources/ft-11-openrouter-provider]]',
    '[[wiki/analyses/cancel-categorization-flow]]',
    '[[wiki/analyses/dashboard-categorization-state-recovery]]'
  ]
tags: [llm, categorization, similarity, pipeline, ipc, main-process]
lang: en
---

## Overview

End-to-end pipeline for categorizing Azure DevOps bugs via LLM. Runs entirely in the Electron Main Process, triggered by IPC from the renderer, with progressive chunk results pushed back via `event.sender`.

## Architecture

```text
RENDERER
  invoke('llm:categorize') ------------------------+
  invoke('llm:categorize-cancel') ---------------+ |
  on('llm:categorize-progress') <--- chunk updates |
                                                 | |
MAIN PROCESS                                       |
  IPC handler                                      |
    -> load settings + session bugs                |
    -> register AbortController per webContents <-+ |
    -> categorizeBugs(settings, bugs, onProgress, signal)
         -> createLLMProvider(type, config)        |
         -> buildSystemPrompt(categories)          |
         -> splitIntoChunks(bugs, chunkSize)       |
         -> for each chunk:                        |
              -> throwIfCancelled(signal)          |
              -> buildUserMessage(chunk)           |
              -> chatWithRetry(..., { responseSchema: 'categorization', signal })
                   -> provider.chat(..., options)
                   -> provider-native structured output
              -> validateLLMResponse(raw, chunk)
              -> onProgress(event.sender.send)
    -> persist categorized session state only on success
    -> return CategorizedBug[]
```

On Dashboard mount, the renderer can separately invoke `llm:categorize-status` to ask whether the current `webContents` already has an active categorization run and recover the correct UI state after route remount.

## Components

| Component       | Entity                                                                                                                                                                                | Role                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| IPC entry point | [[wiki/entities/ipc-handlers]]                                                                                                                                                        | Loads state, calls service, persists results                       |
| Orchestrator    | [[wiki/entities/llm-service]]                                                                                                                                                         | Coordinates chunking, retry, schema-aware provider calls, progress |
| Factory         | [[wiki/entities/llm-provider-factory]]                                                                                                                                                | Instantiates correct provider                                      |
| Schema registry | [[wiki/entities/llm-schemas]]                                                                                                                                                         | Shared logical output contracts                                    |
| Providers       | [[wiki/entities/openai-provider]], [[wiki/entities/anthropic-provider]], [[wiki/entities/generic-provider]], [[wiki/entities/gemini-provider]], [[wiki/entities/openrouter-provider]] | LLM communication adapters for each backend                        |
| Prompts         | [[wiki/entities/llm-prompts]]                                                                                                                                                         | Task instructions and input serialization                          |
| Chunking        | [[wiki/entities/chunking-utility]]                                                                                                                                                    | Batch splitting                                                    |
| Validation      | [[wiki/entities/response-validator]]                                                                                                                                                  | JSON parse, completeness check, and fallback                       |

## Data Flow

1. **Input**: `BugItem[]` from session store.
2. **Processing**: each chunk -> prompt guidance + schema hint -> provider-native structured output request -> raw JSON string -> validated results.
3. **Output**: `CategorizedBug[]` (`BugItem` plus `macroCategory`, `subCategory`, `categoryReason`, `categorizedAt`).
4. **Side effects**: session updated in store with `categorizedAt` timestamp only after a full successful run; blocking errors and user cancellation both skip persistence.

## Patterns Used

- [[wiki/concepts/llm-provider-abstraction]] - runtime provider switching
- [[wiki/concepts/provider-native-structured-output]] - one logical schema contract translated per provider
- [[wiki/concepts/chunk-retry-pattern]] - resilient batch processing
- [[wiki/concepts/ipc-security-model]] - whitelisted channels, no direct store access from renderer

## Test Connection Flow

Separate lightweight flow for validating LLM credentials:

```text
IPC (llm:test-connection)
  -> check apiKey
  -> createLLMProvider(type, config)
  -> provider.testConnection() using a lightweight prompt
  -> GenericProvider also validates baseUrl and URL scheme
  -> returns TestConnectionResult { success, message }
```

## FT-11 Extension

OpenRouter becomes the fifth runtime-selectable backend in this pipeline. The surrounding flow is unchanged, but the concrete adapter now demonstrates that the abstraction can also absorb SDKs that require a nested `chatRequest` payload and provider-native timeout configuration.

The same FT-11 slice also adds a new blocking failure mode: if OpenRouter routes a `json_schema` request to an upstream provider/model that downgrades structured output support, categorization now stops immediately and the renderer surfaces a modal error instead of silently marking the chunk as `Non categorizzato`.

## Cancellation Extension

The categorization pipeline now has a second user-controlled path besides completion and provider failure:

- the renderer invokes `llm:categorize-cancel` while a run is active,
- the renderer can also invoke `llm:categorize-status` on mount to recover a still-running categorization after route remount,
- the main process aborts the controller associated with that renderer window,
- providers receive the merged abort signal,
- `llm-service` converts the stop into `OPERATION_CANCELLED`,
- the dashboard clears progress without persisting partial categorizations or surfacing a blocking error modal,
- renderer-facing failures are normalized to real `Error` objects before crossing IPC, so blocking messages remain human-readable.

## FT-10 Extension

The AI Cluster feature introduces a sibling pipeline rather than replacing this one. It reuses the same provider abstraction, prompt module, schema registry, and `chatWithRetry()` helper, but changes the unit of work from chunks of raw bugs to macro-category groups of already categorized bugs.

Shared infrastructure now spans two LLM workflows:

- categorization: `llm:categorize` -> chunked `BugItem[]` -> `CategorizedBug[]`
- similarity: `llm:find-similar` -> grouped `CategorizedBug[]` -> `SimilarityResult`

## See also

- [[wiki/topics/electron-architecture]]
- [[wiki/entities/electron-store]]
- [[wiki/sources/ft-04-llm-provider]]
- [[wiki/sources/ft-09-structured-output]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
