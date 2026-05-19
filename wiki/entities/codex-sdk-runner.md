---
title: 'Codex SDK Runner'
type: entity
subtype: service
created: 2026-05-18
updated: 2026-05-18
sources: ['[[wiki/sources/ft-14b-agent-sessions]]']
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
- Streams events via `thread.runStreamed(prompt)` and accumulates a text report.

## Event Mapping

- Message/text/response-like events -> `text` chunks
- Tool/command/exec-like events -> `tool_use` chunks with serialized event payloads
- Completed/done/finish-like events -> final report replacement when the SDK exposes one

## Notes

- FT-14B uses lightweight event-type substring matching rather than a deeper discriminated-union adapter, so this runner is somewhat more heuristic than the Claude implementation.
- `supportsFixMode` and `supportsMcp` remain `false`.

## Dependencies

- [[wiki/entities/agent-session-manager]]
- [[wiki/concepts/read-only-agent-analysis-sandboxing]]

## See also

- [[wiki/entities/agent-runner-factory]]
- [[wiki/topics/agent-analysis-sessions]]
