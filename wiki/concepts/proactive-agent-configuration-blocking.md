---
title: 'Proactive Agent Configuration Blocking'
type: concept
created: 2026-05-26
updated: 2026-05-26
sources: ['[[wiki/sources/ft-14f-provider-auth-parity-analysis]]']
tags: [agent, validation, ux, settings, ipc, resilience]
lang: en
---

## Overview

FT-14F introduces a two-layer startup guard for agent analysis. The renderer performs a pure pre-click availability check and shows readable blocking copy directly in the launch surface, while the main process still enforces privileged preflight checks before any runner is created.

## Decision Split

1. [[wiki/entities/dashboard-page]] loads persisted settings and computes `checkAgentAvailability()` plus `getAgentAvailabilityHint()` through [[wiki/entities/agent-availability]].
2. [[wiki/entities/analyze-start-panel]] blocks the launch UI immediately when the result is unavailable, instead of waiting for `agent:start` to fail.
3. [[wiki/entities/agent-provider-section]] exposes provider-specific diagnostic actions in Settings, including `Verifica connessione Copilot`.
4. [[wiki/entities/ipc-handlers]] still enforces privileged checks during `agent:start`, most notably the Codex CLI preflight and Copilot BYOK validation.

## Why This Pattern Matters

- It moves obvious configuration failures closer to the operator action that can fix them.
- It keeps trust boundaries intact: the renderer improves UX, but the main process remains authoritative.
- It separates **blocking** states from **informational** states, which allows Claude's local-auth setup to stay supported without a false negative.
- It gives Copilot two different diagnostics: a cheap configuration-ready success for subscription mode and a real API reachability probe for BYOK mode.

## Trade-Offs

- Renderer availability is derived from persisted settings, so unsaved edits only participate in the explicit Copilot test flow, not in Dashboard launch gating.
- The helper intentionally checks only configuration shape, not external runtime dependencies beyond what can be inferred locally.
- Some failures remain deferred to session start, such as downstream SDK/runtime errors after a successful availability check.

## See also

- [[wiki/entities/agent-availability]]
- [[wiki/entities/agent-provider-section]]
- [[wiki/entities/analyze-start-panel]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/agent-session-configuration-foundation]]
