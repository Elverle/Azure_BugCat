---
title: 'Agent Analysis Sessions'
type: topic
created: 2026-05-18
updated: 2026-05-26
sources:
  [
    '[[wiki/sources/ft-14a-agent-configuration-project-registry]]',
    '[[wiki/sources/ft-14b-agent-sessions]]',
    '[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]',
    '[[wiki/sources/ft-14d-cross-repo-project-suggestions]]',
    '[[wiki/sources/ft-14e-multi-session-agent-workspace]]',
    '[[wiki/sources/ft-14f-provider-auth-parity-analysis]]',
    '[[wiki/sources/ft-14g-code-source-selection-mcp-repos-vs-local-filesystem]]'
  ]
tags: [agent, dashboard, ipc, sessions, analysis]
lang: en
---

## Overview

FT-14B realizes the FT-14A settings foundation as a live operator workflow for bug-by-bug codebase analysis. FT-14C extends that workflow so each session can optionally fetch live Azure DevOps work item context through MCP before reading the local codebase. FT-14D adds a smart launch preflight with primary and secondary project selection. FT-14E then replaces the old single-session tab with a bounded multi-session workspace that persists recent runs, restores them after crashes, and separates list summaries from full session detail. FT-14F adds provider/auth parity checks so invalid configurations are blocked before click, while privileged preflight remains enforced in the main process. FT-14G adds a deterministic code-source choice so sessions can either read code from local paths or from Azure DevOps repositories via MCP repo tools. min-09 adds optional operator notes that travel through the same start flow and are fenced into the final prompt as background-only context.

## End-to-End Flow

```text
BugDetailDrawer
  -> AnalyzeStartPanel
    -> checkAgentAvailability() / getAgentAvailabilityHint()
    -> optional agentSuggestProjects()
    -> optional Note per l'analisi
  -> Analizza(primary + optional secondaries + optional userContext)
    -> DashboardPage.handleAnalyze()
      -> preload bridge agentStart()
        -> ipc-handlers
          -> optional Codex CLI preflight
          -> resolve session bug + registered project(s) + settings
          -> trim / truncate optional userContext
          -> checkMcpHealth()
          -> buildMcpReposPrompt() or buildMcpPrompt() or buildAnalyzePrompt()
            -> optional fenced ## Note utente block
          -> createRunner()
          -> SessionManager.start()
            -> Claude / Codex / Copilot SDK runner
              -> local filesystem tools or Azure DevOps MCP repo tools, depending on codeSource
              -> optional secondary repo reads
              -> AGENT_CHUNK / AGENT_COMPLETED / AGENT_ERROR
              -> running snapshot persisted

Dashboard Sessioni tab
  -> SessionWorkspace
    -> useAgentSessions()
      -> agent:list-sessions
      -> agent:get-session(id)
      -> AGENT_CHUNK / AGENT_COMPLETED / AGENT_ERROR / AGENT_SESSION_UPDATED
        -> SessionListPanel
        -> SessionDetailPanel
```

## Runtime Guarantees

- Up to `settings.maxConcurrentSessions` sessions can run at the same time in FT-14E.
- FT-14F blocks launch proactively when projects are missing, agent sessions are explicitly disabled, Codex manual auth is incomplete, or Copilot BYOK configuration is incomplete.
- Recent sessions survive app restarts through persisted `agentSessions`; restored `running` sessions are marked `aborted` instead of being resumed.
- Session start computes one MCP availability decision and reuses it for the prompt, runner params, and renderer badge.
- MCP unavailability is non-fatal only in `local` mode; FT-14G `mcp-repos` mode blocks `analyze` because MCP is the selected code transport.
- Codex auto/manual paths still run a real CLI preflight inside `agent:start`, so missing `codex` cannot slip past renderer gating.
- Single-project registries bypass FT-14D suggestion IPC and go straight to `agent:start`.
- Secondary projects stay optional and are rendered into the prompt only when at least one survives validation or registry resolution for the selected code source.
- min-09 notes stay optional and ephemeral: AnalyzeStartPanel resets them on bug changes, blank values are dropped, and the main process caps the payload at 2000 characters.
- The same `## Note utente` block is injected into every prompt variant, so code source and MCP availability do not change how operator context is framed.
- Local mode still treats the primary project path as a hard guard, while MCP-repos mode no longer requires local checkout paths at all.
- Reads coming from secondary repositories are visibly tagged in the live session log.
- The UI auto-switches to the `Sessioni` tab immediately after `Analizza` starts.
- The `Sessioni` tab shows a numeric badge with the running-session count rather than a single binary in-progress indicator.
- Abort is first-class and transitions the session to `aborted` without pretending the run completed successfully.
- Final reports are rendered as Markdown tables/lists, not plain preformatted text, and the workspace exposes direct copy/save/open actions.
- Claude without an explicit agent API key is treated as a supported local-auth path and surfaces only an informational hint, not a blocker.
- Settings exposes a dedicated Copilot connection diagnostic: subscription mode returns immediate config-ready success, while BYOK mode probes the selected provider with provider-specific request wiring.

## Main Components

- [[wiki/entities/agent-provider-section]]
- [[wiki/entities/agent-availability]]
- [[wiki/entities/project-registry]]
- [[wiki/entities/project-matcher]]
- [[wiki/entities/mcp-health-check]]
- [[wiki/entities/mcp-config-writer]]
- [[wiki/entities/agent-prompt-builder]]
- [[wiki/entities/agent-runner-factory]]
- [[wiki/entities/agent-session-manager]]
- [[wiki/entities/agent-session-persistence]]
- [[wiki/entities/use-agent-sessions-hook]]
- [[wiki/entities/session-workspace]]
- [[wiki/entities/session-list-panel]]
- [[wiki/entities/session-detail-panel]]
- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/analyze-start-panel]]
- [[wiki/entities/dashboard-page]]

## See also

- [[wiki/topics/agent-session-configuration-foundation]]
- [[wiki/topics/dashboard-bug-exploration]]
- [[wiki/topics/agent-session-workspace]]
- [[wiki/topics/cross-repo-agent-analysis]]
- [[wiki/topics/mcp-backed-agent-analysis]]
- [[wiki/concepts/code-source-selection-for-agent-analysis]]
- [[wiki/concepts/bounded-concurrent-agent-session-lifecycle]]
- [[wiki/concepts/streaming-agent-session-ipc]]
- [[wiki/concepts/cross-repo-project-suggestion-heuristics]]
- [[wiki/concepts/read-only-agent-analysis-sandboxing]]
- [[wiki/concepts/mcp-capability-probe-and-fallback]]
- [[wiki/concepts/proactive-agent-configuration-blocking]]
