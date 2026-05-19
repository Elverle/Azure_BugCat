# FT-14B — Analisi MVP mono-repo end-to-end

**Feature #:** FT-14B  
**Feature Type:** full-stack  
**Dependencies:** FT-14A (complete), FT-06 (complete)

---

## Part 1: Requirements

### Functional Requirements

#### Agent Runtime

- **FR-RUNTIME-001:** Common `AgentRunner` interface and `AgentRunnerFactory`
  - Description: A `RunParams` interface and `AgentRunner` interface define the contract for all agent SDK runners. `AgentRunnerFactory.createRunner(settings)` returns the correct runner based on FT-14A settings (`agentProvider`, fallback from `llmProvider`).
  - Acceptance Criteria: Given settings with `agentProvider='claude-sdk'`, When `createRunner` is called, Then a `ClaudeSDKRunner` is returned. Given `agentProvider='none'`, When `createRunner` is called, Then an `AgentNotConfiguredError` is thrown with a readable message.
  - Priority: Must-Have

- **FR-RUNTIME-002:** `ClaudeSDKRunner` implementation
  - Description: Wraps `@anthropic-ai/claude-code` SDK. Spawns an analyze session with the provided prompt, streams `AgentChunk` events via `onChunk`, respects `abortSignal`, returns the final report string.
  - Acceptance Criteria: Given a valid API key and prompt, When `run()` is called, Then chunks are streamed and a final report string is returned. When `abortSignal` fires, the SDK call is cancelled and the promise rejects with `OPERATION_CANCELLED`.
  - Priority: Must-Have

- **FR-RUNTIME-003:** `CodexSDKRunner` implementation
  - Description: Wraps `@openai/codex-sdk`. Same contract as `ClaudeSDKRunner`.
  - Acceptance Criteria: Same streaming/abort contract as FR-RUNTIME-002.
  - Priority: Must-Have

- **FR-RUNTIME-004:** `CopilotSDKRunner` implementation (minimal)
  - Description: Wraps `@github/copilot-sdk` (or Copilot BYOK passthrough). Produces agent chunks. Even if the SDK surface is limited, the runner must be testable end-to-end in the same flow.
  - Acceptance Criteria: Given Copilot settings configured, When `run()` completes, Then at least one chunk and a final report are produced. If `copilotByokEnabled`, the BYOK provider/key are used.
  - Priority: Must-Have

#### Session Management

- **FR-SESSION-001:** `SessionManager` — single live session
  - Description: Main-process singleton that tracks at most one active `AgentSession`. Prevents starting a second session while one is running. Stores session state (id, status, chunks, report).
  - Acceptance Criteria: Given an active session, When `agent:start` is invoked again, Then an error is returned. Given no session, When `agent:start` is called, Then a new session is created with status `running`.
  - Priority: Must-Have

- **FR-SESSION-002:** Agent session lifecycle states
  - Description: `AgentSession` transitions through: `running` → `completed` | `aborted` | `error`. Each state is communicated to renderer via events.
  - Acceptance Criteria: When the runner completes, session moves to `completed` and `agent:completed` event fires. When aborted, moves to `aborted`. On error, moves to `error` and `agent:error` fires.
  - Priority: Must-Have

#### Prompt

- **FR-PROMPT-001:** Analyze fallback prompt builder
  - Description: Builds a structured prompt from bug fields already in session (`id`, `title`, `description`, `tags`, `macroCategory`, `subCategory`, `categoryReason`, `areaPath`, `priority`, `state`). Also includes `architectureContext` from settings and the selected project's metadata. No MCP references, no secondary projects.
  - Acceptance Criteria: Given a `CategorizedBug` and a `ProjectEntry`, When `buildAnalyzePrompt` is called, Then the output contains bug title, description, tags, categorization data, project path/type/description, and architecture context. The prompt does NOT contain the words "MCP", "secondary project", or "cross-repo".
  - Priority: Must-Have

#### IPC Layer

