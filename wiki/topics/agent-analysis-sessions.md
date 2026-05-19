---
title: 'Agent Analysis Sessions'
type: topic
created: 2026-05-18
updated: 2026-05-18
sources:
  [
    '[[wiki/sources/ft-14a-agent-configuration-project-registry]]',
    '[[wiki/sources/ft-14b-agent-sessions]]'
  ]
tags: [agent, dashboard, ipc, sessions, analysis]
lang: en
---

## Overview

FT-14B realizes the FT-14A settings foundation as a live operator workflow for bug-by-bug codebase analysis. A user picks one registered local project from the bug drawer, starts an `analyze` session, watches streamed tool/log output in the Dashboard `Sessioni` tab, and receives a final Markdown report summarizing likely root causes and next investigation steps.

## End-to-End Flow

```text
BugDetailDrawer
  -> project select + Analizza
    -> DashboardPage.handleAnalyze()
      -> useAgentSession.startSession()
        -> preload bridge agentStart()
          -> ipc-handlers
            -> resolve session bug + registered project + settings
            -> buildAnalyzePrompt()
            -> createRunner()
            -> SessionManager.start()
              -> Claude / Codex / Copilot SDK runner
                -> AGENT_CHUNK / AGENT_COMPLETED / AGENT_ERROR
                  -> useAgentSession
                    -> SessionsPanel
```

## Runtime Guarantees

- Only one session can run at a time in FT-14B.
- The live session survives renderer remounts and tab switches through `agent:get-session` reconnect.
- The UI auto-switches to the `Sessioni` tab immediately after `Analizza` starts.
- Abort is first-class and transitions the session to `aborted` without pretending the run completed successfully.
- Final reports are rendered as Markdown tables/lists, not plain preformatted text.

## Main Components

- [[wiki/entities/agent-provider-section]]
- [[wiki/entities/project-registry]]
- [[wiki/entities/agent-prompt-builder]]
- [[wiki/entities/agent-runner-factory]]
- [[wiki/entities/agent-session-manager]]
- [[wiki/entities/use-agent-session-hook]]
- [[wiki/entities/sessions-panel]]
- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/dashboard-page]]

## See also

- [[wiki/topics/agent-session-configuration-foundation]]
- [[wiki/topics/dashboard-bug-exploration]]
- [[wiki/concepts/single-active-agent-session-lifecycle]]
- [[wiki/concepts/streaming-agent-session-ipc]]
- [[wiki/concepts/read-only-agent-analysis-sandboxing]]
