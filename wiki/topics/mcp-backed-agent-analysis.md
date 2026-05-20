---
title: 'MCP-Backed Agent Analysis'
type: topic
created: 2026-05-20
updated: 2026-05-20
sources:
  [
    '[[wiki/sources/ft-14b-agent-sessions]]',
    '[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]'
  ]
tags: [agent, mcp, azure-devops, dashboard, fallback]
lang: en
---

## Overview

FT-14C extends the general agent-session flow with a session-start decision about bug context acquisition. When the Azure DevOps MCP server is usable, the agent receives a short prompt and fetches live bug details through MCP tools. When it is not, BugCat falls back to the FT-14B prompt that embeds the bug data directly.

## End-to-End Flow

```text
BugDetailDrawer
  -> DashboardPage.handleAnalyze()
    -> useAgentSession.startSession()
      -> preload bridge agentStart()
        -> ipc-handlers
          -> resolve bug + project + settings
          -> checkMcpHealth()
          -> if available:
               -> writeMcpConfig() for Claude/Codex
               -> buildMcpPrompt()
             else:
               -> buildAnalyzePrompt()
          -> SessionManager.start(..., mcpAvailable)
          -> AGENT_MCP_STATUS
            -> useAgentSession
              -> SessionsPanel header badge
```

## Runtime Outcomes

- **MCP available**: runner receives MCP access, the prompt refers to bug ID plus MCP fetch instructions, and the session header shows `MCP`.
- **Fallback**: runner starts without MCP-specific access, the prompt embeds the full bug payload, and the session header shows `Fallback` with the reason in a tooltip.
- **No session**: the Dashboard keeps the normal empty sessions state and does not show a status badge.

## Main Components

- [[wiki/entities/mcp-health-check]]
- [[wiki/entities/mcp-config-writer]]
- [[wiki/entities/agent-prompt-builder]]
- [[wiki/entities/claude-sdk-runner]]
- [[wiki/entities/codex-sdk-runner]]
- [[wiki/entities/copilot-sdk-runner]]
- [[wiki/entities/use-agent-session-hook]]
- [[wiki/entities/sessions-panel]]

## See also

- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/concepts/mcp-capability-probe-and-fallback]]
- [[wiki/concepts/read-only-agent-analysis-sandboxing]]