- **FR-IPC-001:** `agent:start` channel
  - Description: Renderer invokes `agent:start` with `{ bugId: number, mode: 'analyze', primaryProjectId: string }`. Main validates inputs, resolves the bug from session, creates the prompt, instantiates the runner, and starts streaming.
  - Acceptance Criteria: Given a valid bugId and projectId, When invoked, Then session starts and renderer receives `agent:chunk` events. Given an invalid bugId, Then an `AppError` is returned.
  - Priority: Must-Have

- **FR-IPC-002:** `agent:abort` channel
  - Description: Renderer invokes `agent:abort` with `{ sessionId: string }`. Main fires the `AbortController`, runner terminates, session moves to `aborted`.
  - Acceptance Criteria: Given a running session, When `agent:abort` is invoked, Then the runner's `abortSignal` fires and the session transitions to `aborted`.
  - Priority: Must-Have

- **FR-IPC-003:** Event channels (`agent:chunk`, `agent:completed`, `agent:error`)
  - Description: Main → Renderer event channels using `webContents.send()`. `agent:chunk` carries `AgentChunk`, `agent:completed` carries `{ sessionId, report }`, `agent:error` carries `{ sessionId, error: AppError }`.
  - Acceptance Criteria: During a session, chunks are delivered in real-time. On completion, exactly one `agent:completed` event fires. On error, exactly one `agent:error` event fires.
  - Priority: Must-Have

#### UI

- **FR-UI-001:** "Analyze" button in BugDetailDrawer
  - Description: When a bug is selected in the drawer, an "Analyze" button appears. Clicking it opens a project-selection dropdown (from `settings.projects`), then starts the agent session via `agent:start`.
  - Acceptance Criteria: Given projects are configured, When user clicks "Analyze" and selects a project, Then `agent:start` is invoked and the Sessions tab activates. If no projects configured, the button shows a tooltip/message directing to Settings.
  - Priority: Must-Have

- **FR-UI-002:** Sessions tab in DashboardPage
  - Description: A fourth tab "Sessions" is added to `DashboardPage` alongside Lista, Raggruppati, Similarità. The tab displays the current/last agent session: a streaming log of chunks and the final report.
  - Acceptance Criteria: The tab is visible and clickable. When a session is running, log updates in real-time. When completed, the final report is displayed. When aborted/errored, the state is clearly indicated. The tab does not interfere with existing views.
  - Priority: Must-Have

- **FR-UI-003:** Session state indicators
  - Description: The Sessions tab shows: running (spinner + streaming log), completed (report), aborted (aborted badge), error (error message). An "Abort" button is visible during running state.
  - Acceptance Criteria: Each state is visually distinguishable. Abort button is only enabled during `running`. After abort, UI reflects `aborted` without requiring manual reload.
  - Priority: Must-Have

### Non-Functional Requirements

- **NFR-PERF-001:** Chunk delivery latency < 200ms from SDK event to renderer display.
- **NFR-SEC-001:** Agent API keys must never be sent to the renderer process. Keys stay in main, only session metadata crosses the IPC boundary.
- **NFR-SEC-002:** The prompt must not leak the ADO PAT. Only bug field data (already in session) is included.
- **NFR-MAINT-001:** Agent runners live in `src/main/agent/` separate from the existing `src/main/llm/` pipeline. They share no provider instances.
- **NFR-MAINT-002:** New IPC channels follow the existing contract pattern (shared channels → preload → ipc-handlers → renderer hook).

### Constraints

- SDK packages `@anthropic-ai/claude-code`, `@openai/codex-sdk` must be added as dependencies. If `@github/copilot-sdk` does not exist as a real npm package, use a stub runner that falls back to BYOK LLM provider for Copilot.
- electron-vite must externalize the new SDK packages in the main build.
- Store schema stays at version 4 — no migration needed (session state is in-memory only for FT-14B).
- Mono-session only: `maxConcurrentSessions` is enforced as 1.

### Assumptions

