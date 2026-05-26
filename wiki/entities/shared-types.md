---
title: 'Shared Domain Types'
type: entity
subtype: model
created: 2026-04-29
updated: 2026-05-26
sources:
  [
    '[[wiki/sources/ft-01-scaffold]]',
    '[[wiki/sources/ft-02-settings]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-10-ai-cluster-similarity]]',
    '[[wiki/sources/ft-11-openrouter-provider]]',
    '[[wiki/sources/ft-12-incremental-session-cache]]',
    '[[wiki/sources/ft-13-closed-bugs-history]]',
    '[[wiki/sources/ft-14a-agent-configuration-project-registry]]',
    '[[wiki/sources/ft-14b-agent-sessions]]',
    '[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]',
    '[[wiki/sources/ft-14d-cross-repo-project-suggestions]]',
    '[[wiki/sources/ft-14e-multi-session-agent-workspace]]',
    '[[wiki/analyses/cancel-categorization-flow]]'
  ]
tags: [typescript, types, shared, domain-model, catalog, settings, agent]
lang: en
---

## Description

Shared TypeScript type definitions used across main, preload, and renderer processes. Defines the domain model for bugs, settings, sessions, and errors.

## Location

`src/shared/types.ts`

## Types

### Core types

| Type                | Purpose                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LLMProviderType`   | Union: `'openai' \| 'anthropic' \| 'generic' \| 'gemini' \| 'openrouter'`                                                                                     |
| `AgentProviderType` | Union: `'claude-sdk' \| 'codex-sdk' \| 'copilot-sdk' \| 'none'`                                                                                               |
| `ProjectType`       | Union: `'backend' \| 'frontend' \| 'shared'`                                                                                                                  |
| `ErrorCode`         | Union of known error codes, now including FT-14B agent-session failures such as `AGENT_NOT_CONFIGURED`, `AGENT_SESSION_ACTIVE`, and `AGENT_SESSION_NOT_FOUND` |

### Bug types

| Type                    | Purpose                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `BugItem`               | Raw bug from Azure DevOps (id, title, state, assignee, areaPath, description, priority, dates, tags)  |
| `CategorizedBug`        | Extends `BugItem` with `macroCategory`, `subCategory`, `categoryReason`, `categorizedAt`              |
| `CatalogBug`            | Extends `CategorizedBug` with lifecycle timestamps, `inputSignature`, and similarity-history metadata |
| `BugCatalog`            | `Record<number, CatalogBug>` used as the main-process historical bug catalog                          |
| `CatalogMetadata`       | Top-level catalog metadata, currently used for `lastClearedAt`                                        |
| `ClosedCatalogSnapshot` | Renderer-facing read model for FT-13: `{ closedBugs, fetchedAt, lastClearedAt }`                      |

### Configuration

| Type                | Purpose                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `ProjectEntry`      | One registered local project with path, type, description, and keywords                                                       |
| `CopilotByokConfig` | Narrow helper shape for Copilot bring-your-own-key configuration                                                              |
| `AppSettings`       | Full settings object, now including agent-provider state, project registry, architecture context, concurrency, and LLM fields |
| `SessionData`       | Open-snapshot bug cache with fetch/categorize timestamps, optional `lastFetchNewCount`, plus optional `similarityResults`     |

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

| Type                   | Purpose                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `TestConnectionResult` | Structured response from test connection IPC: `{ success, message }`             |
| `BinaryCheckResult`    | Structured response from `agent:check-binary`: `{ installed, version?, error? }` |

### Agent sessions

| Type                         | Purpose                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `SessionMode`                | Session intent union, currently `'analyze' \| 'fix'`                                                        |
| `AgentChunkType`             | Chunk classification: `text`, `tool_use`, `tool_result`, `status`                                           |
| `AgentChunk`                 | Streamed renderer-facing log event with `sessionId`, text, and metadata                                     |
| `AgentSessionStatus`         | Session state union: `running`, `completed`, `aborted`, `error`                                             |
| `AgentUsageStats`            | Provider-normalized usage snapshot with token counts, optional cache/reasoning metrics, duration, and model |
| `AgentSession`               | Full FT-14 live session snapshot, now including optional `secondaryProjectIds` and `usage`                  |
| `AgentStartPayload`          | Start request: `{ bugId, mode, primaryProjectId, secondaryProjectIds?, userContext? }`                      |
| `AgentAbortPayload`          | Abort request: `{ sessionId }`                                                                              |
| `AgentCompletedPayload`      | Completion event: `{ sessionId, report, usage? }`                                                           |
| `AgentErrorPayload`          | Error event: `{ sessionId, error }`                                                                         |
| `McpStatus`                  | Session-scoped MCP availability: `{ available, reason? }`                                                   |
| `AgentMcpStatusPayload`      | Event payload for renderer MCP badge updates                                                                |
| `AgentSessionFilter`         | Summary-list filter union: `all` or one concrete `AgentSessionStatus`                                       |
| `AgentSessionSummary`        | Workspace-friendly session row with status, chunk count, cached report metadata, and optional MCP status    |
| `AgentSessionUpdatedPayload` | Narrow event payload for terminal-state list updates                                                        |
| `AgentSaveReportPayload`     | Save-report request: `{ sessionId, defaultFilename? }`                                                      |
| `PersistedAgentSession`      | `AgentSession` plus `persistedAt` metadata used only inside the store                                       |

### Project-suggestion preflight

| Type                       | Purpose                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| `ProjectSuggestionPayload` | FT-14D request payload: `{ bugId, primaryOverride? }`                  |
| `ProjectSuggestion`        | FT-14D response payload: `{ primaryProjectId, suggestedSecondaryIds }` |

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

## FT-12 Notes

- `SessionData` and `BugCatalog` now represent separate persistence responsibilities: the former is the current open snapshot, the latter is the historical catalog used only in the main process.
- `SessionData.lastFetchNewCount` stores how many fetched bugs were not present in the historical catalog before the latest merge, letting the renderer show a fetch summary without reading `bugCatalog` directly.
- `CatalogBug.inputSignature` captures the normalized categorization inputs (`title`, `description`, `tags`, `priority`, `areaPath`) so unchanged bugs can safely reuse previous categorization.
- `CatalogBug.everInSimilarityGroup` and `lastSimilarityGroupAt` preserve similarity-history metadata without expanding the renderer-facing session payload.

## FT-13 Notes

- `CatalogMetadata.lastClearedAt` now preserves the last explicit history cleanup timestamp so historical KPIs can declare the current counting baseline.
- `ClosedCatalogSnapshot` is the renderer-safe FT-13 read model that combines the filtered closed-only slice with `fetchedAt` and `lastClearedAt`.

## FT-14A Notes

- `AppSettings` now persists the entire agent-session configuration foundation: `agentProvider`, `agentApiKey`, `agentModel`, `copilotByokEnabled`, `copilotByokProvider`, `copilotByokApiKey`, `projects`, `architectureContext`, and `maxConcurrentSessions`.
- `ProjectEntry` is deliberately lightweight: FT-14A stores operator-supplied metadata only and does not infer repository status or language details from the path.
- `BinaryCheckResult` keeps the Codex CLI check structured and non-throwing across the IPC boundary.

## FT-14B Notes

- `AgentSession` is intentionally renderer-safe but main-process owned; reconnect works by sending the current snapshot across IPC rather than persisting session runtime state to `electron-store`.
- `SessionMode` already reserves `'fix'` for future work even though FT-14B currently supports only `analyze`.
- `AgentChunk` exists so Claude, Codex, and Copilot can stream into one UI model despite very different native SDK event schemas.

## FT-14C Notes

- `McpStatus` formalizes the result of the session-start capability probe so the main process, preload bridge, and renderer all share the same availability/fallback contract.
- `AgentMcpStatusPayload` keeps MCP feedback event-based and session-scoped instead of overloading the chunk stream with transport details.

## FT-14D Notes

- `AgentSession.secondaryProjectIds` lets reconnecting renderers and session viewers preserve the cross-repo selection that started the run.
- `AgentStartPayload.secondaryProjectIds` keeps secondary repo choice explicit instead of inferring it later from prompt text.
- `ProjectSuggestionPayload` and `ProjectSuggestion` formalize the suggestion IPC contract so the renderer does not need to understand the heuristic implementation.

## min-09 Notes

- `AgentStartPayload.userContext` carries optional operator hints from launcher surfaces into the privileged `agent:start` boundary.
- The field is intentionally optional and free-text because renderer components treat it as ephemeral UI state, not as persisted session configuration.
- Main-process trimming and truncation own the trust-boundary normalization, so shared typing stays permissive while runtime enforcement remains centralized.

## min-08 Notes

- `AgentUsageStats` normalizes provider-specific usage payloads into one renderer-safe shape so Claude, Codex, and Copilot can all feed the same statistics view.
- `AgentCompletedPayload.usage` keeps token metrics tied to the same session-completion event that already delivers the final report, avoiding a second IPC round trip.

## FT-14E Notes

- `AgentSessionSummary` deliberately separates list concerns from full log/report detail so the workspace does not hydrate every stored chunk on mount.
- `AgentSessionUpdatedPayload` exists because not every session transition carries a new chunk or final report, but the list still needs to react quickly to abort/completion state changes.
- `PersistedAgentSession` formalizes the store-only shape for retained agent sessions without leaking `persistedAt` into the renderer model.
- `AppSettings.maxConcurrentSessions` now defaults to `5` in newly initialized stores and is used as the runtime concurrency ceiling for FT-14E sessions.

## Cancellation Notes

- `ErrorCode` now includes `OPERATION_CANCELLED` so intentional user aborts can be distinguished from `LLM_TIMEOUT`.
- The new error code crosses the same shared boundary as other `AppError` values, allowing main, preload, and renderer layers to agree on silent cancel behavior.

## See also

- [[wiki/entities/electron-store]] — persists `AppSettings`, `SessionData`, and `BugCatalog`
- [[wiki/entities/ipc-handlers]] — serves settings/session over IPC
- [[wiki/entities/project-registry]]
- [[wiki/topics/agent-session-configuration-foundation]]
- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/agent-session-workspace]]
- [[wiki/topics/cross-repo-agent-analysis]]
- [[wiki/topics/mcp-backed-agent-analysis]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
