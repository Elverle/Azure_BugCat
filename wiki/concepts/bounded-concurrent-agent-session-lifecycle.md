---
title: 'Bounded Concurrent Agent Session Lifecycle'
type: concept
created: 2026-05-21
updated: 2026-05-21
sources: ['[[wiki/sources/ft-14e-multi-session-agent-workspace]]']
tags: [agent, session, lifecycle, concurrency, recovery, main-process]
lang: en
---

## Overview

FT-14E replaces the original FT-14B single-slot session model with a bounded concurrent lifecycle. The main process now manages a `Map<string, AgentSession>` plus per-session abort controllers, supports multiple simultaneous runs, persists snapshots for crash recovery, and exposes list-friendly summaries separately from full session detail.

## Rules

- At most `settings.maxConcurrentSessions` sessions can be `running` at the same time.
- Every session has a stable UUID and remains addressable after it reaches `completed`, `aborted`, or `error`.
- `agent:start` persists the newly created `running` snapshot immediately.
- `agent:abort` transitions only the targeted `running` session and leaves unrelated sessions untouched.
- Recent sessions are restored on boot from `agentSessions`, but restored `running` sessions are converted to `aborted` because execution cannot resume safely.
- In-memory chunk retention is capped at 500 per session; persisted retention is capped at 200.
- Summary views consume `AgentSessionSummary`, while full `AgentSession` detail is fetched only when needed.

## Why This Shape

- Operators can compare multiple recent analyses without overwriting the previous run every time a new session starts.
- Crash recovery now preserves enough evidence to inspect partial work and final reports from the previous app instance.
- Summary/detail separation keeps the sessions tab cheap to render even when several sessions have long logs.
- Bounded concurrency preserves the FT-14A configuration contract and prevents unbounded SDK process fan-out.

## See also

- [[wiki/entities/agent-session-manager]]
- [[wiki/entities/agent-session-persistence]]
- [[wiki/entities/use-agent-sessions-hook]]
- [[wiki/topics/agent-session-workspace]]
- [[wiki/topics/agent-analysis-sessions]]
