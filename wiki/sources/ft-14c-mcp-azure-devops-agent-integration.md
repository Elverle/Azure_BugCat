---
title: 'FT-14C - MCP Azure DevOps Integration for Agent Sessions'
type: source
created: 2026-05-20
updated: 2026-05-20
sources: []
tags: [feature, agent, mcp, azure-devops, fallback, ipc, claude, codex, copilot]
lang: en
---

## Summary

FT-14C extends the FT-14B agent-session workflow with optional Azure DevOps MCP access. Before an `analyze` session starts, the main process probes the local `@azure-devops/mcp` server, writes or merges project-local `.mcp.json` for Claude/Codex when needed, injects `mcpServers` programmatically for Copilot, and swaps to a shorter MCP-oriented prompt when the probe succeeds. If any part of that setup is unavailable, the session still starts with the existing full embedded bug prompt and the renderer surfaces a non-blocking `Fallback` status.

## Feature Scope

- **ID:** FT-14C
- **Primary workflow:** MCP-first bug analysis with graceful fallback to FT-14B prompt embedding
- **Providers affected:** Claude SDK, Codex SDK, Copilot SDK
- **Renderer impact:** session header now communicates whether the run used MCP or prompt fallback

## Files Added

| File                                          | Purpose                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/main/agent/mcp-config-writer.ts`         | Writes/merges `.mcp.json` with the `azure-devops` entry and PAT placeholder                       |
| `src/main/agent/mcp-health-check.ts`          | Performs a spawn-based readiness probe for the local MCP server                                   |
| `tests/main/mcp-config-writer.spec.ts`        | Covers path resolution, org extraction, config merge, invalid JSON overwrite, and secret handling |
| `tests/main/mcp-health-check.spec.ts`         | Covers success, timeout, spawn error, invalid org URL, and crash-after-output cases               |
| `tests/renderer/McpStatusBadge.spec.tsx`      | Verifies `MCP` and `Fallback` badge behavior through `SessionsPanel`                              |
| `feature/feature-14/feature-14C/spec-plan.md` | Feature plan and acceptance criteria                                                              |

## Files Updated

| File                                                      | Purpose                                                                                        |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/main/agent/prompt-builder.ts`                        | Added `buildMcpPrompt()` alongside the existing full bug prompt                                |
| `src/main/agent/runners/claude-sdk-runner.ts`             | Enables MCP-aware tool access and PAT env injection                                            |
| `src/main/agent/runners/codex-sdk-runner.ts`              | Enables MCP-aware PAT env handling with snapshot/restore semantics                             |
| `src/main/agent/runners/copilot-sdk-runner.ts`            | Adds session-scoped `mcpServers` injection for Copilot                                         |
| `src/main/agent/types.ts`                                 | Extends runner params with MCP availability and ADO settings                                   |
| `src/main/agent/index.ts`                                 | Re-exports MCP utilities and the MCP prompt builder                                            |
| `src/main/ipc-handlers.ts`                                | Orchestrates MCP feasibility, health check, `.mcp.json`, prompt selection, and status emission |
| `src/shared/types.ts`                                     | Adds `McpStatus` and `AgentMcpStatusPayload`                                                   |
| `src/shared/ipc-channels.ts`                              | Adds `AGENT_MCP_STATUS`                                                                        |
| `src/preload/index.ts`                                    | Exposes `onAgentMcpStatus()` to the renderer                                                   |
| `src/renderer/src/hooks/useAgentSession.ts`               | Tracks per-session MCP status and exposes it with session state                                |
| `src/renderer/src/pages/DashboardPage.tsx`                | Passes MCP status into the sessions surface                                                    |
| `src/renderer/src/components/dashboard/SessionsPanel.tsx` | Renders `MCP` / `Fallback` badge in the session header                                         |
| `tests/main/agent-prompt-builder.spec.ts`                 | Adds focused assertions for the shorter MCP prompt                                             |
| `tests/main/ipc-handlers.spec.ts`                         | Adapts expectations to the richer `agent:start` return shape                                   |
| `tests/renderer/SessionsPanel.spec.tsx`                   | Updates existing panel tests for the new prop surface                                          |

## Tests

| File                                      | Coverage                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `tests/main/mcp-config-writer.spec.ts`    | Config merge semantics, placeholder-only PAT storage, and org extraction |
| `tests/main/mcp-health-check.spec.ts`     | Readiness output detection, timeout handling, and failure normalization  |
| `tests/main/agent-prompt-builder.spec.ts` | FT-14B full prompt vs FT-14C MCP prompt shape                            |
| `tests/main/ipc-handlers.spec.ts`         | Main-process return shape compatibility for session start                |
| `tests/renderer/SessionsPanel.spec.tsx`   | Existing session UI states with the new prop contract                    |
| `tests/renderer/McpStatusBadge.spec.tsx`  | Badge visibility, title tooltip, and null-session behavior               |

## Key Design Decisions

- **Capability detection happens before runner start**: `agent:start` computes one `McpStatus` before creating the session so the runner, prompt builder, and renderer all operate from the same decision.
- **Health check is output-based, not protocol-deep**: success requires startup output plus a 500ms survival window, which reduces false positives from processes that print then crash immediately.
- **Secrets stay out of project files**: `.mcp.json` stores only `${PERSONAL_ACCESS_TOKEN}` and the live PAT is passed through process environment after base64 encoding.
- **Runner integration is provider-specific**: Claude/Codex use project-local discovery, while Copilot receives an in-memory `mcpServers` object at session creation time.
- **Fallback is part of normal behavior**: missing binary, bad org URL, timeout, or any setup error does not fail the session; it switches back to `buildAnalyzePrompt()` and surfaces the reason through `agent:mcp-status`.
- **Codex env mutation is reversible**: the runner snapshots any previous `PERSONAL_ACCESS_TOKEN` value and restores it in `finally` so FT-14C does not leak state across runs.

## Entities Created

- [[wiki/entities/mcp-config-writer]]
- [[wiki/entities/mcp-health-check]]

## Concepts Created

- [[wiki/concepts/mcp-capability-probe-and-fallback]]

## Topics Created

- [[wiki/topics/mcp-backed-agent-analysis]]

## See also

- [[wiki/sources/ft-14b-agent-sessions]]
- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/concepts/read-only-agent-analysis-sandboxing]]
