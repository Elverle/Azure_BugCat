---
title: 'Single Active Agent Session Lifecycle'
type: concept
created: 2026-05-18
updated: 2026-05-18
sources: ['[[wiki/sources/ft-14b-agent-sessions]]']
tags: [agent, session, lifecycle, abort, main-process]
lang: en
---

## Overview

FT-14B intentionally models agent execution as a single active main-process session rather than a renderer-owned queue or a multi-session pool. This keeps abort, reconnect, and provider cleanup logic centralized while the product is still limited to one operator-visible analysis at a time.

## Rules

- At most one session can be `running`.
- A finished `completed`, `aborted`, or `error` session is auto-cleared the next time a new session starts.
- `abort()` only succeeds when both the session ID matches and the current status is still `running`.
- Provider callbacks are accepted only if they still belong to the active session ID.
- Stored chunks are capped at 500 entries, evicting the oldest first.

## Why This Shape

- The main process remains the single source of truth for the live agent run.
- Renderer remounts can reconnect cheaply through `agent:get-session` without reconstructing provider state.
- Abort semantics stay uniform across Claude, Codex, and Copilot even though each SDK exposes different cleanup surfaces.
- Memory growth from long streams stays bounded without needing persistent log storage yet.

## See also

- [[wiki/entities/agent-session-manager]]
- [[wiki/entities/use-agent-session-hook]]
- [[wiki/topics/agent-analysis-sessions]]
