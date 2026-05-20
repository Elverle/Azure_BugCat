---
title: 'Claude SDK Runner'
type: entity
subtype: service
created: 2026-05-18
updated: 2026-05-20
sources:
	[
		'[[wiki/sources/ft-14b-agent-sessions]]',
		'[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]'
	]
tags: [agent, claude, sdk, streaming, security]
lang: en
---

## Description

Anthropic-backed FT-14B runner implemented with `@anthropic-ai/claude-agent-sdk`. It is the most constrained of the current runners and is designed specifically for read-only codebase analysis.

## Location

`src/main/agent/runners/claude-sdk-runner.ts`

## Runtime Behavior

- Calls `query()` with `cwd = primaryPath`.
- Restricts `allowedTools` to `Read`, `Glob`, and `Grep`, and adds `mcp__azure-devops` only when FT-14C marks MCP as available.
- Uses `maxTurns ?? 50` and forwards an optional model override.
- Injects `ANTHROPIC_API_KEY` only when a key is explicitly available; otherwise Claude Code local auth/config can satisfy the SDK.
- Injects `PERSONAL_ACCESS_TOKEN` only for MCP-enabled runs, using the base64 `:PAT` form expected by the Azure DevOps MCP runtime.
- Creates a linked `AbortController` because the SDK expects a controller object rather than a bare `AbortSignal`.

## Event Mapping

- `system/init` -> `status` chunk announcing session start
- `assistant.message.content[].text` -> `text` chunk
- `assistant.message.content[].tool_use` -> `tool_use` chunk with tool name and serialized input
- `user.tool_use_result` -> `tool_result` chunk
- `result` -> final report plus `Analisi completata` status chunk

## Implementation Notes

- The SDK response wrapper is nested under `msg.message.content`, not `msg.content`.
- `supportsFixMode` remains `false`, but FT-14C sets `supportsMcp = true`.
- `.mcp.json` preparation happens before the runner starts; the runner only consumes the resulting project context and env.

## Dependencies

- [[wiki/entities/agent-session-manager]]
- [[wiki/concepts/read-only-agent-analysis-sandboxing]]
- [[wiki/entities/mcp-config-writer]]

## See also

- [[wiki/entities/agent-runner-factory]]
- [[wiki/topics/mcp-backed-agent-analysis]]
- [[wiki/topics/agent-analysis-sessions]]
