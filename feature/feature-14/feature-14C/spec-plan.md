# Spec-Planner — Iteration 1

## Feature Context

- **Feature:** MCP Azure DevOps per Analisi con fallback resiliente
- **Feature #:** FT-14C
- **Feature Type:** full-stack

---

## Part 1: Requirements

### Functional Requirements

#### MCP Configuration & File Management

- **FR-MCP-001:** McpConfigWriter — File-based MCP for Claude & Codex
  - Description: A utility writes/merges a `.mcp.json` file in the project's working directory with the `azure-devops` server entry pointing to the local `@azure-devops/mcp-server` binary via `node`. The PAT is referenced as `${AZURE_DEVOPS_PAT}` placeholder — never in cleartext.
  - Acceptance Criteria:
    - Given a project path without `.mcp.json`, When McpConfigWriter runs, Then a valid `.mcp.json` is created with only the `azure-devops` key.
    - Given a project path with an existing `.mcp.json` containing other servers, When McpConfigWriter runs, Then only the `azure-devops` key is added/updated and all other entries remain intact.
    - Given any write, Then the literal PAT value NEVER appears in the file on disk.
  - Priority: Must-Have

- **FR-MCP-002:** Copilot programmatic MCP config
  - Description: The Copilot SDK runner receives MCP server configuration in-memory via `mcpServers[]` in `createSession()`, without writing any `.mcp.json` to the project directory.
  - Acceptance Criteria:
    - Given Copilot as agent provider with MCP available, When session starts, Then `createSession()` receives `mcpServers` array containing the ADO server config with PAT in env.
    - Given Copilot as agent provider, When session starts, Then no `.mcp.json` file is written to the repo.
  - Priority: Must-Have

#### MCP Health Check & Fallback

- **FR-MCP-003:** MCP health check before session start
  - Description: Before starting an Analyze session, the system performs a non-blocking health check on the MCP server (spawn the node process, verify it responds within timeout). The check has an explicit timeout (e.g. 5 seconds) and does NOT block the user indefinitely.
  - Acceptance Criteria:
    - Given valid credentials and installed MCP server, When health check runs, Then it returns `available` within timeout.
    - Given MCP server binary missing or spawn fails, When health check runs, Then it returns `unavailable` with a reason within timeout.
    - Given MCP server does not respond within timeout, When health check runs, Then it returns `unavailable` with `timeout` reason.
  - Priority: Must-Have

- **FR-MCP-004:** Graceful fallback to full prompt
  - Description: If MCP health check returns `unavailable`, the Analyze session starts anyway using the existing `buildAnalyzePrompt()` (full prompt with all bug fields embedded). The session MUST NOT fail due to MCP unavailability.
  - Acceptance Criteria:
    - Given MCP unavailable, When Analyze starts, Then session uses full prompt and runs successfully.
    - Given MCP unavailable, When Analyze starts, Then a non-blocking warning is communicated to renderer via `AGENT_MCP_STATUS`.
  - Priority: Must-Have

#### Prompt Strategy

- **FR-MCP-005:** Short MCP-aware prompt
  - Description: When MCP is available, the prompt builder produces a shorter prompt containing only the bug ID and instructions to fetch details via MCP tools. This replaces the full prompt for MCP-enabled sessions.
  - Acceptance Criteria:
    - Given MCP available, When prompt is built, Then output contains bug ID and MCP fetch instructions, but NOT full bug description/fields.
    - Given MCP unavailable, When prompt is built, Then existing full prompt is used unchanged.
  - Priority: Must-Have

#### Runner MCP Integration

- **FR-MCP-006:** Claude SDK runner MCP support
  - Description: The Claude runner sets `supportsMcp = true`, adds `settingSources: ['project']` to SDK options, and passes `AZURE_DEVOPS_PAT` via env so the SDK picks up `.mcp.json` from the cwd.
  - Acceptance Criteria:
    - Given MCP available, When Claude runner executes, Then `settingSources` includes `'project'` and env contains `AZURE_DEVOPS_PAT`.
  - Priority: Must-Have

