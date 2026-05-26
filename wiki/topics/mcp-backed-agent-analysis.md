---
title: 'MCP-Backed Agent Analysis'
type: topic
created: 2026-05-20
updated: 2026-05-26
sources:
  [
    '[[wiki/sources/ft-14b-agent-sessions]]',
    '[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]',
    '[[wiki/sources/ft-14d-cross-repo-project-suggestions]]',
    '[[wiki/sources/ft-14e-multi-session-agent-workspace]]'
  ]
tags: [agent, mcp, azure-devops, dashboard, fallback]
lang: en
---

## Overview

FT-14C extends the general agent-session flow with a session-start decision about bug context acquisition. When the Azure DevOps MCP server is usable, the agent receives a short prompt and fetches live bug details through MCP tools. When it is not, BugCat falls back to the FT-14B prompt that embeds the bug data directly. FT-14D keeps that same branch, but both prompt variants can now carry optional secondary repositories as read-only context. FT-14E preserves the same MCP decision, but surfaces it inside the session workspace summary model so operators can scan MCP usage across multiple retained sessions. min-09 adds one more shared branch invariant: optional operator notes are injected into both prompt variants with the same fenced background-only framing.

## End-to-End Flow

```text
BugDetailDrawer
  -> DashboardPage.handleAnalyze()
    -> preload bridge agentStart()
      -> ipc-handlers
        -> resolve bug + project + settings
        -> checkMcpHealth()
        -> normalize optional userContext
        -> if available:
             -> writeMcpConfig() for Claude/Codex
             -> buildMcpPrompt()
           else:
             -> buildAnalyzePrompt()
        -> SessionManager.start(..., mcpAvailable)
        -> sessionMcpStatus map

SessionWorkspace
  -> agent:list-sessions
    -> AgentSessionSummary.mcpStatus
      -> SessionListPanel summary badge
```

## Runtime Outcomes

- **MCP available**: runner receives MCP access, the prompt refers to bug ID plus MCP fetch instructions, and the FT-14E session list shows `MCP`.
- **Fallback**: runner starts without MCP-specific access, the prompt embeds the full bug payload, and the summary model retains the fallback reason even though the workspace currently emphasizes the positive `MCP` badge more than the negative path.
- **Cross-repo context**: when FT-14D selects valid secondary projects, either prompt variant appends the same read-only `Secondary Projects` table.
- **Operator notes**: when min-09 supplies `userContext`, either prompt variant appends the same fenced `## Note utente` block before `## Your Task`.
- **No session**: the Dashboard keeps the normal empty sessions state and does not show a status badge.

## Main Components

- [[wiki/entities/mcp-health-check]]
- [[wiki/entities/mcp-config-writer]]
- [[wiki/entities/agent-prompt-builder]]
- [[wiki/entities/project-matcher]]
- [[wiki/entities/claude-sdk-runner]]
- [[wiki/entities/codex-sdk-runner]]
- [[wiki/entities/copilot-sdk-runner]]
- [[wiki/entities/use-agent-sessions-hook]]
- [[wiki/entities/session-list-panel]]
- [[wiki/entities/session-workspace]]

## See also

- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/agent-session-workspace]]
- [[wiki/topics/cross-repo-agent-analysis]]
- [[wiki/concepts/mcp-capability-probe-and-fallback]]
- [[wiki/concepts/read-only-agent-analysis-sandboxing]]
