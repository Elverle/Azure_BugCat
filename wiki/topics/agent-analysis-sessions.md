---
title: 'Agent Analysis Sessions'
type: topic
created: 2026-05-18
updated: 2026-05-20
sources:
  [
    '[[wiki/sources/ft-14a-agent-configuration-project-registry]]',
    '[[wiki/sources/ft-14b-agent-sessions]]',
    '[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]',
    '[[wiki/sources/ft-14d-cross-repo-project-suggestions]]'
  ]
tags: [agent, dashboard, ipc, sessions, analysis]
lang: en
---

## Overview

FT-14B realizes the FT-14A settings foundation as a live operator workflow for bug-by-bug codebase analysis. FT-14C extends that workflow so each session can optionally fetch live Azure DevOps work item context through MCP before reading the local codebase. FT-14D adds a smart launch preflight: BugCat can suggest the primary project, propose optional secondary repositories for read-only context, and preserve that cross-repo shape through prompts and streamed logs.

## End-to-End Flow

```text
BugDetailDrawer
  -> AnalyzeStartPanel
    -> optional agentSuggestProjects()
  -> Analizza(primary + optional secondaries)
    -> DashboardPage.handleAnalyze()
      -> useAgentSession.startSession()
        -> preload bridge agentStart()
          -> ipc-handlers
            -> resolve session bug + registered project(s) + settings
            -> checkMcpHealth()
            -> buildMcpPrompt() or buildAnalyzePrompt()
            -> createRunner()
            -> SessionManager.start()
              -> Claude / Codex / Copilot SDK runner
                -> optional Azure DevOps MCP tools
                -> optional secondary repo reads
                -> AGENT_CHUNK / AGENT_COMPLETED / AGENT_ERROR
                -> AGENT_MCP_STATUS
                  -> useAgentSession
                    -> SessionsPanel
```

## Runtime Guarantees

- Only one session can run at a time in FT-14B.
- The live session survives renderer remounts and tab switches through `agent:get-session` reconnect.
- Session start computes one MCP availability decision and reuses it for the prompt, runner params, and renderer badge.
- MCP unavailability is non-fatal: the run falls back to the original full prompt instead of blocking `analyze`.
- Single-project registries bypass FT-14D suggestion IPC and go straight to `agent:start`.
- Secondary projects stay optional and are rendered into the prompt only when at least one survives validation.
- Reads coming from secondary repositories are visibly tagged in the live session log.
- The UI auto-switches to the `Sessioni` tab immediately after `Analizza` starts.
- Abort is first-class and transitions the session to `aborted` without pretending the run completed successfully.
- Final reports are rendered as Markdown tables/lists, not plain preformatted text.

## Main Components

- [[wiki/entities/agent-provider-section]]
- [[wiki/entities/project-registry]]
- [[wiki/entities/project-matcher]]
- [[wiki/entities/mcp-health-check]]
- [[wiki/entities/mcp-config-writer]]
- [[wiki/entities/agent-prompt-builder]]
- [[wiki/entities/agent-runner-factory]]
- [[wiki/entities/agent-session-manager]]
- [[wiki/entities/use-agent-session-hook]]
- [[wiki/entities/sessions-panel]]
- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/analyze-start-panel]]
- [[wiki/entities/dashboard-page]]

## See also

- [[wiki/topics/agent-session-configuration-foundation]]
- [[wiki/topics/dashboard-bug-exploration]]
- [[wiki/topics/cross-repo-agent-analysis]]
- [[wiki/topics/mcp-backed-agent-analysis]]
- [[wiki/concepts/single-active-agent-session-lifecycle]]
- [[wiki/concepts/streaming-agent-session-ipc]]
- [[wiki/concepts/cross-repo-project-suggestion-heuristics]]
- [[wiki/concepts/read-only-agent-analysis-sandboxing]]
- [[wiki/concepts/mcp-capability-probe-and-fallback]]