- **FR-MCP-007:** Codex SDK runner MCP support
  - Description: The Codex runner sets `supportsMcp = true`. Since Codex uses the working directory as cwd, the `.mcp.json` written by McpConfigWriter is automatically picked up. The env with PAT must also be passed.
  - Acceptance Criteria:
    - Given MCP available and `.mcp.json` in cwd, When Codex runner executes, Then session has access to MCP tools.
  - Priority: Must-Have

- **FR-MCP-008:** Copilot SDK runner MCP support
  - Description: The Copilot runner sets `supportsMcp = true` and passes `mcpServers` config to `createSession()` when MCP is available.
  - Acceptance Criteria:
    - Given MCP available, When Copilot runner starts session, Then `createSession` options include the ADO MCP server with proper env.
  - Priority: Must-Have

#### IPC & UI

- **FR-MCP-009:** AGENT_MCP_STATUS IPC event
  - Description: A new IPC channel `AGENT_MCP_STATUS` notifies the renderer about MCP availability per session, emitted after health check completes (before or concurrently with session start).
  - Acceptance Criteria:
    - Given any Analyze session start, When health check completes, Then `AGENT_MCP_STATUS` is emitted with `{ sessionId, mcpAvailable, reason? }`.
  - Priority: Must-Have

- **FR-MCP-010:** MCP status indicator in UI
  - Description: The renderer displays a visible indicator (badge, icon, or label) showing whether the current/last session used MCP or fell back to full prompt.
  - Acceptance Criteria:
    - Given session started with MCP, Then indicator shows "MCP" or equivalent positive signal.
    - Given session started in fallback, Then indicator shows fallback warning (tooltip with reason).
    - Given no session, Then no indicator is shown.
  - Priority: Must-Have

### Non-Functional Requirements

- **NFR-SEC-001:** The ADO PAT must never be written to disk in cleartext. It is passed only via environment variables at process spawn time and via `${AZURE_DEVOPS_PAT}` placeholder in `.mcp.json`.
- **NFR-PERF-001:** MCP health check must complete (success or timeout) within 5 seconds. It must not block the main process event loop.
- **NFR-RESIL-001:** Any failure in MCP setup (write error, health check, spawn) must result in a graceful fallback — never a session failure.
- **NFR-COMPAT-001:** The `.mcp.json` merge logic must preserve all existing entries and produce a valid JSON file regardless of input formatting.

### Constraints

- `@azure-devops/mcp-server` must be installed as a direct dependency (not optional) since the binary path is resolved from `node_modules`.
- The `.mcp.json` must reference the MCP server via `node node_modules/@azure-devops/mcp-server/build/index.js` command pattern.
- Only `analyze` mode uses MCP — `fix` mode remains out of scope.
- All three runners share the same `RunParams` interface extension.

### Assumptions

- `@azure-devops/mcp-server` exposes a stdio-based MCP server at `build/index.js`.
- The MCP server accepts `AZURE_DEVOPS_PAT`, `AZURE_DEVOPS_ORG_URL`, and `AZURE_DEVOPS_PROJECT` environment variables.
- Claude Agent SDK supports `settingSources: ['project']` to load `.mcp.json` from cwd.
- Codex SDK auto-discovers `.mcp.json` from `workingDirectory`.
- Copilot SDK `createSession()` accepts `mcpServers` configuration array.
- A successful health check means the MCP server process starts and responds to `initialize` within the timeout.

### Out of Scope

- Fix mode MCP integration
- Multi-repo / cross-project MCP routing
- Workspace multi-session (FT-14E)
- Session persistence across app restart
- ADO MCP server for fetching attachments or work item relations
- Custom user-managed MCP servers beyond ADO

### Edge Cases

