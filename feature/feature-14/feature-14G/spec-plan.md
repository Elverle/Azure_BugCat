# Spec-Planner — Iteration 1

## Feature Context

- **Feature:** Code Source Selection (Local vs MCP Repos)
- **Feature #:** FT-14G
- **Feature Type:** full-stack

---

## Part 1: Requirements

### Functional Requirements

#### Settings & Configuration

- **FR-CFG-001:** New global setting `codeSource`
  - Description: Add a new field `codeSource: 'local' | 'mcp-repos'` to `AppSettings` with default value `'local'` for backward compatibility.
  - Acceptance Criteria: Given a fresh install or existing store, When settings are loaded, Then `codeSource` defaults to `'local'` and existing behavior is unchanged.
  - Priority: Must-Have

- **FR-CFG-002:** Store migration to schema version 6
  - Description: Add migration that initializes `codeSource = 'local'` on existing stores.
  - Acceptance Criteria: Given a store at schema version 5, When migration runs, Then `settings.codeSource` is `'local'` and `CURRENT_SCHEMA_VERSION` is 6.
  - Priority: Must-Have

- **FR-CFG-003:** Settings UI selector for code source
  - Description: Show a toggle/select in the Agent Provider section of Settings to choose between "Filesystem locale" and "MCP Azure DevOps Repos".
  - Acceptance Criteria: Given Settings page, When user selects `mcp-repos`, Then the choice is persisted and the UI reflects the selection.
  - Priority: Must-Have

- **FR-CFG-004:** Conditional path visibility in Project Registry
  - Description: When `codeSource = 'mcp-repos'`, the "Percorso" (path) field in `ProjectRegistrySection` is hidden or disabled with a note explaining that local paths are not needed.
  - Acceptance Criteria: Given `codeSource = 'mcp-repos'`, When user views the project registry, Then the path input is not shown and path validation is skipped.
  - Priority: Must-Have

- **FR-CFG-005:** `ProjectEntry.path` becomes optional under MCP repos mode
  - Description: When `codeSource = 'mcp-repos'`, the `path` field on `ProjectEntry` is not required and not validated. The `name` field is used as the repo name identifier for MCP tools.
  - Acceptance Criteria: Given `codeSource = 'mcp-repos'` and a project with empty path, When settings are saved, Then no validation error is raised for path.
  - Priority: Must-Have

#### Agent Session Start Flow

- **FR-START-001:** MCP availability gate for `mcp-repos` mode
  - Description: When `codeSource = 'mcp-repos'`, the `agent:start` handler MUST require MCP health check to pass. If MCP is unavailable, the session start fails with a clear error message (no fallback to local).
  - Acceptance Criteria: Given `codeSource = 'mcp-repos'` and MCP health check fails, When agent:start is invoked, Then it throws `AGENT_NOT_CONFIGURED` with message indicating MCP is required but unavailable.
  - Priority: Must-Have

- **FR-START-002:** Fallback `cwd` for runners in MCP repos mode
  - Description: When `codeSource = 'mcp-repos'`, runners receive a temporary working directory (e.g., `os.tmpdir()` or a BugCat-specific subdirectory) as `primaryPath` since no local project directory is needed.
  - Acceptance Criteria: Given `codeSource = 'mcp-repos'`, When session starts, Then `RunParams.primaryPath` is set to a valid, existing temporary directory.
  - Priority: Must-Have

- **FR-START-003:** Skip local path validation in MCP repos mode
  - Description: The `agent:start` handler currently validates that `project.path` exists on disk. When `codeSource = 'mcp-repos'`, this validation is skipped.
  - Acceptance Criteria: Given `codeSource = 'mcp-repos'` and a project without local path, When agent:start runs, Then no filesystem validation error occurs.
  - Priority: Must-Have

- **FR-START-004:** `.mcp.json` written to temp directory in MCP repos mode
  - Description: For Claude/Codex in MCP repos mode, `.mcp.json` is written to the temp working directory (the fallback `cwd`) instead of the project path.
  - Acceptance Criteria: Given `codeSource = 'mcp-repos'` and Claude provider, When session starts, Then `.mcp.json` is written to the temp working directory.
  - Priority: Must-Have

