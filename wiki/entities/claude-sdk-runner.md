---
title: 'Claude SDK Runner'
type: entity
subtype: service
created: 2026-05-18
updated: 2026-05-26
sources:
	[
		'[[wiki/sources/ft-14b-agent-sessions]]',
		'[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]',
		'[[wiki/sources/ft-14g-code-source-selection-mcp-repos-vs-local-filesystem]]'
	]
tags: [agent, claude, sdk, streaming, security]
lang: en
---

## Description

Anthropic-backed FT-14B runner implemented with `@anthropic-ai/claude-agent-sdk`. It remains the most constrained of the current runners and is now the clearest example of FT-14G's code-source routing, because its allowed tool list changes deterministically between local-filesystem and MCP-repo analysis modes.

## Location

`src/main/agent/runners/claude-sdk-runner.ts`

## Runtime Behavior

- Calls `query()` with `cwd = primaryPath`.
- Restricts `allowedTools` to `Read`, `Glob`, and `Grep` in pure local mode.
- Adds `mcp__azure-devops` alongside the local read tools when FT-14C marks MCP as available and `codeSource === 'local'`.
- Uses only `mcp__azure-devops` when `codeSource === 'mcp-repos'`, which removes accidental fallback to local filesystem reads.
- Uses `maxTurns ?? 50` and forwards an optional model override.
- Injects `ANTHROPIC_API_KEY` only when a key is explicitly available; otherwise Claude Code local auth/config can satisfy the SDK.
- Injects `PERSONAL_ACCESS_TOKEN` only for MCP-enabled runs, using the base64 `:PAT` form expected by the Azure DevOps MCP runtime.
- Creates a linked `AbortController` because the SDK expects a controller object rather than a bare `AbortSignal`.
- In FT-14G MCP-repos mode the `cwd` may be a temp directory used only for runner startup and `.mcp.json` discovery, not the actual project checkout.

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
- FT-14G keeps prompt content and tool permissions in sync by accepting `RunParams.codeSource` from the main process.

## Dependencies

- [[wiki/entities/agent-session-manager]]
- [[wiki/concepts/read-only-agent-analysis-sandboxing]]
- [[wiki/entities/mcp-config-writer]]

## See also

- [[wiki/entities/agent-runner-factory]]
- [[wiki/topics/mcp-backed-agent-analysis]]
- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/concepts/code-source-selection-for-agent-analysis]]
