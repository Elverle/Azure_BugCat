---
title: 'IPC Handlers'
type: entity
subtype: service
created: 2026-04-29
updated: 2026-05-26
sources:
  [
    '[[wiki/sources/ft-01-scaffold]]',
    '[[wiki/sources/ft-02-settings]]',
    '[[wiki/sources/ft-03-ado-fetch]]',
    '[[wiki/sources/ft-04-llm-provider]]',
    '[[wiki/sources/ft-06-bug-detail-drawer]]',
    '[[wiki/sources/ft-07-session-persistence]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-10-ai-cluster-similarity]]',
    '[[wiki/sources/ft-12-incremental-session-cache]]',
    '[[wiki/sources/ft-13-closed-bugs-history]]',
    '[[wiki/sources/ft-14a-agent-configuration-project-registry]]',
    '[[wiki/sources/ft-14b-agent-sessions]]',
    '[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]',
    '[[wiki/sources/ft-14d-cross-repo-project-suggestions]]',
    '[[wiki/sources/ft-14e-multi-session-agent-workspace]]',
    '[[wiki/sources/ft-14f-provider-auth-parity-analysis]]',
    '[[wiki/analyses/cancel-categorization-flow]]',
    '[[wiki/analyses/dashboard-categorization-state-recovery]]'
  ]
tags: [electron, ipc, main-process, shell, catalog, agent, projects]
lang: en
---

## Description

Registers all `ipcMain.handle()` listeners. Each handler maps a typed IPC channel to a main-process operation. Called once from `app.whenReady()`, after store migration has already completed.

## Location

`src/main/ipc-handlers.ts`

## Registered Handlers