#### Prompt Builder

- **FR-PROMPT-001:** New MCP-repos-only prompt variant
  - Description: Create a new prompt builder function `buildMcpReposPrompt()` that instructs the agent to use ONLY MCP repo tools (`repo_list_repos_by_project`, `repo_list_directory`, `repo_get_file_content`) for all code reading. No local filesystem paths are mentioned.
  - Acceptance Criteria: Given a bug and project with `codeSource = 'mcp-repos'`, When prompt is built, Then it contains instructions to use MCP repo tools exclusively for code navigation, does NOT mention any local path, and includes the repo name(s) to search.
  - Priority: Must-Have

- **FR-PROMPT-002:** Secondary projects in MCP repos prompt reference repo names
  - Description: When secondary projects exist in MCP repos mode, the prompt lists them by repo name (not by path) and instructs the agent to use MCP tools for all secondary repos.
  - Acceptance Criteria: Given secondary projects with names "api-service" and "shared-lib", When MCP repos prompt is built, Then it references these repo names for MCP access.
  - Priority: Must-Have

#### Runner Configuration

- **FR-RUNNER-001:** Claude runner includes repo MCP tools in allowedTools
  - Description: When `codeSource = 'mcp-repos'`, the Claude runner's `allowedTools` should emphasize `mcp__azure-devops` and MAY omit local filesystem tools (`Read`, `Glob`, `Grep`) since the temp dir has no useful content.
  - Acceptance Criteria: Given `codeSource = 'mcp-repos'`, When Claude runner starts, Then `allowedTools` includes `mcp__azure-devops` and does NOT include `Read`, `Glob`, `Grep`.
  - Priority: Must-Have

- **FR-RUNNER-002:** Codex/Copilot runners use temp dir as workingDirectory
  - Description: In MCP repos mode, Codex and Copilot runners pass the temp directory as their working directory without expecting project code there.
  - Acceptance Criteria: Given `codeSource = 'mcp-repos'`, When Codex/Copilot runner starts, Then `workingDirectory`/`cwd` points to the temp directory.
  - Priority: Must-Have

- **FR-RUNNER-003:** `RunParams` extended with `codeSource` signal
  - Description: Add an optional field to `RunParams` (e.g., `codeSource?: 'local' | 'mcp-repos'`) so runners can adapt their tool configuration accordingly.
  - Acceptance Criteria: Given `codeSource = 'mcp-repos'` in settings, When RunParams are built, Then `params.codeSource` is `'mcp-repos'`.
  - Priority: Must-Have

### Non-Functional Requirements

- **NFR-COMPAT-001:** Backward compatibility — existing users with `codeSource = 'local'` (explicit or defaulted) experience zero behavioral change.
- **NFR-UX-001:** The code source option is visually grouped near the Agent Provider section in Settings, with a brief explanation.
- **NFR-PERF-001:** The temp directory for MCP repos mode is created once at app startup or on first use (not per-session).
- **NFR-SEC-001:** No PAT or sensitive data is written to the temp directory beyond the existing `.mcp.json` pattern (which uses `${PERSONAL_ACCESS_TOKEN}` placeholder).

### Constraints

- The `@azure-devops/mcp` server is not modified — only its existing repo tools are leveraged.
- Only `analyze` mode is supported with MCP repos (Fix mode requires local write access — out of scope).
- The field `ProjectEntry.path` remains in the type definition (as optional) to avoid breaking serialized data.

### Assumptions

- The MCP repo tools (`repo_list_repos_by_project`, `repo_list_directory`, `repo_get_file_content`) are already available in the `@azure-devops/mcp` server used by BugCat — no new server installation needed.
- `ProjectEntry.name` corresponds to the Azure DevOps repository name (or is sufficiently close for the MCP `repo_get_repo_by_name_or_id` tool to resolve it).
- Claude, Codex, and Copilot SDK runners all support operating with a `cwd` that does not contain project code (they use it for process spawning, not code context).
- `os.tmpdir()` is always available and writable on all supported platforms.

### Out of Scope

