---
title: 'Code Source Selection for Agent Analysis'
type: concept
created: 2026-05-26
updated: 2026-05-26
sources:
  [
    '[[wiki/sources/ft-14a-agent-configuration-project-registry]]',
    '[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]',
    '[[wiki/sources/ft-14d-cross-repo-project-suggestions]]',
    '[[wiki/sources/ft-14g-code-source-selection-mcp-repos-vs-local-filesystem]]'
  ]
tags: [agent, settings, mcp, azure-devops, filesystem, repos, prompt]
lang: en
---

## Definition

FT-14G turns code access into an explicit operator choice by adding `AppSettings.codeSource = 'local' | 'mcp-repos'`. The selected mode does not just change Settings copy; it changes project validation, prompt assembly, runner tool permissions, and whether MCP is optional or mandatory at session start.

## Modes

### `local`

- `ProjectEntry.path` is required for runnable project context.
- Settings validates paths locally in the renderer and again through main-process IPC before save.
- `agent:start` rejects missing or non-directory primary paths.
- The prompt uses `buildAnalyzePrompt()` when MCP is unavailable, or `buildMcpPrompt()` when MCP can fetch live bug data while code still comes from the local filesystem.
- Claude keeps local read tools (`Read`, `Glob`, `Grep`) and adds `mcp__azure-devops` only when MCP is available.

### `mcp-repos`

- `ProjectEntry.path` becomes optional and is not validated at save time.
- The project name becomes the Azure DevOps repository identifier used in prompts and secondary-project guidance.
- `agent:start` requires MCP availability and fails fast if the Azure DevOps MCP path cannot be established.
- The prompt always uses `buildMcpReposPrompt()`, which instructs the model to navigate code exclusively through Azure DevOps repo tools.
- Claude receives only `mcp__azure-devops`, which removes accidental fallback to local filesystem reads.

## Decision Flow

```text
Settings.codeSource
  -> useSettings.save()
     -> local: validate project paths via IPC
     -> mcp-repos: skip path IPC validation
  -> ipc-handlers agent:start
     -> local: require real primary path
     -> mcp-repos: require MCP and allocate temp cwd
  -> prompt-builder
     -> buildAnalyzePrompt() / buildMcpPrompt() / buildMcpReposPrompt()
  -> runner
     -> local: local read tools, optional MCP
     -> mcp-repos: MCP repo tools only
```

## Why This Pattern Matters

- It makes agent behavior **predictable**. Prompt wording, project requirements, and tool permissions now derive from one persisted setting.
- It removes a false dependency on local checkouts for teams that want repository reads to happen entirely through Azure DevOps.
- It preserves the earlier FT-14A/FT-14C path for teams that still prefer local filesystems, instead of forcing all agent sessions onto MCP repos.
- It keeps the trust boundary explicit: `mcp-repos` does not silently widen into local file access, and `local` does not silently depend on Azure DevOps repo APIs for code reads.

## Trade-offs

- **Pro:** operators can pick the access model that matches their environment and credentials.
- **Pro:** MCP-repos mode eliminates stale-local-checkout drift because code is read from the live Azure DevOps repository state.
- **Con:** MCP-repos mode is more brittle to Azure DevOps MCP availability because there is no local-code fallback.
- **Con:** file-based runners still need a temporary working directory even when code itself is not read from disk.

## See also

- [[wiki/entities/shared-types]]
- [[wiki/entities/project-registry]]
- [[wiki/entities/agent-prompt-builder]]
- [[wiki/entities/claude-sdk-runner]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/concepts/mcp-capability-probe-and-fallback]]
- [[wiki/topics/agent-session-configuration-foundation]]
- [[wiki/topics/mcp-backed-agent-analysis]]