- `@anthropic-ai/claude-code` SDK provides a streaming API with abort support. If the API shape differs, the runner wraps it.
- `@openai/codex-sdk` SDK provides a similar streaming contract.
- `@github/copilot-sdk` may not exist as a public npm package — the CopilotSDKRunner will fall back to using the existing LLM provider pipeline (OpenAI-compatible endpoint with Copilot BYOK settings) to ensure testability.
- The `projects` array in settings is already populated via FT-14A UI before the user attempts Analyze.

### Out of Scope

- MCP Azure DevOps integration
- Secondary projects / cross-repo analysis
- Session persistence to store (sessions are in-memory only)
- Multi-session / concurrent sessions
- Fix mode (always `analyze`)
- Session history / previous session recall

### Edge Cases

| Scenario                                               | Expected Behavior                                                                 | Related Requirement        |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- | -------------------------- |
| No projects configured                                 | "Analyze" button disabled with tooltip "Configura almeno un progetto in Settings" | FR-UI-001                  |
| Bug not in session (stale ID)                          | `agent:start` returns `AppError` with code `STORE_ERROR`                          | FR-IPC-001                 |
| Session already running                                | `agent:start` returns `AppError` "Sessione già in corso"                          | FR-SESSION-001             |
| Agent provider is `none`                               | Readable error "Agent provider non configurato"                                   | FR-RUNTIME-001             |
| API key missing for selected provider                  | Readable error "API Key agente mancante"                                          | FR-RUNTIME-001             |
| Network failure mid-stream                             | `agent:error` fires, session moves to `error`, UI shows message                   | FR-SESSION-002             |
| User aborts then starts new session                    | Abort completes, previous session state clears, new session starts                | FR-SESSION-001, FR-IPC-002 |
| Copilot BYOK not configured but `copilot-sdk` selected | Error "Copilot BYOK non configurato"                                              | FR-RUNTIME-004             |
| Bug has empty description                              | Prompt still works — includes "(nessuna descrizione)" placeholder                 | FR-PROMPT-001              |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 16
- **Parallelizable:** 10 (63%)
- **Execution Waves:** 5

### Execution Waves

#### Wave 1 — Shared Types, IPC Channels, Dependencies (PARALLEL)

| Task ID | Type      | Title                              | Files                                     | Depends On | Complexity |
| ------- | --------- | ---------------------------------- | ----------------------------------------- | ---------- | ---------- |
| T-001   | SETUP     | Add SDK dependencies + externalize | `package.json`, `electron.vite.config.ts` | None       | S          |
| T-002   | IMPLEMENT | Shared agent types                 | `src/shared/types.ts`                     | None       | S          |
| T-003   | IMPLEMENT | Agent IPC channels                 | `src/shared/ipc-channels.ts`              | None       | S          |

#### Wave 2 — Core Agent Runtime (PARALLEL)

| Task ID | Type      | Title                            | Files                                                         | Depends On   | Complexity |
| ------- | --------- | -------------------------------- | ------------------------------------------------------------- | ------------ | ---------- |
| T-004   | IMPLEMENT | AgentRunner interface + factory  | `src/main/agent/types.ts`, `src/main/agent/runner-factory.ts` | T-002        | M          |
| T-005   | IMPLEMENT | ClaudeSDKRunner                  | `src/main/agent/runners/claude-sdk-runner.ts`                 | T-004        | M          |
| T-006   | IMPLEMENT | CodexSDKRunner                   | `src/main/agent/runners/codex-sdk-runner.ts`                  | T-004        | M          |
| T-007   | IMPLEMENT | CopilotSDKRunner (BYOK fallback) | `src/main/agent/runners/copilot-sdk-runner.ts`                | T-004        | M          |
| T-008   | IMPLEMENT | Analyze fallback prompt builder  | `src/main/agent/prompt-builder.ts`                            | T-002        | S          |
| T-009   | IMPLEMENT | SessionManager                   | `src/main/agent/session-manager.ts`                           | T-002, T-004 | M          |

#### Wave 3 — IPC Wiring + Preload (PARALLEL)