| Scenario                                                    | Expected Behavior                                                     | Related Requirement    |
| ----------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------- |
| `.mcp.json` exists but is invalid JSON                      | Overwrite with fresh valid config (log warning)                       | FR-MCP-001             |
| `.mcp.json` write fails (read-only fs)                      | Log error, proceed with fallback (no MCP)                             | FR-MCP-001, FR-MCP-004 |
| MCP server binary not found in node_modules                 | Health check returns `unavailable` with clear reason                  | FR-MCP-003             |
| PAT is empty/unset in settings                              | Skip MCP entirely, use full prompt fallback                           | FR-MCP-004             |
| orgUrl or projectName missing in settings                   | Skip MCP, fallback to full prompt                                     | FR-MCP-004             |
| Health check passes but MCP server crashes mid-session      | Runner handles error normally; session may degrade but does not crash | NFR-RESIL-001          |
| Copilot SDK doesn't support `mcpServers` in current version | Graceful skip, fallback to full prompt                                | FR-MCP-008, FR-MCP-004 |
| Multiple rapid session starts                               | Only latest health check result matters; `.mcp.json` is idempotent    | FR-MCP-003             |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 14
- **Parallelizable:** 9 (64%)
- **Execution Waves:** 5

### Execution Waves

#### Wave 1 — Foundation (Types, Channels, Dependency)

**Execution:** PARALLEL

| Task ID | Type      | Title                                     | Description                                                                          | Files                                                                          | Depends On | Complexity |
| ------- | --------- | ----------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ---------- | ---------- |
| T-001   | SETUP     | Add `@azure-devops/mcp-server` dependency | Install the MCP server package as a direct dependency                                | `package.json`                                                                 | None       | S          |
| T-002   | IMPLEMENT | Extend shared types & IPC channels        | Add `McpStatus` type, `AGENT_MCP_STATUS` channel, extend `RunParams` with MCP fields | `src/shared/types.ts`, `src/shared/ipc-channels.ts`, `src/main/agent/types.ts` | None       | S          |

#### Wave 2 — Core Utilities

**Execution:** PARALLEL

| Task ID | Type      | Title                    | Description                                                                                | Files                                 | Depends On | Complexity |
| ------- | --------- | ------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------- | ---------- | ---------- |
| T-003   | IMPLEMENT | McpConfigWriter utility  | Write/merge `.mcp.json` with non-destructive merge, PAT placeholder, node binary reference | `src/main/agent/mcp-config-writer.ts` | T-002      | M          |
| T-004   | IMPLEMENT | MCP health check utility | Spawn MCP server process, send `initialize`, verify response within timeout, return status | `src/main/agent/mcp-health-check.ts`  | T-002      | M          |
| T-005   | IMPLEMENT | MCP-aware prompt builder | Add `buildMcpPrompt()` function returning short prompt with bug ID + MCP instructions      | `src/main/agent/prompt-builder.ts`    | T-002      | S          |

#### Wave 3 — Runner Updates

**Execution:** PARALLEL

| Task ID | Type      | Title                              | Description                                                                                         | Files                                          | Depends On   | Complexity |
| ------- | --------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------ | ---------- |
| T-006   | IMPLEMENT | Claude SDK runner MCP integration  | Set `supportsMcp = true`, add `settingSources: ['project']`, pass PAT via env when MCP is available | `src/main/agent/runners/claude-sdk-runner.ts`  | T-002, T-003 | M          |
| T-007   | IMPLEMENT | Codex SDK runner MCP integration   | Set `supportsMcp = true`, pass PAT env to the Codex process when MCP is available                   | `src/main/agent/runners/codex-sdk-runner.ts`   | T-002, T-003 | S          |
| T-008   | IMPLEMENT | Copilot SDK runner MCP integration | Set `supportsMcp = true`, pass `mcpServers[]` to `createSession()` when MCP is available            | `src/main/agent/runners/copilot-sdk-runner.ts` | T-002        | M          |

#### Wave 4 — Integration (IPC + Orchestration)

**Execution:** SEQUENTIAL

| Task ID | Type      | Title                                  | Description                                                                                                   | Files                      | Depends On                               | Complexity |
| ------- | --------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------- | ---------- |
| T-009   | IMPLEMENT | Orchestrate MCP in AGENT_START handler | Run health check, write `.mcp.json` (Claude/Codex), choose prompt, emit MCP status, pass MCP params to runner | `src/main/ipc-handlers.ts` | T-003, T-004, T-005, T-006, T-007, T-008 | L          |
| T-010   | IMPLEMENT | Expose AGENT_MCP_STATUS in preload     | Add listener bridge for the new MCP status IPC event                                                          | `src/preload/index.ts`     | T-002                                    | S          |

