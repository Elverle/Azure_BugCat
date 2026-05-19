---
title: 'Claude SDK Runner'
type: entity
subtype: service
created: 2026-05-18
updated: 2026-05-18
sources: ['[[wiki/sources/ft-14b-agent-sessions]]']
tags: [agent, claude, sdk, streaming, security]
lang: en
---

## Description

Anthropic-backed FT-14B runner implemented with `@anthropic-ai/claude-agent-sdk`. It is the most constrained of the current runners and is designed specifically for read-only codebase analysis.

## Location

`src/main/agent/runners/claude-sdk-runner.ts`

## Runtime Behavior

- Calls `query()` with `cwd = primaryPath`.
- Restricts `allowedTools` to `Read`, `Glob`, and `Grep`.
- Uses `maxTurns ?? 50` and forwards an optional model override.
- Injects `ANTHROPIC_API_KEY` only when a key is explicitly available; otherwise Claude Code local auth/config can satisfy the SDK.
- Creates a linked `AbortController` because the SDK expects a controller object rather than a bare `AbortSignal`.

## Event Mapping

- `system/init` -> `status` chunk announcing session start
- `assistant.message.content[].text` -> `text` chunk
- `assistant.message.content[].tool_use` -> `tool_use` chunk with tool name and serialized input
- `user.tool_use_result` -> `tool_result` chunk
- `result` -> final report plus `Analisi completata` status chunk

## Implementation Notes

- The SDK response wrapper is nested under `msg.message.content`, not `msg.content`.
- `supportsFixMode` and `supportsMcp` are both `false` in FT-14B.

## Dependencies

- [[wiki/entities/agent-session-manager]]
- [[wiki/concepts/read-only-agent-analysis-sandboxing]]

## See also

- [[wiki/entities/agent-runner-factory]]
- [[wiki/topics/agent-analysis-sessions]]