- Fix mode with MCP repos (requires remote write, future feature)
- Clone-on-demand of remote repos to local disk
- Branch selection UI (future enhancement — agents will default to main/master)
- Multi-branch navigation within a session
- Modifications to the `@azure-devops/mcp` server itself
- Per-project code source toggle (global only for v1)

### Edge Cases

| Scenario                                                      | Expected Behavior                                                                                                                     | Related Requirement    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| User selects `mcp-repos` but ADO PAT / Org URL not configured | Settings validation warns; `agent:start` fails with `AGENT_NOT_CONFIGURED` (MCP prerequisite not met)                                 | FR-START-001           |
| User selects `mcp-repos` and MCP health check times out       | Session start fails with clear error; no silent fallback to local                                                                     | FR-START-001           |
| User switches from `mcp-repos` back to `local`                | Path validation re-activates; existing projects without path show validation errors                                                   | FR-CFG-004, FR-CFG-005 |
| Project `name` does not match any ADO repo name               | Agent session starts but MCP repo tools return errors — agent reports inability to find repo (handled in agent output, not in BugCat) | FR-PROMPT-001          |
| Temp directory is cleaned by OS between sessions              | Each session creates/validates the temp dir exists before use                                                                         | FR-START-002           |
| `codeSource = 'mcp-repos'` with `mode = 'fix'`                | Rejected at `agent:start` (Fix mode only supported with local)                                                                        | FR-START-001           |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 14
- **Parallelizable:** 9 (64%)
- **Execution Waves:** 4

### Execution Waves

#### Wave 1 — Shared Types & Store Foundation

**Execution:** PARALLEL

| Task ID | Type      | Title                                | Description                                                                             | Files                                              | Depends On | Complexity |
| ------- | --------- | ------------------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------- | ---------- |
| T-001   | IMPLEMENT | Add `codeSource` to shared types     | Add `CodeSource` type alias and update `AppSettings`, make `ProjectEntry.path` optional | `src/shared/types.ts`                              | None       | S          |
| T-002   | IMPLEMENT | Store migration v5→v6                | New migration setting `codeSource = 'local'` as default, bump `CURRENT_SCHEMA_VERSION`  | `src/main/store-migration.ts`, `src/main/store.ts` | None       | S          |
| T-003   | IMPLEMENT | Update `RunParams` with `codeSource` | Add optional `codeSource` field to `RunParams` interface                                | `src/main/agent/types.ts`                          | None       | S          |

#### Wave 2 — Core Logic Changes

**Execution:** PARALLEL (after Wave 1)

| Task ID | Type      | Title                                           | Description                                                                           | Files                                          | Depends On          | Complexity |
| ------- | --------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------- | ---------- |
| T-004   | IMPLEMENT | New `buildMcpReposPrompt()` function            | Create prompt variant that instructs exclusive MCP repo tool usage                    | `src/main/agent/prompt-builder.ts`             | T-001               | M          |
| T-005   | IMPLEMENT | Update `agent:start` handler for MCP repos flow | Skip path validation, use temp dir, require MCP health, select prompt variant         | `src/main/ipc-handlers.ts`                     | T-001, T-002, T-003 | L          |
| T-006   | IMPLEMENT | Update Claude runner for MCP repos mode         | Adjust `allowedTools` based on `codeSource` param                                     | `src/main/agent/runners/claude-sdk-runner.ts`  | T-003               | S          |
| T-007   | IMPLEMENT | Update Codex runner for MCP repos mode          | Acknowledge temp dir cwd, no behavioral change needed beyond receiving it             | `src/main/agent/runners/codex-sdk-runner.ts`   | T-003               | S          |
| T-008   | IMPLEMENT | Update Copilot runner for MCP repos mode        | No structural changes needed (MCP is already programmatic), but verify temp cwd works | `src/main/agent/runners/copilot-sdk-runner.ts` | T-003               | S          |
| T-009   | IMPLEMENT | Export new prompt builder from agent index      | Add `buildMcpReposPrompt` to barrel export                                            | `src/main/agent/index.ts`                      | T-004               | S          |

#### Wave 3 — Renderer UI Changes

