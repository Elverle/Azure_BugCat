---
title: 'MCP Capability Probe and Fallback'
type: concept
created: 2026-05-20
updated: 2026-05-26
sources:
  [
    '[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]',
    '[[wiki/sources/ft-14g-code-source-selection-mcp-repos-vs-local-filesystem]]'
  ]
tags: [agent, mcp, azure-devops, fallback, resilience]
lang: en
---

## Overview

FT-14C adds a capability-negotiation stage to `agent:start`. Instead of assuming Azure DevOps MCP is always present, the main process probes for it once per session and then commits the rest of the workflow to either an MCP-enhanced path or the original FT-14B prompt-only path. FT-14G keeps the same probe, but makes the post-probe behavior depend on `codeSource`.

## Decision Flow

1. Validate that ADO PAT, org URL, and project name are present enough to attempt MCP.
2. Run [[wiki/entities/mcp-health-check]] against the local `@azure-devops/mcp` binary.
3. If the probe succeeds:
   - write or merge `.mcp.json` for Claude/Codex through [[wiki/entities/mcp-config-writer]], or
   - inject `mcpServers` directly for [[wiki/entities/copilot-sdk-runner]].
4. Build the short MCP-oriented prompt through [[wiki/entities/agent-prompt-builder]].
5. Cache the resulting `McpStatus` alongside the session so FT-14E summaries can expose the chosen path.
6. If any step fails:
   - in `local` mode, skip only the MCP branch and continue with the full embedded bug prompt.
   - in `mcp-repos` mode, fail session start because MCP is the selected code transport, not an optional enhancement.

## Why This Pattern Matters

- It keeps FT-14C **resilient**: missing local MCP dependencies do not block bug analysis.
- It keeps FT-14C **safe**: PAT material is supplied at runtime, not persisted in repository files.
- It keeps FT-14C **deterministic**: the prompt, runner configuration, and UI badge all derive from the same `McpStatus` decision.
- FT-14G refines that determinism further: fallback is now an explicit property of the selected code source rather than a universal behavior.

## Trade-Offs

- The probe is intentionally shallow. It detects startup viability, not full end-to-end MCP tool correctness, so some mid-session MCP failures can still occur later inside a runner.
- Claude and Codex depend on project-local discovery, which means FT-14C briefly mutates the selected repository by writing `.mcp.json`.
- FT-14G `mcp-repos` mode still needs a working directory for that file-based discovery, so the main process allocates a temp folder instead of requiring the real local checkout.
- Copilot avoids disk writes but depends on the SDK honoring the injected `mcpServers` contract at runtime.

## See also

- [[wiki/entities/mcp-config-writer]]
- [[wiki/entities/mcp-health-check]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/concepts/code-source-selection-for-agent-analysis]]
- [[wiki/topics/mcp-backed-agent-analysis]]
- [[wiki/topics/agent-analysis-sessions]]