#### Wave 5 — Renderer + Tests

**Execution:** PARALLEL

| Task ID | Type      | Title                              | Description                                                                                                       | Files                                                                                                                                                                          | Depends On                               | Complexity |
| ------- | --------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ---------- |
| T-011   | IMPLEMENT | MCP status in useAgentSession hook | Subscribe to `AGENT_MCP_STATUS`, expose `mcpStatus` in hook return                                                | `src/renderer/src/hooks/useAgentSession.ts`                                                                                                                                    | T-010                                    | S          |
| T-012   | IMPLEMENT | MCP status badge in UI             | Render badge/icon based on `mcpStatus` in agent session area                                                      | `src/renderer/src/pages/DashboardPage.tsx` (or agent panel component)                                                                                                          | T-011                                    | S          |
| T-013   | TEST      | Main-process tests                 | McpConfigWriter (write/merge/no-cleartext), health check (success/timeout/fail), prompt switch, runner MCP config | `tests/main/mcp-config-writer.spec.ts`, `tests/main/mcp-health-check.spec.ts`, `tests/main/agent-prompt-builder.spec.ts` (update), `tests/main/runner-mcp-integration.spec.ts` | T-003, T-004, T-005, T-006, T-007, T-008 | L          |
| T-014   | TEST      | Renderer tests                     | MCP status badge rendering (MCP active, fallback, no session)                                                     | `tests/renderer/McpStatusBadge.spec.tsx`                                                                                                                                       | T-012                                    | S          |

### Critical Path

T-002 → T-003 → T-009 → T-013 (critical path: 4 tasks)

### Task Details

#### T-001: Add `@azure-devops/mcp-server` dependency

- **Type:** SETUP
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Run `npm install @azure-devops/mcp-server`
  2. Verify `node_modules/@azure-devops/mcp-server/build/index.js` exists
  3. Add to `dependencies` (not `devDependencies`)
- **Acceptance Criteria:** Package installed, binary path resolvable at runtime
- **Testing Approach:** Manual verification
- **Output:** Updated `package.json`, `package-lock.json`

#### T-002: Extend shared types & IPC channels

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. In `src/shared/types.ts`:
     - Add `McpStatus` interface: `{ available: boolean; reason?: string }`
     - Add `AgentMcpStatusPayload`: `{ sessionId: string; mcpStatus: McpStatus }`
  2. In `src/shared/ipc-channels.ts`:
     - Add `AGENT_MCP_STATUS: 'agent:mcp-status'` to `IPC_CHANNELS`
  3. In `src/main/agent/types.ts`:
     - Extend `RunParams` with optional MCP fields:
       - `mcpAvailable?: boolean`
       - `adoPat?: string`
       - `adoOrgUrl?: string`
       - `adoProjectName?: string`
- **Acceptance Criteria:** Types compile, no breaking changes to existing consumers
- **Testing Approach:** TypeScript compilation check
- **Output:** `src/shared/types.ts`, `src/shared/ipc-channels.ts`, `src/main/agent/types.ts`

#### T-003: McpConfigWriter utility

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `src/main/agent/mcp-config-writer.ts`
  2. Export `writeMcpConfig(projectPath: string, orgUrl: string, projectName: string): Promise<void>`
  3. Resolve MCP server binary path: `require.resolve('@azure-devops/mcp-server/build/index.js')`
  4. Build config object:
     ```json
     {
       "mcpServers": {
         "azure-devops": {
           "command": "node",
           "args": ["<resolved-path>"],
           "env": {
             "AZURE_DEVOPS_PAT": "${AZURE_DEVOPS_PAT}",
             "AZURE_DEVOPS_ORG_URL": "<orgUrl>",
             "AZURE_DEVOPS_PROJECT": "<projectName>"
           }
         }
       }
     }
     ```
  5. If `.mcp.json` exists: read, parse, merge only `mcpServers["azure-devops"]` key, write back
  6. If `.mcp.json` exists but is invalid JSON: overwrite entirely, log warning
  7. If `.mcp.json` does not exist: write fresh
  8. Export `cleanupMcpConfig(projectPath: string): Promise<void>` (removes only the `azure-devops` key)