**Execution:** PARALLEL (after Wave 1)

| Task ID | Type      | Title                                          | Description                                                                           | Files                                                                            | Depends On | Complexity |
| ------- | --------- | ---------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------- | ---------- |
| T-010   | IMPLEMENT | Settings UI: code source selector              | Add radio/select for `codeSource` in Agent Provider section or as a new small section | `src/renderer/src/components/settings/AgentProviderSection.tsx` or new component | T-001      | M          |
| T-011   | IMPLEMENT | ProjectRegistrySection: conditional path field | Hide/disable path field when `codeSource = 'mcp-repos'`                               | `src/renderer/src/components/settings/ProjectRegistrySection.tsx`                | T-001      | S          |
| T-012   | IMPLEMENT | Update validation for MCP repos mode           | Skip `path` required validation when `codeSource = 'mcp-repos'`                       | `src/renderer/src/lib/validation.ts`                                             | T-001      | S          |

#### Wave 4 — Tests

**Execution:** PARALLEL (after Waves 2 & 3)

| Task ID | Type | Title                                       | Description                                                                             | Files                                                                                                 | Depends On                 | Complexity |
| ------- | ---- | ------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------- | ---------- |
| T-013   | TEST | Main-process tests for MCP repos flow       | Test migration, agent:start with mcp-repos, prompt builder, runner tool selection       | `tests/main/ipc-handlers.spec.ts`, `tests/main/agent-prompt-builder.spec.ts`, new test file if needed | T-002, T-004, T-005, T-006 | M          |
| T-014   | TEST | Renderer tests for settings UI & validation | Test code source selector visibility, path field conditional rendering, validation skip | `tests/renderer/SettingsPage.spec.tsx` or `tests/renderer/validation.spec.ts`                         | T-010, T-011, T-012        | M          |

### Critical Path

T-001 → T-005 → T-013 (critical path: 3 tasks)

### Task Details

#### T-001: Add `codeSource` to shared types

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Add `export type CodeSource = 'local' | 'mcp-repos'` near the top of `types.ts`
  2. Add `codeSource: CodeSource` to `AppSettings` (after `maxConcurrentSessions`)
  3. Change `ProjectEntry.path` from `path: string` to `path?: string` (make optional)
- **Acceptance Criteria:** TypeScript compiles; existing code that reads `project.path` may need `!` or guards (tracked in downstream tasks)
- **Testing Approach:** Compilation check; downstream tests
- **Output:** Updated `src/shared/types.ts`

#### T-002: Store migration v5→v6

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Bump `CURRENT_SCHEMA_VERSION` to 6
  2. Add migration version 6: sets `settings.codeSource = 'local'` if undefined
  3. Update store defaults to include `codeSource: 'local'`
- **Acceptance Criteria:** `migrateStore()` upgrades v5 stores to v6 with `codeSource: 'local'`
- **Testing Approach:** Unit test in existing migration spec
- **Output:** Updated `src/main/store-migration.ts`, `src/main/store.ts`

#### T-003: Update `RunParams` with `codeSource`

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Add `codeSource?: CodeSource` to `RunParams` interface
  2. Import `CodeSource` from `@shared/types`
- **Acceptance Criteria:** Interface extended; no runtime changes yet
- **Testing Approach:** Compilation check
- **Output:** Updated `src/main/agent/types.ts`

#### T-004: New `buildMcpReposPrompt()` function

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create new exported function `buildMcpReposPrompt(bugId, project, architectureContext, orgUrl, projectName, secondaryProjects?, userContext?)`
  2. Prompt structure:
     - System instruction: "Use ONLY MCP Azure DevOps repo tools for code navigation"
     - Explicit tool list: `repo_list_repos_by_project`, `repo_list_directory`, `repo_get_file_content`
     - Project context: repo name(s), DevOps org/project, architecture context
     - Secondary projects listed by name (no paths)
     - Same analysis task structure as existing `buildMcpPrompt` but without any local path references
  3. Do NOT mention `project.path` anywhere in the output
