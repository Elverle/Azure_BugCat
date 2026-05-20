---
title: 'Streaming Agent Session IPC'
type: concept
created: 2026-05-18
updated: 2026-05-20
sources:
  [
    '[[wiki/sources/ft-14b-agent-sessions]]',
    '[[wiki/sources/ft-14d-cross-repo-project-suggestions]]'
  ]
tags: [electron, ipc, agent, streaming, reconnect]
lang: en
---

## Overview

FT-14B uses a hybrid IPC pattern: imperative session commands go through `invoke`, while long-running agent output is pushed as streamed events. This lets the renderer start or abort work synchronously but keep the ongoing log/report flow decoupled from the initiating component instance.

## Channel Shape

- Command channels: `agent:suggest-projects`, `agent:start`, `agent:abort`, `agent:get-session`
- Event channels: `agent:chunk`, `agent:completed`, `agent:error`

## Flow

```text
AnalyzeStartPanel / DashboardPage
  -> preload bridge invoke('agent:suggest-projects')
    -> ipc-handlers resolve bug/session/settings for FT-14D preflight
  -> useAgentSession.startSession()
    -> preload bridge invoke('agent:start')
      -> ipc-handlers resolve bug/project/settings
        -> SessionManager + concrete runner
          -> runner emits normalized AgentChunk values
            -> BrowserWindow sender.send('agent:chunk' | 'agent:completed' | 'agent:error')
              -> preload event subscriptions
                -> useAgentSession updates
                  -> SessionsPanel
```

## Benefits

- Reconnect-on-mount is possible because the live session state sits behind `agent:get-session` in the main process.
- FT-14D keeps recommendation RPC separate from the long-lived chunk stream, so preflight UI state can change without coupling to session streaming.
- The renderer receives provider-agnostic `AgentChunk` payloads instead of SDK-native event types.
- Structured error codes survive the IPC boundary and stay meaningful in the UI.

## See also

- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/use-agent-session-hook]]
- [[wiki/entities/analyze-start-panel]]
- [[wiki/entities/sessions-panel]]