| Task ID | Type      | Title                    | Files                                            | Depends On          | Complexity |
| ------- | --------- | ------------------------ | ------------------------------------------------ | ------------------- | ---------- |
| T-010   | IMPLEMENT | Agent IPC handlers       | `src/main/ipc-handlers.ts`                       | T-003, T-008, T-009 | L          |
| T-011   | IMPLEMENT | Preload + global typings | `src/preload/index.ts`, `src/preload/index.d.ts` | T-003               | S          |

#### Wave 4 — Renderer (PARALLEL)

| Task ID | Type      | Title                         | Files                                                     | Depends On   | Complexity |
| ------- | --------- | ----------------------------- | --------------------------------------------------------- | ------------ | ---------- |
| T-012   | IMPLEMENT | useAgentSession hook          | `src/renderer/src/hooks/useAgentSession.ts`               | T-011        | M          |
| T-013   | IMPLEMENT | SessionsPanel component       | `src/renderer/src/components/dashboard/SessionsPanel.tsx` | T-012        | M          |
| T-014   | INTEGRATE | Analyze button + Sessions tab | `BugDetailDrawer.tsx`, `DashboardPage.tsx`                | T-012, T-013 | M          |

#### Wave 5 — Tests (PARALLEL)

| Task ID | Type | Title              | Files                                                                                                 | Depends On | Complexity |
| ------- | ---- | ------------------ | ----------------------------------------------------------------------------------------------------- | ---------- | ---------- |
| T-015   | TEST | Main-process tests | `tests/main/agent-*.spec.ts` (4 files)                                                                | T-010      | L          |
| T-016   | TEST | Renderer tests     | `tests/renderer/useAgentSession.spec.ts`, `SessionsPanel.spec.tsx`, `DashboardPage-sessions.spec.tsx` | T-014      | L          |

### Critical Path

T-002 → T-004 → T-009 → T-010 → T-012 → T-014 → T-016

### Task Details

#### T-001: Add SDK dependencies + externalize

- Add `@anthropic-ai/claude-code`, `@openai/codex-sdk` to package.json
- Update `electron.vite.config.ts` externalizeDeps
- If `@github/copilot-sdk` doesn't exist on npm, skip — CopilotSDKRunner uses BYOK fallback
- Verify `npm run build` succeeds

#### T-002: Shared agent types

- Add to `src/shared/types.ts`:
  - `SessionMode = 'analyze' | 'fix'`
  - `AgentChunkType = 'text' | 'tool_use' | 'tool_result' | 'status'`
  - `AgentChunk = { sessionId: string; type: AgentChunkType; content: string; timestamp: string }`
  - `AgentSessionStatus = 'running' | 'completed' | 'aborted' | 'error'`
  - `AgentSession = { id: string; bugId: number; mode: SessionMode; primaryProjectId: string; status: AgentSessionStatus; startedAt: string; completedAt?: string; report?: string; error?: AppError }`
  - `AgentStartPayload`, `AgentAbortPayload`, `AgentCompletedPayload`, `AgentErrorPayload`
- Add error codes: `'AGENT_NOT_CONFIGURED' | 'AGENT_SESSION_ACTIVE' | 'AGENT_SESSION_NOT_FOUND'`

#### T-003: Agent IPC channels

- Add `AGENT_START`, `AGENT_ABORT`, `AGENT_CHUNK`, `AGENT_COMPLETED`, `AGENT_ERROR` to `IPC_CHANNELS`

#### T-004: AgentRunner interface + factory

- Create `src/main/agent/types.ts` with `RunParams` and `AgentRunner` interfaces
- Create `src/main/agent/runner-factory.ts` with `createRunner(settings)`
- Factory: anthropic → Claude, openai → Codex, else use `agentProvider` field

#### T-005: ClaudeSDKRunner

- Wraps `@anthropic-ai/claude-code` SDK streaming API
- `supportsFixMode = false`, `supportsMcp = false` for FT-14B
- Implements abort via `abortSignal`

#### T-006: CodexSDKRunner

- Wraps `@openai/codex-sdk`
- Same contract adapted to Codex API surface

#### T-007: CopilotSDKRunner (BYOK fallback)