| Channel                         | Status         | Action                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ping`                          | ✅ Implemented | Returns `'pong'`                                                                                                                                                                                                                                                                                                                                               |
| `settings:get`                  | ✅ Implemented | Returns `store.get('settings')`                                                                                                                                                                                                                                                                                                                                |
| `settings:set`                  | ✅ Implemented | Calls `store.set('settings', payload)`                                                                                                                                                                                                                                                                                                                         |
| `session:get`                   | ✅ Implemented | Returns `store.get('session')`                                                                                                                                                                                                                                                                                                                                 |
| `session:clear`                 | ✅ Implemented | Sets `session` to `null`                                                                                                                                                                                                                                                                                                                                       |
| `catalog:clear`                 | ✅ Implemented | Sets `bugCatalog` to `null`, records `catalogMetadata.lastClearedAt`, and leaves the current `session` untouched                                                                                                                                                                                                                                               |
| `catalog:get-closed`            | ✅ Implemented | Reads `bugCatalog`, filters to entries with `closedAt !== null`, and returns that closed-only slice together with the latest `session.fetchedAt` plus `catalogMetadata.lastClearedAt` if available                                                                                                                                                             |
| `agent:check-binary`            | ✅ Implemented | Runs `codex --version` with a fixed argument list and returns `BinaryCheckResult` instead of throwing on missing CLI                                                                                                                                                                                                                                           |
| `agent:select-directory`        | ✅ Implemented | Opens an Electron directory picker and returns the selected folder path or `null`                                                                                                                                                                                                                                                                              |
| `agent:test-copilot`            | ✅ Implemented | Validates Copilot configuration from persisted settings or an optional draft payload, returning immediate success for subscription mode or a provider-aware BYOK probe result                                                                                                                                                                                  |
| `agent:suggest-projects`        | ✅ Implemented | Validates the FT-14D payload, loads the current bug and project registry, computes the primary recommendation, and returns suggested secondary project IDs                                                                                                                                                                                                     |
| `agent:start`                   | ✅ Implemented | Resolves the current bug, selected project(s), and settings, trims and caps optional min-09 `userContext` input, runs FT-14F Codex/BYOK preflight checks, computes FT-14C MCP availability, starts a bounded FT-14E session, persists the running snapshot, caches the session MCP status for summaries, and returns `{ sessionId, agentProvider, mcpStatus }` |
| `agent:abort`                   | ✅ Implemented | Aborts the requested running session by ID, persists the aborted snapshot, and emits `agent:session-updated`                                                                                                                                                                                                                                                   |
| `agent:get-session`             | ✅ Implemented | Returns one in-memory agent session by ID, or the first running session for legacy FT-14B compatibility                                                                                                                                                                                                                                                        |
| `agent:list-sessions`           | ✅ Implemented | Returns `AgentSessionSummary[]` for the FT-14E workspace list, including status, chunk counts, and cached MCP status                                                                                                                                                                                                                                           |
| `agent:save-report`             | ✅ Implemented | Opens a native save dialog for one completed session report and writes the selected Markdown file from the main process                                                                                                                                                                                                                                        |
| `projects:get`                  | ✅ Implemented | Returns `settings.projects ?? []` from persisted settings                                                                                                                                                                                                                                                                                                      |
| `projects:set`                  | ✅ Implemented | Replaces `settings.projects` in persisted settings                                                                                                                                                                                                                                                                                                             |
| `projects:validate-paths`       | ✅ Implemented | Checks whether each provided path exists and is a directory, returning a per-path error map                                                                                                                                                                                                                                                                    |
| `ado:fetch-bugs`                | ✅ Implemented | Validates settings, calls `fetchBugsFromQuery()`, merges results into `bugCatalog`, persists a fresh open-bug `session` plus `lastFetchNewCount`, and reuses categorization when signatures still match                                                                                                                                                        |
| `ado:test-connection`           | ✅ Implemented | Calls `testAdoConnection()`, returns `TestConnectionResult`                                                                                                                                                                                                                                                                                                    |
| `ado:fetch-attachment-data-url` | ✅ Implemented | Loads persisted settings and returns a renderer-safe attachment data URL for Azure DevOps-hosted images                                                                                                                                                                                                                                                        |
| `llm:categorize`                | ✅ Implemented | Loads settings+session, filters to uncategorized open bugs, creates a per-window `AbortController`, calls `categorizeBugs()`, merges results back into `session` and `bugCatalog`, and persists only on success                                                                                                                                                |
| `llm:categorize-cancel`         | ✅ Implemented | Aborts the active categorization controller for the current renderer window and returns `{ cancelled }`                                                                                                                                                                                                                                                        |
| `llm:categorize-status`         | ✅ Implemented | Returns `{ active }` for the current renderer window so a remounted Dashboard can recover an in-flight categorization                                                                                                                                                                                                                                          |
| `llm:test-connection`           | ✅ Implemented | Validates `apiKey`, calls `testLLMConnection()`, returns `TestConnectionResult`; generic-provider `baseUrl` rules are enforced downstream                                                                                                                                                                                                                      |
| `llm:find-similar`              | ✅ Implemented | Validates settings plus categorized session state, calls `findSimilarBugs()`, sends `SimilarityProgress`, persists `similarityResults`, and updates catalog similarity metadata                                                                                                                                                                                |
| `shell:open-external`           | ✅ Implemented | Validates that the payload is a well-formed `https://` URL, then delegates to `shell.openExternal()`                                                                                                                                                                                                                                                           |

## Security Notes

