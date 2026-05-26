---
title: 'Streaming Agent Session IPC'
type: concept
created: 2026-05-18
updated: 2026-05-26
sources:
  [
    '[[wiki/sources/ft-14b-agent-sessions]]',
    '[[wiki/sources/ft-14d-cross-repo-project-suggestions]]',
    '[[wiki/sources/ft-14e-multi-session-agent-workspace]]'
  ]
tags: [electron, ipc, agent, streaming, reconnect]
lang: en
---

## Overview

Agent analysis uses a hybrid IPC pattern: imperative session commands go through `invoke`, while long-running agent output is pushed as streamed events. This lets the renderer start or abort work synchronously but keep the ongoing log/report flow decoupled from the initiating component instance.

## Channel Shape

- Command channels: `agent:suggest-projects`, `agent:start`, `agent:abort`, `agent:get-session`, `agent:list-sessions`, `agent:save-report`
- Event channels: `agent:chunk`, `agent:completed`, `agent:error`, `agent:session-updated`

## Flow

```text
AnalyzeStartPanel / DashboardPage
  -> preload bridge invoke('agent:suggest-projects')
    -> ipc-handlers resolve bug/session/settings for FT-14D preflight
  -> DashboardPage.handleAnalyze() or SessionWorkspace.startSession()
    -> preload bridge invoke('agent:start')
      -> ipc-handlers resolve bug/project/settings and normalize optional userContext
        -> SessionManager + concrete runner
          -> runner emits normalized AgentChunk values
            -> BrowserWindow sender.send('agent:chunk' | 'agent:completed' | 'agent:error' | 'agent:session-updated')
              -> preload event subscriptions
                -> useAgentSessions updates list/detail state
                  -> SessionListPanel / SessionDetailPanel
```

## Benefits

- Reconnect-on-mount is possible because session state sits behind `agent:get-session` and `agent:list-sessions` in the main process.
- FT-14D keeps recommendation RPC separate from the long-lived chunk stream, so preflight UI state can change without coupling to session streaming.
- min-09 extends the same command path with optional operator notes while keeping normalization privileged: renderer launchers capture free text, but `agent:start` owns trimming, truncation, and prompt-safe placement.
- The renderer receives provider-agnostic `AgentChunk` payloads instead of SDK-native event types.
- Structured error codes survive the IPC boundary and stay meaningful in the UI.
- FT-14E can update summaries without polling because terminal transitions emit `agent:session-updated` separately from the full chunk stream.

## See also

- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/use-agent-sessions-hook]]
- [[wiki/entities/analyze-start-panel]]
- [[wiki/entities/session-workspace]]
