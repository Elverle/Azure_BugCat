---
title: 'Agent Availability Helper'
type: entity
subtype: library
created: 2026-05-26
updated: 2026-05-26
sources: ['[[wiki/sources/ft-14f-provider-auth-parity-analysis]]']
tags: [typescript, library, agent, dashboard, settings, validation]
lang: en
---

## Description

Pure renderer-side helper that converts persisted `AppSettings` into one blocking availability result plus one optional non-blocking hint for FT-14 analysis launches. It lets Dashboard launch surfaces decide whether analysis should be disabled before invoking any IPC.

## Location

`src/renderer/src/lib/agent-availability.ts`

## Public API

```typescript
export type AgentAvailabilityResult = { available: true } | { available: false; reason: string }

export function checkAgentAvailability(settings: AppSettings): AgentAvailabilityResult
export function getAgentAvailabilityHint(settings: AppSettings): string | null
```

## Decision Rules

- Blocks all providers when no FT-14A projects are configured.
- Treats `llmProvider === 'anthropic'` and `llmProvider === 'openai'` as always available, because FT-14A auto-derives Claude/Codex from the main LLM configuration.
- Blocks explicit `agentProvider === 'none'` with a human-readable Settings action message.
- Blocks manual `codex-sdk` when `agentApiKey` is blank.
- Blocks `copilot-sdk` only when BYOK mode is enabled and either `copilotByokProvider` or `copilotByokApiKey` is missing.
- Returns a non-blocking Claude hint when manual `claude-sdk` is selected without `agentApiKey`, reminding the operator that local Claude Code auth must exist.

## Consumers

- [[wiki/entities/dashboard-page]] computes the helper output once from persisted settings and stores both results in page-local state.
- [[wiki/entities/analyze-start-panel]] renders the blocking reason as an amber banner and shows the optional hint under the launch button.
- [[wiki/entities/bug-detail-drawer]] and [[wiki/entities/session-workspace]] receive the same result through prop passthrough so both launch surfaces stay aligned.

## Why It Exists

- It keeps configuration gating deterministic and unit-testable outside React components.
- It prevents avoidable `agent:start` failures from surfacing only after the user clicks `Analizza`.
- It distinguishes hard blockers from operator guidance, which matters for Claude's local-auth path.

## See also

- [[wiki/entities/analyze-start-panel]]
- [[wiki/entities/dashboard-page]]
- [[wiki/concepts/proactive-agent-configuration-blocking]]
- [[wiki/topics/agent-analysis-sessions]]
