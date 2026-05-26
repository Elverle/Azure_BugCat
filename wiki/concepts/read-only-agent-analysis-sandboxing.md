---
title: 'Read-Only Agent Analysis Sandboxing'
type: concept
created: 2026-05-18
updated: 2026-05-26
sources:
	[
		'[[wiki/sources/ft-14b-agent-sessions]]',
		'[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]',
		'[[wiki/sources/ft-14g-code-source-selection-mcp-repos-vs-local-filesystem]]'
	]
tags: [agent, security, sandbox, claude, codex, copilot]
lang: en
---

## Overview

FT-14B is intentionally limited to code analysis, not code modification. The feature allows agents to inspect one selected local project and stream findings back to the operator, but it does not expose a first-class fix workflow yet.

## Provider Constraints

- Claude SDK runner whitelists `Read`, `Glob`, and `Grep` in local mode, adds `mcp__azure-devops` when FT-14C has already validated MCP availability, and switches to only `mcp__azure-devops` in FT-14G `mcp-repos` mode.
- Codex runner uses `sandboxMode: 'read-only'`.
- Copilot runner rejects `shell` and `write` permission requests explicitly and can receive Azure DevOps MCP only as a session-scoped config object.
- The IPC handler rejects any `SessionMode` other than `analyze`.
- The prompt builder still scopes analysis to one primary project. FT-14G adds a third route where both bug context and code navigation happen through MCP repo tools, with no local filesystem prompt instructions.

## Security Implications

- Renderer code never talks to SDK clients directly; all execution remains in the main process.
- The selected project path comes from the persisted FT-14A project registry rather than arbitrary free-form runtime input.
- Azure DevOps MCP expands the data sources the agent can read, but it does not grant local shell or write capabilities.
- FT-14G `mcp-repos` mode further reduces local-surface exposure by removing Claude's local read tools instead of keeping them available as an implicit fallback.
- FT-14B reduces the blast radius of early agent integration while leaving stronger policy enforcement to future work.

## Known Gap

Full hardening of all providers, especially Copilot permission handling, is explicitly deferred to FT-14H.

## See also

- [[wiki/concepts/ipc-security-model]]
- [[wiki/entities/claude-sdk-runner]]
- [[wiki/entities/codex-sdk-runner]]
- [[wiki/entities/copilot-sdk-runner]]
- [[wiki/concepts/code-source-selection-for-agent-analysis]]
- [[wiki/concepts/mcp-capability-probe-and-fallback]]
- [[wiki/topics/mcp-backed-agent-analysis]]
- [[wiki/topics/agent-analysis-sessions]]