- Only whitelisted channels are exposed — no generic `store:get`/`store:set`.
- `settings:set` accepts `unknown` — **no runtime validation** (technical debt).
- The shell handler uses `new URL(url)` plus protocol enforcement so the renderer cannot open arbitrary schemes.
- `agent:check-binary` is intentionally hardcoded to `execFile('codex', ['--version'])`, so the renderer cannot turn it into arbitrary command execution.
- FT-14F reuses the same fixed Codex check inside `agent:start`, so renderer gating cannot bypass the actual CLI prerequisite.
- Directory selection and path validation stay in the main process, which keeps direct filesystem access out of the renderer.
- FT-14B keeps SDK clients and abort controllers in the main process; the renderer only requests start/abort and receives normalized event streams.
- FT-08 removed the old Copilot-specific authentication branch from `llm:test-connection`; all providers now enter the same `testLLMConnection()` path once minimal required fields are present.
- FT-10 keeps similarity analysis behind the same main-process boundary: the renderer cannot pass raw bug payloads or store writes directly, it can only request analysis against the current persisted session.
- FT-12 keeps `bugCatalog` main-process owned; FT-13 adds only a filtered closed-history read channel, so the renderer still cannot enumerate or mutate the full catalog directly.
- `projects:validate-paths` validates only existence plus directory-ness. It does not assert Git repository status, language, or workspace ownership.
- Categorization cancellation is scoped per `webContents`, preventing one renderer surface from aborting another window's run.
- Categorization status is also scoped per `webContents`, so Dashboard remount recovery reflects only the current window's work.
- Cancelled categorization runs do not write partial `SessionData`; the existing session remains the source of truth until a full run succeeds.
- `session:clear` and `catalog:clear` intentionally have different blast radii, which lets operators reset the open snapshot without losing historical categorization reuse.
- `catalog:get-closed` reuses `session.fetchedAt` as the renderer-facing "last update" marker for FT-13, and now also forwards the persisted history cleanup baseline without exposing the mutable session snapshot itself.
- `toRendererError()` converts plain thrown objects into real `Error` instances before they cross the IPC boundary, preserving human-readable messages and error codes for the renderer.
- `agent:start` currently rejects anything other than `mode === 'analyze'`, and FT-14C treats MCP setup failures as degradations, not fatal startup errors.
- `agent:test-copilot` accepts an optional draft payload so Settings can probe unsaved Copilot edits, but it still refuses to run when the effective provider is not `copilot-sdk`.
- In Copilot subscription mode the test is intentionally a configuration-ready check only; FT-14F keeps the real authentication handshake in the later SDK session startup path.
- FT-14C writes only a placeholder token into `.mcp.json`; the live PAT is provided through process environment after encoding and never persisted in cleartext.
- Copilot MCP configuration stays in-memory, so it does not mutate the selected repository on disk.
- FT-14D validates `agent:suggest-projects` payloads defensively before touching session or settings state.
- FT-14D resolves only secondary project IDs that still map to existing directories before passing `secondaryPaths` into a runner, so stale settings entries degrade safely instead of widening access.
- min-09 keeps operator-supplied analysis notes untrusted until `agent:start`: the handler trims whitespace, truncates to 2000 characters, drops empty values, and only then forwards the result into prompt assembly.
- FT-14E restores persisted sessions at startup, prunes anything older than 24 hours, and downgrades stale `running` sessions to `aborted` instead of pretending execution can resume.
- `agent:list-sessions` returns summaries only, which prevents the workspace list from loading full logs for every historical session up front.
- `agent:save-report` keeps filesystem writes and the native save dialog in the main process, so the renderer never receives direct write access.

## Event-Only Agent Session Channels

- `agent:session-updated` is emitted on terminal transitions that affect list state without requiring the renderer to poll the whole summary set.

## Dependencies

- [[wiki/entities/electron-store]] — `store` instance
- `src/shared/ipc-channels.ts` — `IPC_CHANNELS` constant map
- [[wiki/entities/ado-service]] — `fetchBugsFromQuery`, `testAdoConnection`
- [[wiki/entities/llm-service]] — `categorizeBugs`, `testLLMConnection`
- [[wiki/entities/similarity-service]] — `findSimilarBugs`
- [[wiki/entities/catalog-merge-utility]] — signature computation plus fetch/categorize/similarity catalog updates
- [[wiki/entities/agent-session-manager]]
- [[wiki/entities/agent-session-persistence]]
- [[wiki/entities/agent-runner-factory]]
- [[wiki/entities/agent-prompt-builder]]
- [[wiki/entities/project-matcher]]
- [[wiki/entities/mcp-health-check]]
- [[wiki/entities/mcp-config-writer]]
- [[wiki/entities/open-external-ipc]]

## See also

- [[wiki/entities/preload-bridge]]
- [[wiki/entities/open-external-ipc]]
- [[wiki/entities/project-registry]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/concepts/proactive-agent-configuration-blocking]]
- [[wiki/topics/agent-session-configuration-foundation]]
- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/agent-session-workspace]]
- [[wiki/topics/cross-repo-agent-analysis]]
- [[wiki/topics/mcp-backed-agent-analysis]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/electron-architecture]]
- [[wiki/topics/llm-categorization-pipeline]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
