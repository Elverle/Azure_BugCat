---
title: 'Read-Only Agent Analysis Sandboxing'
type: concept
created: 2026-05-18
updated: 2026-05-18
sources: ['[[wiki/sources/ft-14b-agent-sessions]]']
tags: [agent, security, sandbox, claude, codex, copilot]
lang: en
---

## Overview

FT-14B is intentionally limited to code analysis, not code modification. The feature allows agents to inspect one selected local project and stream findings back to the operator, but it does not expose a first-class fix workflow yet.

## Provider Constraints

- Claude SDK runner whitelists only `Read`, `Glob`, and `Grep`.
- Codex runner uses `sandboxMode: 'read-only'`.
- Copilot runner is still preview-grade and currently relies on `approveAll`, so its deeper hardening is deferred.
- The IPC handler rejects any `SessionMode` other than `analyze`.
- The prompt builder scopes analysis to one primary project and does not mention MCP, secondary projects, or cross-repo coordination.

## Security Implications

- Renderer code never talks to SDK clients directly; all execution remains in the main process.
- The selected project path comes from the persisted FT-14A project registry rather than arbitrary free-form runtime input.
- FT-14B reduces the blast radius of early agent integration while leaving stronger policy enforcement to future work.

## Known Gap

Full hardening of all providers, especially Copilot permission handling, is explicitly deferred to FT-14H.

## See also

- [[wiki/concepts/ipc-security-model]]
- [[wiki/entities/claude-sdk-runner]]
- [[wiki/entities/codex-sdk-runner]]
- [[wiki/entities/copilot-sdk-runner]]
- [[wiki/topics/agent-analysis-sessions]]