- **Acceptance Criteria:** File written with correct structure; existing servers preserved; no cleartext PAT
- **Testing Approach:** TDD — unit tests with mocked fs
- **Output:** `src/main/agent/mcp-config-writer.ts`

#### T-004: MCP health check utility

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `src/main/agent/mcp-health-check.ts`
  2. Export `checkMcpHealth(options: { orgUrl: string; projectName: string; pat: string; timeoutMs?: number }): Promise<McpStatus>`
  3. Logic:
     a. Resolve MCP server binary path
     b. Spawn `node <binary-path>` with env `{ AZURE_DEVOPS_PAT: pat, AZURE_DEVOPS_ORG_URL: orgUrl, AZURE_DEVOPS_PROJECT: projectName }`
     c. Send JSON-RPC `initialize` request over stdio
     d. Wait for response or timeout (default 5000ms)
     e. Kill the process regardless of outcome
     f. Return `{ available: true }` or `{ available: false, reason: '...' }`
  4. Handle: binary not found, spawn error, timeout, invalid response
- **Acceptance Criteria:** Returns within timeout; never throws; always returns `McpStatus`
- **Testing Approach:** TDD — mock child_process.spawn
- **Output:** `src/main/agent/mcp-health-check.ts`

#### T-005: MCP-aware prompt builder

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Add `buildMcpPrompt(bugId: number, project: ProjectEntry, architectureContext: string): string` to `src/main/agent/prompt-builder.ts`
  2. Prompt content:
     - System instruction: senior engineer performing root-cause analysis
     - Bug ID only: "Fetch bug #{bugId} details using the Azure DevOps MCP tools"
     - Instructions to use MCP for: work item details, description, attachments
     - Project context (same as existing)
     - Architecture context if present
     - Same task structure as `buildAnalyzePrompt` output section
  3. Keep `buildAnalyzePrompt` unchanged (it's the fallback)
- **Acceptance Criteria:** Prompt contains bug ID, MCP fetch instructions, no embedded bug fields
- **Testing Approach:** Unit test verifying prompt content
- **Output:** Updated `src/main/agent/prompt-builder.ts`

#### T-006: Claude SDK runner MCP integration

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Set `supportsMcp = true`
  2. In `run()`, check `params.mcpAvailable`
  3. If MCP available:
     - Add `settingSources: ['project']` to options
     - Merge `AZURE_DEVOPS_PAT: params.adoPat` into env object (alongside existing `ANTHROPIC_API_KEY`)
  4. If MCP not available: behavior unchanged
- **Acceptance Criteria:** With MCP flag, SDK options include `settingSources` and env has PAT
- **Testing Approach:** Unit test with mocked SDK
- **Output:** Updated `src/main/agent/runners/claude-sdk-runner.ts`

#### T-007: Codex SDK runner MCP integration

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Set `supportsMcp = true`
  2. In `run()`, check `params.mcpAvailable`
  3. If MCP available: pass env with `AZURE_DEVOPS_PAT` to the Codex constructor/thread options (check SDK API for env passing)
  4. If MCP not available: behavior unchanged
  5. Note: `.mcp.json` is already in the `workingDirectory` so Codex should auto-discover it
- **Acceptance Criteria:** With MCP flag, runner passes PAT env to SDK
- **Testing Approach:** Unit test with mocked SDK
- **Output:** Updated `src/main/agent/runners/codex-sdk-runner.ts`

#### T-008: Copilot SDK runner MCP integration

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Set `supportsMcp = true`
  2. In `run()`, check `params.mcpAvailable`
  3. If MCP available: build `mcpServers` config array:
     ```typescript
     mcpServers: [
       {
         name: 'azure-devops',
         command: 'node',
         args: [resolvedBinaryPath],
         env: {
           AZURE_DEVOPS_PAT: params.adoPat,
           AZURE_DEVOPS_ORG_URL: params.adoOrgUrl,
           AZURE_DEVOPS_PROJECT: params.adoProjectName
         }
       }
     ]
     ```
  4. Pass to `createSession()` options
  5. If MCP not available: don't pass `mcpServers`
- **Acceptance Criteria:** With MCP flag, `createSession` receives `mcpServers` array
- **Testing Approach:** Unit test with mocked SDK
- **Output:** Updated `src/main/agent/runners/copilot-sdk-runner.ts`

#### T-009: Orchestrate MCP in AGENT_START handler

- **Type:** INTEGRATE
- **Wave:** 4 — SEQUENTIAL
- **Implementation Notes:**
  1. After resolving settings, bug, and project in `AGENT_START`:
  2. Determine if MCP is feasible: `settings.pat && settings.orgUrl && settings.projectName`
  3. If feasible:
     a. Run `checkMcpHealth({ orgUrl, projectName, pat })`
     b. If available AND provider is `claude-sdk` or `codex-sdk`: run `writeMcpConfig(project.path, orgUrl, projectName)`
     c. Set `mcpAvailable = healthResult.available`
  4. If not feasible: `mcpAvailable = false`
  5. Choose prompt: `mcpAvailable ? buildMcpPrompt(bug.id, project, arch) : buildAnalyzePrompt(bug, project, arch)`
  6. Pass MCP fields to `runParams`: `{ mcpAvailable, adoPat: settings.pat, adoOrgUrl: settings.orgUrl, adoProjectName: settings.projectName }`
  7. Emit `AGENT_MCP_STATUS` to renderer: `event.sender.send(IPC_CHANNELS.AGENT_MCP_STATUS, { sessionId, mcpStatus: healthResult })`
  8. Wrap MCP steps in try/catch — any error → fallback silently with warning
- **Acceptance Criteria:** Session starts with correct prompt; MCP status emitted; failures don't block session
- **Testing Approach:** Integration test mocking health check + config writer
- **Output:** Updated `src/main/ipc-handlers.ts`

#### T-010: Expose AGENT_MCP_STATUS in preload

- **Type:** IMPLEMENT
- **Wave:** 4 — PARALLEL (with T-009, depends only on T-002)
- **Implementation Notes:**
  1. In `src/preload/index.ts`, add listener for `AGENT_MCP_STATUS`:
     ```typescript
     onAgentMcpStatus: (callback) =>
       ipcRenderer.on('agent:mcp-status', (_event, data) => callback(data))
     ```
  2. Update `src/preload/index.d.ts` type declaration
- **Acceptance Criteria:** Renderer can subscribe to MCP status events via `window.electronAPI`
- **Testing Approach:** Type check
- **Output:** Updated `src/preload/index.ts`, `src/preload/index.d.ts`

#### T-011: MCP status in useAgentSession hook

- **Type:** IMPLEMENT
- **Wave:** 5 — PARALLEL
- **Implementation Notes:**
  1. Add `mcpStatus: McpStatus | null` to `UseAgentSessionReturn`
  2. Add state: `const [mcpStatus, setMcpStatus] = useState<McpStatus | null>(null)`
  3. Subscribe to `onAgentMcpStatus` in useEffect, update state
  4. Reset `mcpStatus` when `clearSession` is called
- **Acceptance Criteria:** Hook exposes reactive `mcpStatus` that updates on IPC event
- **Testing Approach:** Post-implementation
- **Output:** Updated `src/renderer/src/hooks/useAgentSession.ts`

#### T-012: MCP status badge in UI

- **Type:** IMPLEMENT
- **Wave:** 5 — PARALLEL
- **Implementation Notes:**
  1. Create a small inline component or badge near the agent session status area
  2. When `mcpStatus.available === true`: green badge "MCP" or server icon
  3. When `mcpStatus.available === false`: amber badge "Fallback" with tooltip showing `reason`
  4. When `mcpStatus === null`: hidden
  5. Use existing Tailwind utility classes (consistent with project style)
- **Acceptance Criteria:** Visual indicator correct for all three states
- **Testing Approach:** Renderer test
- **Output:** Updated `src/renderer/src/pages/DashboardPage.tsx` (or extracted component)

#### T-013: Main-process tests

- **Type:** TEST
- **Wave:** 5 — PARALLEL
- **Implementation Notes:**
  1. `tests/main/mcp-config-writer.spec.ts`:
     - Write fresh `.mcp.json`
     - Merge into existing `.mcp.json` with other servers
     - Overwrite invalid JSON `.mcp.json`
     - Verify PAT placeholder (never cleartext)
     - Handle write permission error gracefully
  2. `tests/main/mcp-health-check.spec.ts`:
     - Successful health check (mock spawn + stdio response)
     - Timeout scenario
     - Binary not found
     - Spawn error
  3. Update `tests/main/agent-prompt-builder.spec.ts`:
     - Test `buildMcpPrompt` output structure
     - Verify no bug fields in MCP prompt
     - Verify bug fields present in fallback prompt
  4. `tests/main/runner-mcp-integration.spec.ts`:
     - Claude: verify `settingSources` and env when `mcpAvailable`
     - Codex: verify env passing when `mcpAvailable`
     - Copilot: verify `mcpServers` in session config when `mcpAvailable`
     - All runners: verify unchanged behavior when `mcpAvailable = false`
- **Acceptance Criteria:** All tests pass; cover success, failure, and edge cases
- **Testing Approach:** TDD for config writer and health check; post-implementation for runners
- **Output:** 4 test files

#### T-014: Renderer tests

- **Type:** TEST
- **Wave:** 5 — PARALLEL
- **Implementation Notes:**
  1. `tests/renderer/McpStatusBadge.spec.tsx`:
     - Renders "MCP" badge when `mcpStatus.available === true`
     - Renders "Fallback" badge with reason when `mcpStatus.available === false`
     - Renders nothing when `mcpStatus === null`
  2. Mock `window.electronAPI.onAgentMcpStatus`
- **Acceptance Criteria:** Badge renders correctly for all states
- **Testing Approach:** Post-implementation
- **Output:** `tests/renderer/McpStatusBadge.spec.tsx`

### Risk Register

| Risk                                                            | Impact                      | Likelihood | Mitigation                                                            |
| --------------------------------------------------------------- | --------------------------- | ---------- | --------------------------------------------------------------------- |
| `@azure-devops/mcp-server` binary path changes between versions | MCP stops working           | Low        | Resolve path dynamically via `require.resolve`; test in CI            |
| Codex SDK does not auto-discover `.mcp.json`                    | MCP unavailable for Codex   | Medium     | Verify with actual SDK; if not supported, pass env + rely on fallback |
| Copilot SDK `createSession` doesn't accept `mcpServers`         | MCP unavailable for Copilot | Medium     | Check SDK types at implementation time; graceful fallback             |
| `.mcp.json` merge corrupts user config                          | User repo damage            | Low        | Extensive test coverage; backup before write; atomic write            |
| MCP health check leaks orphan processes                         | Resource leak               | Low        | Always kill spawned process in finally block with timeout             |
| PAT accidentally logged or exposed                              | Security breach             | Low        | Never pass PAT to logging; only to env vars; test assertions          |

---

### Completeness Assessment

- Functional coverage: **High** — all 10 FRs map to tasks
- Non-functional coverage: **High** — security (PAT handling), performance (timeout), resilience (fallback) all addressed
- Task-to-requirement mapping: **Complete**

| Requirement | Tasks               |
| ----------- | ------------------- |
| FR-MCP-001  | T-003, T-013        |
| FR-MCP-002  | T-008, T-013        |
| FR-MCP-003  | T-004, T-009, T-013 |
| FR-MCP-004  | T-005, T-009, T-013 |
| FR-MCP-005  | T-005, T-013        |
| FR-MCP-006  | T-006, T-013        |
| FR-MCP-007  | T-007, T-013        |
| FR-MCP-008  | T-008, T-013        |
| FR-MCP-009  | T-002, T-009, T-010 |
| FR-MCP-010  | T-011, T-012, T-014 |

### Status

**READY FOR APPROVAL**
