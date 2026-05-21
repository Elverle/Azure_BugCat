---
title: 'Cross-Repo Agent Analysis'
type: topic
created: 2026-05-20
updated: 2026-05-20
sources:
  [
    '[[wiki/sources/ft-14a-agent-configuration-project-registry]]',
    '[[wiki/sources/ft-14b-agent-sessions]]',
    '[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]',
    '[[wiki/sources/ft-14d-cross-repo-project-suggestions]]'
  ]
tags: [agent, cross-repo, dashboard, projects, prompt]
lang: en
---

## Overview

FT-14D extends the base agent-session workflow so one bug analysis can span multiple registered repositories without turning the session into a write-capable multi-repo operation. One project remains the primary execution root, while optional secondary repositories are attached as read-only context for code search and root-cause discovery.

## End-to-End Flow

```text
BugDetailDrawer
  -> AnalyzeStartPanel mount
    -> preload bridge agentSuggestProjects({ bugId })
      -> ipc-handlers
        -> selectPrimaryProject()
        -> suggestSecondaryProjects()
  -> operator may override primary / toggle secondaries
    -> DashboardPage.handleAnalyze(bugId, primaryProjectId, secondaryProjectIds)
      -> preload bridge agentStart()
        -> ipc-handlers validate IDs + resolve existing directories
          -> buildAnalyzePrompt() or buildMcpPrompt()
            -> SessionManager.start()
              -> runner reads primary path + optional secondary paths
              -> secondary tool results are tagged in the session log
```

## Runtime Guarantees

- The primary repository remains the only execution root; secondaries are contextual inputs.
- The UI never calls the suggestion IPC when exactly one project is registered.
- The `Secondary Projects` prompt section is emitted only when at least one valid secondary repository survives resolution.
- Both main and renderer keep the session chunk history capped at 500 entries.
- Tool results that mention a secondary path are prefixed with `[secondary:{name}]` so operators can tell which repository produced a read.

## Main Components

- [[wiki/entities/project-registry]]
- [[wiki/entities/project-matcher]]
- [[wiki/entities/analyze-start-panel]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/agent-prompt-builder]]
- [[wiki/entities/agent-session-manager]]
- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/dashboard-page]]

## See also

- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/mcp-backed-agent-analysis]]
- [[wiki/concepts/cross-repo-project-suggestion-heuristics]]
- [[wiki/concepts/streaming-agent-session-ipc]]