- Uses existing LLM provider pipeline with `copilotByokProvider`/`copilotByokApiKey`
- Wraps single response as chunks
- Validates BYOK config, throws readable error if not configured

#### T-008: Analyze fallback prompt builder

- `buildAnalyzePrompt(bug, project, architectureContext): string`
- Includes: bug fields, project metadata, architecture context
- Must NOT contain "MCP", "secondary project", "cross-repo"

#### T-009: SessionManager

- Single active session, UUID-based IDs
- State transitions: running → completed | aborted | error
- `start()`, `abort()`, `getSession()`, `clear()`

#### T-010: Agent IPC handlers

- Register `AGENT_START` and `AGENT_ABORT` in ipc-handlers
- Wire `agent:chunk/completed/error` via `webContents.send()`
- Fire-and-forget streaming on start, return `{ sessionId }`

#### T-011: Preload + global typings

- Add `agentStart`, `agentAbort`, `onAgentChunk`, `onAgentCompleted`, `onAgentError` to preload bridge

#### T-012: useAgentSession hook

- State: session object with chunks array, status, report, error
- Methods: startSession, abortSession, clearSession
- Subscribes/unsubscribes to IPC events

#### T-013: SessionsPanel component

- 5 states: no session, running, completed, aborted, error
- Streaming log view, final report, abort button
- Auto-scroll log

#### T-014: Analyze button + Sessions tab

- "Analizza" button in BugDetailDrawer with project selector dropdown
- Fourth "Sessions" tab in DashboardPage ViewMode
- Wire drawer → startSession → auto-switch to sessions tab

#### T-015: Main-process tests

- `agent-runner-factory.spec.ts`: factory resolution for each provider
- `agent-session-manager.spec.ts`: lifecycle transitions
- `agent-prompt-builder.spec.ts`: prompt content validation
- `agent-ipc-handlers.spec.ts`: integration with mocked runners

#### T-016: Renderer tests

- `useAgentSession.spec.ts`: hook lifecycle
- `SessionsPanel.spec.tsx`: visual states
- `DashboardPage-sessions.spec.tsx`: tab integration

### Risk Register

| Risk                                          | Impact | Likelihood | Mitigation                                |
| --------------------------------------------- | ------ | ---------- | ----------------------------------------- |
| `@anthropic-ai/claude-code` API shape differs | High   | Medium     | Runner wraps SDK; adapt wrapper if needed |
| `@openai/codex-sdk` limited API               | Medium | Medium     | Same wrapping strategy                    |
| `@github/copilot-sdk` doesn't exist           | Low    | High       | BYOK fallback by design                   |
| electron-vite externalization breaks          | Medium | Low        | Test build early in T-001                 |
| Rapid chunks cause renderer lag               | Medium | Low        | Batch/throttle chunk updates              |

### Requirement → Task Mapping

| Requirement    | Tasks               |
| -------------- | ------------------- |
| FR-RUNTIME-001 | T-004               |
| FR-RUNTIME-002 | T-005               |
| FR-RUNTIME-003 | T-006               |
| FR-RUNTIME-004 | T-007               |
| FR-SESSION-001 | T-009               |
| FR-SESSION-002 | T-009, T-010        |
| FR-PROMPT-001  | T-008               |
| FR-IPC-001     | T-003, T-010, T-011 |
| FR-IPC-002     | T-003, T-010, T-011 |
| FR-IPC-003     | T-010, T-011        |
| FR-UI-001      | T-014               |
| FR-UI-002      | T-013, T-014        |
| FR-UI-003      | T-013               |
| FR-ANALYZE-008 | T-007               |

---

## Questions for User

1. **Copilot SDK package:** ✅ Confirmed — `@github/copilot-sdk` IS a real npm package. CopilotSDKRunner uses it directly with `CopilotClient`, `createSession({ model, streaming: true })`, and `session.on("assistant.message_delta", ...)` for streaming.
2. **Claude Code SDK:** ✅ Programmatic Node.js API (not CLI subprocess).
3. **Session tab auto-activation:** ✅ Yes, auto-switch to Sessions tab when Analyze starts.
