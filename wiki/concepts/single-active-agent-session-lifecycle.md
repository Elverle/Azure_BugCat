---
title: 'Single Active Agent Session Lifecycle'
type: concept
created: 2026-05-18
updated: 2026-05-21
sources:
	['[[wiki/sources/ft-14b-agent-sessions]]', '[[wiki/sources/ft-14d-cross-repo-project-suggestions]]']
tags: [agent, session, lifecycle, abort, main-process, legacy, superseded]
lang: en
---

## Overview

Historical FT-14B lifecycle concept. It described the original single-active-session model before FT-14E replaced it with bounded concurrency; the page remains only to document the earlier design trade-off.

## Historical Rules

- At most one session can be `running`.
- A finished `completed`, `aborted`, or `error` session is auto-cleared the next time a new session starts.
- `abort()` only succeeds when both the session ID matches and the current status is still `running`.
- The live session snapshot keeps the selected primary project plus optional `secondaryProjectIds` so reconnect behavior stays deterministic.
- Provider callbacks are accepted only if they still belong to the active session ID.
- Secondary-repository provenance is attached at chunk-ingest time, not reconstructed later from stored prompt text.
- Stored chunks are capped at 500 entries, evicting the oldest first.

## Why This Shape Existed

- The main process remains the single source of truth for the live agent run.
- Renderer remounts can reconnect cheaply through `agent:get-session` without reconstructing provider state.
- Abort semantics stay uniform across Claude, Codex, and Copilot even though each SDK exposes different cleanup surfaces.
- Memory growth from long streams stays bounded without needing persistent log storage yet.

## Superseded By

- [[wiki/concepts/bounded-concurrent-agent-session-lifecycle]]

## See also

- [[wiki/entities/agent-session-manager]]
- [[wiki/entities/use-agent-session-hook]]
- [[wiki/topics/cross-repo-agent-analysis]]
- [[wiki/topics/agent-analysis-sessions]]
