---
title: 'MCP Health Check'
type: entity
subtype: service
created: 2026-05-20
updated: 2026-05-20
sources: ['[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]']
tags: [agent, mcp, azure-devops, health-check, process]
lang: en
---

## Description

Spawn-based readiness probe used by `agent:start` to decide whether FT-14C can run in MCP mode for the current session.

## Location

`src/main/agent/mcp-health-check.ts`

## Runtime Behavior

- Resolves the MCP server binary and Azure DevOps organization slug before spawning any child process.
- Base64-encodes the PAT through `encodePat()` and injects it as `PERSONAL_ACCESS_TOKEN` in the child environment.
- Spawns `node <binary> <org> --authentication pat` with piped stdio.
- Treats the first `stdout` or `stderr` output as a startup signal, but waits an additional 500ms before declaring success.
- Returns `available: false` for binary-resolution failures, invalid org URLs, spawn errors, explicit non-zero exit codes, clean exit without output, and timeout.
- Always resolves to `McpStatus`; it does not throw transport-level errors back into the session-start flow.

## Why The 500ms Window Exists

Some Node-based servers print startup text before they finish stabilizing. FT-14C therefore treats output as necessary but not sufficient. The extra 500ms window catches the common case where the process emits one line and then exits with an error immediately after.

## Failure Surface

| Case                      | Returned status                                                              |
| ------------------------- | ---------------------------------------------------------------------------- |
| Binary cannot be resolved | `{ available: false, reason: 'MCP server binary not found' }`                |
| Invalid org URL           | `{ available: false, reason: 'Invalid org URL: ...' }`                       |
| Spawn error               | `{ available: false, reason: 'Spawn error: ...' }`                           |
| Non-zero exit             | `{ available: false, reason: 'MCP server exited with code N' }`              |
| No output before exit     | `{ available: false, reason: 'MCP server exited without producing output' }` |
| Timeout                   | `{ available: false, reason: 'Health check timeout' }`                       |

## Dependencies

- [[wiki/entities/mcp-config-writer]]
- [[wiki/entities/shared-types]]
- [[wiki/entities/ipc-handlers]]

## See also

- [[wiki/concepts/mcp-capability-probe-and-fallback]]
- [[wiki/topics/mcp-backed-agent-analysis]]