- **Acceptance Criteria:** Generated prompt contains MCP repo tool instructions, repo names, no local paths
- **Testing Approach:** TDD — unit test verifying prompt content
- **Output:** Updated `src/main/agent/prompt-builder.ts`

#### T-005: Update `agent:start` handler for MCP repos flow

- **Type:** IMPLEMENT
- **Wave:** 2 — SEQUENTIAL (depends on T-001, T-002, T-003)
- **Implementation Notes:**
  1. Read `settings.codeSource` from store
  2. If `codeSource === 'mcp-repos'`:
     - Skip `existsSync`/`statSync` validation of `project.path`
     - Compute `primaryPath = path.join(os.tmpdir(), 'bugcat-agent')` and ensure it exists (`mkdirSync` with `{ recursive: true }`)
     - Require `mcpFeasible && mcpStatus.available` — throw if not
     - Write `.mcp.json` to `primaryPath` (not `project.path`)
     - Call `buildMcpReposPrompt()` instead of `buildMcpPrompt()` or `buildAnalyzePrompt()`
     - Pass `codeSource: 'mcp-repos'` in RunParams
     - `secondaryPaths` is undefined (no local paths)
  3. If `codeSource === 'local'` (default): existing behavior unchanged
- **Acceptance Criteria:** MCP repos sessions start without local path; local sessions unchanged
- **Testing Approach:** Unit test mocking store, fs, MCP health
- **Output:** Updated `src/main/ipc-handlers.ts`

#### T-006: Update Claude runner for MCP repos mode

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Check `params.codeSource` in `run()`
  2. If `'mcp-repos'`: `allowedTools = ['mcp__azure-devops']` (no `Read`, `Glob`, `Grep`)
  3. If `'local'` or undefined: existing behavior (`['Read', 'Glob', 'Grep']` + conditionally `mcp__azure-devops`)
- **Acceptance Criteria:** Allowed tools list adapts to code source
- **Testing Approach:** Unit test
- **Output:** Updated `src/main/agent/runners/claude-sdk-runner.ts`

#### T-007: Update Codex runner for MCP repos mode

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. No structural change needed — Codex already uses `workingDirectory: params.primaryPath` and MCP env is already set
  2. Optionally log a note that running in MCP repos mode
- **Acceptance Criteria:** Codex runner works with temp dir as workingDirectory
- **Testing Approach:** Existing tests + manual verification
- **Output:** Updated `src/main/agent/runners/codex-sdk-runner.ts` (minimal)

#### T-008: Update Copilot runner for MCP repos mode

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. No structural change needed — Copilot already uses programmatic MCP server config and `cwd`/`workingDirectory` from params
  2. Verify `buildCopilotClientOptions` works with a temp path
- **Acceptance Criteria:** Copilot runner works with temp dir as cwd
- **Testing Approach:** Existing tests + manual verification
- **Output:** Updated `src/main/agent/runners/copilot-sdk-runner.ts` (minimal or no change)

#### T-009: Export new prompt builder from agent index

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Add `buildMcpReposPrompt` to the export list in `src/main/agent/index.ts`
- **Acceptance Criteria:** Import from `'./agent'` resolves `buildMcpReposPrompt`
- **Testing Approach:** Compilation check
- **Output:** Updated `src/main/agent/index.ts`

#### T-010: Settings UI: code source selector

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. In the Settings page (near Agent Provider section), add a labeled radio group or select:
     - "Filesystem locale" (value: `'local'`) — default
     - "MCP Azure DevOps Repos" (value: `'mcp-repos'`)
  2. Bind to `settings.codeSource` via `updateField('codeSource', value)`
  3. Show a brief helper text explaining the implications
  4. Update `useSettings` DEFAULT_SETTINGS to include `codeSource: 'local'`
- **Acceptance Criteria:** Selector renders, persists choice, and drives conditional UI
- **Testing Approach:** Renderer test
- **Output:** Updated `src/renderer/src/components/settings/AgentProviderSection.tsx` (or small new component), updated `src/renderer/src/hooks/useSettings.ts`

