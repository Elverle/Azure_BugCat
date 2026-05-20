---
title: 'MCP Config Writer'
type: entity
subtype: service
created: 2026-05-20
updated: 2026-05-20
sources: ['[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]']
tags: [agent, mcp, azure-devops, config, filesystem]
lang: en
---

## Description

Main-process utility that prepares project-local MCP discovery for FT-14C. It writes or merges `.mcp.json` in the selected project directory for runners that load MCP configuration from the working tree.

## Location

`src/main/agent/mcp-config-writer.ts`

## Responsibilities

- Resolves the installed Azure DevOps MCP server entrypoint through `createRequire()` and `require.resolve('@azure-devops/mcp/dist/index.js')`.
- Normalizes `orgUrl` into an organization slug with `extractOrgName()`, including trailing-slash handling.
- Builds the `azure-devops` server entry as `node <resolved-binary> <org> --authentication pat`.
- Persists only the placeholder `${PERSONAL_ACCESS_TOKEN}` under `.mcp.json` so the PAT is never written in cleartext.
- Merges the new entry into an existing `mcpServers` object when the file already exists and preserves unrelated server definitions.
- Falls back to a fresh config when `.mcp.json` is missing, invalid JSON, or has a non-object `mcpServers` shape.

## Helper Functions

| Helper                                | Purpose                                                         |
| ------------------------------------- | --------------------------------------------------------------- |
| `resolveMcpServerPath()`              | Resolves the local `@azure-devops/mcp` runtime binary           |
| `extractOrgName(orgUrl)`              | Converts a full Azure DevOps org URL into the organization slug |
| `encodePat(rawPat)`                   | Produces the base64 `:PAT` form used by the MCP runtime env     |
| `writeMcpConfig(projectPath, orgUrl)` | Performs the merge/write operation for `.mcp.json`              |

## Operational Notes

- FT-14C currently writes only the organization-derived command arguments; `projectName` remains part of session feasibility and prompt context rather than the on-disk config.
- Invalid JSON is treated as recoverable technical debt: the utility logs a warning and replaces the file with a valid config.
- This writer is used only for Claude and Codex. Copilot receives MCP configuration in-memory and bypasses `.mcp.json` entirely.

## Dependencies

- [[wiki/entities/mcp-health-check]]
- [[wiki/entities/claude-sdk-runner]]
- [[wiki/entities/codex-sdk-runner]]
- [[wiki/entities/ipc-handlers]]

## See also

- [[wiki/concepts/mcp-capability-probe-and-fallback]]
- [[wiki/topics/mcp-backed-agent-analysis]]
