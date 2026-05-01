---
title: 'LLM Categorization Pipeline'
type: topic
created: 2026-04-30
updated: 2026-05-01
sources: ['[[wiki/sources/ft-04-llm-provider]]', '[[wiki/sources/ft-08-generic-provider]]']
tags: [llm, categorization, pipeline, ipc, main-process]
lang: en
---

## Overview

End-to-end pipeline for categorizing Azure DevOps bugs via LLM. Runs entirely in the Electron Main Process, triggered by IPC from the renderer, with progressive chunk results pushed back via `event.sender`.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ RENDERER                                                            │
│  invoke('llm:categorize') ──────────┐                               │
│  on('llm:categorize-progress') ◄────┼────── progressive chunks      │
└─────────────────────────────────────┼───────────────────────────────┘
                                      │
┌─────────────────────────────────────┼───────────────────────────────┐
│ MAIN PROCESS                        ▼                               │
│                                                                     │
│  IPC Handler                                                        │
│    ├─ Load settings from store                                      │
│    ├─ Load bugs from session                                        │
│    ├─ categorizeBugs(settings, bugs, onProgress)                    │
│    │    ├─ createLLMProvider(type, config)                           │
│    │    ├─ buildSystemPrompt(categories)                             │
│    │    ├─ splitIntoChunks(bugs, chunkSize)                          │
│    │    └─ for each chunk:                                           │
│    │         ├─ buildUserMessage(chunk)                              │
│    │         ├─ chatWithRetry → provider.chat()                      │
│    │         ├─ validateLLMResponse(raw, chunk)                      │
│    │         └─ onProgress → event.sender.send(progress)             │
│    ├─ Update session with categorized bugs                           │
│    └─ Return CategorizedBug[]                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Components

| Component       | Entity                                                                                                                                         | Role                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| IPC entry point | [[wiki/entities/ipc-handlers]]                                                                                                                 | Loads state, calls service, persists result |
| Orchestrator    | [[wiki/entities/llm-service]]                                                                                                                  | Coordinates chunking, retry, progress       |
| Factory         | [[wiki/entities/llm-provider-factory]]                                                                                                         | Instantiates correct provider               |
| Providers       | [[wiki/entities/openai-provider]], [[wiki/entities/anthropic-provider]], [[wiki/entities/generic-provider]], [[wiki/entities/gemini-provider]] | LLM communication adapters for each backend |
| Prompts         | [[wiki/entities/llm-prompts]]                                                                                                                  | System/user prompt construction             |
| Chunking        | [[wiki/entities/chunking-utility]]                                                                                                             | Batch splitting                             |
| Validation      | [[wiki/entities/response-validator]]                                                                                                           | JSON parse + schema check + fallback        |

## Data Flow

1. **Input**: `BugItem[]` from session store (fetched in FT-03)
2. **Processing**: Each chunk → JSON prompt → LLM → JSON response → validated results
3. **Output**: `CategorizedBug[]` (BugItem + macroCategory + subCategory + categoryReason + categorizedAt)
4. **Side effects**: Session updated in store with `categorizedAt` timestamp

## Patterns Used

- [[wiki/concepts/llm-provider-abstraction]] — Runtime provider switching
- [[wiki/concepts/chunk-retry-pattern]] — Resilient batch processing
- [[wiki/concepts/ipc-security-model]] — Whitelisted channels, no direct store access from renderer

## Test Connection Flow

Separate lightweight flow for validating LLM credentials:

```
IPC (llm:test-connection)
  ├─ Check apiKey
  ├─ createLLMProvider(type, config)
  ├─ provider.testConnection() → sends "Test connection" prompt
  ├─ GenericProvider additionally validates `baseUrl` and URL scheme in the main process
  └─ Returns TestConnectionResult { success, message }
```

## See also

- [[wiki/topics/electron-architecture]]
- [[wiki/entities/electron-store]]
- [[wiki/sources/ft-04-llm-provider]]