#### T-011: ProjectRegistrySection: conditional path field

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Accept new prop `codeSource: CodeSource` on `ProjectRegistrySectionProps`
  2. When `codeSource === 'mcp-repos'`: hide the "Percorso" div entirely and show a note: "In modalità MCP Repos il nome del progetto viene usato come identificativo del repository."
  3. When `codeSource === 'local'`: current behavior
- **Acceptance Criteria:** Path field hidden in MCP repos mode; visible in local mode
- **Testing Approach:** Renderer test
- **Output:** Updated `src/renderer/src/components/settings/ProjectRegistrySection.tsx`

#### T-012: Update validation for MCP repos mode

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Update `validateProjectEntry` to accept optional second parameter `codeSource?: CodeSource`
  2. When `codeSource === 'mcp-repos'`: skip `validateRequired` for `path`
  3. Update `validateSettings` to pass `settings.codeSource` to `validateProjectEntry`
- **Acceptance Criteria:** No path error for projects when in MCP repos mode
- **Testing Approach:** Unit test
- **Output:** Updated `src/renderer/src/lib/validation.ts`

#### T-013: Main-process tests for MCP repos flow

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Add test cases to `tests/main/ipc-handlers.spec.ts`:
     - `agent:start` with `codeSource = 'mcp-repos'`: verify temp dir used, MCP required, correct prompt variant
     - `agent:start` with `codeSource = 'mcp-repos'` and MCP unavailable: verify error thrown
  2. Add test cases to `tests/main/agent-prompt-builder.spec.ts`:
     - `buildMcpReposPrompt` output contains repo tool instructions, no local paths
  3. Test migration v6 in store migration tests
- **Acceptance Criteria:** All new test cases pass
- **Testing Approach:** Vitest, Node runtime
- **Output:** Updated/new test files in `tests/main/`

#### T-014: Renderer tests for settings UI & validation

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Test `validateProjectEntry` with `codeSource = 'mcp-repos'`: no error for empty path
  2. Test `ProjectRegistrySection` renders without path field when `codeSource = 'mcp-repos'`
  3. Test code source selector appears and updates settings
- **Acceptance Criteria:** All new test cases pass
- **Testing Approach:** Vitest + jsdom
- **Output:** Updated/new test files in `tests/renderer/`

### Risk Register

| Risk                                                                                      | Impact | Likelihood | Mitigation                                                                                                                      |
| ----------------------------------------------------------------------------------------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Claude SDK rejects empty/temp `cwd` with no valid git repo                                | Medium | Low        | Test early; Claude SDK docs confirm `cwd` is for process working directory, not required to be a git repo                       |
| Codex SDK requires a real project at `workingDirectory` for sandboxing                    | High   | Medium     | Verify in T-007; if blocked, create a minimal `.git` init in temp dir                                                           |
| MCP repo tools may not resolve project names exactly (spaces, case)                       | Medium | Medium     | Document that `ProjectEntry.name` should match the Azure DevOps repo name exactly; consider adding a `repoName` field in future |
| Existing projects with empty `path` after switching back to `local` mode break validation | Low    | High       | Edge case handled in T-012: validation re-requires path only in local mode                                                      |
| `os.tmpdir()` on Windows may have path length issues                                      | Low    | Low        | Use short subdir name (`bugcat-agent`); Windows tmpdir is typically short                                                       |

---

### Completeness Assessment

- Functional coverage: **High** — all identified flows are covered
- Non-functional coverage: **High** — backward compat, UX, security addressed
- Task-to-requirement mapping: **Complete** — every FR maps to at least one task

### Status

**READY FOR APPROVAL**

---

## Questions for User

1. **Repo name matching:** Should `ProjectEntry.name` be used directly as the Azure DevOps repo name for MCP tools, or do you want a separate `repoName` field for cases where the display name differs from the actual repo name?

2. **Local filesystem tools in MCP repos mode (Claude):** Should the Claude runner completely omit `Read`/`Glob`/`Grep` from `allowedTools`, or keep them available (the temp dir is empty anyway, but the agent could potentially use them for scratch/notes)?

3. **Fix mode guard:** Should attempting to start a Fix mode session with `codeSource = 'mcp-repos'` produce a specific user-facing error, or is the existing "Solo la modalità Analyze è supportata" message sufficient?
