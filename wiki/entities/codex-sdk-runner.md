---
title: 'Codex SDK Runner'
type: entity
subtype: service
created: 2026-05-18
updated: 2026-05-20
sources:
	[
		'[[wiki/sources/ft-14b-agent-sessions]]',
		'[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]'
	]
tags: [agent, codex, sdk, sandbox, streaming]
lang: en
---

## Description

OpenAI-backed FT-14B runner implemented with `@openai/codex-sdk`. It executes in Codex's read-only sandbox and converts Codex event streams into the shared `AgentChunk` model.

## Location

`src/main/agent/runners/codex-sdk-runner.ts`

## Runtime Behavior

- Creates a `Codex` client with the resolved API key.
- Starts a thread with `sandboxMode: 'read-only'`, `workingDirectory = primaryPath`, and `skipGitRepoCheck: true`.
- Uses `params.model ?? 'codex-mini-latest'` as the runtime model.
- When FT-14C enables MCP, temporarily sets `process.env.PERSONAL_ACCESS_TOKEN` so the subprocess can authenticate against Azure DevOps MCP.
- Streams events via `thread.runStreamed(prompt)` and accumulates a text report.

## Event Mapping

- Message/text/response-like events -> `text` chunks
- Tool/command/exec-like events -> `tool_use` chunks with serialized event payloads
- Completed/done/finish-like events -> final report replacement when the SDK exposes one

## Notes

- FT-14B uses lightweight event-type substring matching rather than a deeper discriminated-union adapter, so this runner is somewhat more heuristic than the Claude implementation.
- FT-14C relies on Codex discovering project-local `.mcp.json` from `workingDirectory` rather than passing a separate config object.
- The runner snapshots any previous `PERSONAL_ACCESS_TOKEN` value and restores it in `finally` so MCP auth does not leak across runs.
- `supportsFixMode` remains `false`, but `supportsMcp` is now `true`.

## Dependencies

- [[wiki/entities/agent-session-manager]]
- [[wiki/concepts/read-only-agent-analysis-sandboxing]]
- [[wiki/entities/mcp-config-writer]]

## See also

- [[wiki/entities/agent-runner-factory]]
- [[wiki/topics/mcp-backed-agent-analysis]]
- [[wiki/topics/agent-analysis-sessions]]
