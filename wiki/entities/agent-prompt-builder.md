---
title: 'Agent Prompt Builder'
type: entity
subtype: library
created: 2026-05-18
updated: 2026-05-20
sources:
	[
		'[[wiki/sources/ft-14b-agent-sessions]]',
		'[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]',
		'[[wiki/sources/ft-14d-cross-repo-project-suggestions]]'
	]
tags: [agent, prompt, bugs, project-context]
lang: en
---

## Description

Pure helper that builds the session prompt for FT-14B, FT-14C, and FT-14D. It now supports both the original full bug-embedding prompt and the shorter MCP-oriented prompt used when Azure DevOps MCP is available, plus a conditional read-only `Secondary Projects` section for cross-repo analysis.

## Location

`src/main/agent/prompt-builder.ts`

## Prompt Variants

### `buildAnalyzePrompt()`

- Role framing: senior engineer performing root-cause analysis
- Bug report block: identity, status, timestamps, tags, categorization, description
- Project context block: selected project metadata from FT-14A registry
- Optional architecture context block
- Optional FT-14D `Secondary Projects` table with secondary repo name, path, type, and description
- Explicit task list: inspect code, identify likely root cause, list affected files/components, suggest next steps, produce a structured report

### `buildMcpPrompt()`

- Replaces the full bug block with a bug ID and instructions to fetch work item context through Azure DevOps MCP tools.
- Still includes project metadata plus optional architecture context so local code navigation stays grounded.
- Adds DevOps organization and project labels for operator-visible context without embedding the full bug payload.
- Reuses the same FT-14D secondary-project table when optional cross-repo context is available.

## FT-14D Notes

- `escapeTableCell()` sanitizes `|`, carriage returns, and newlines so markdown table rows cannot be broken by project metadata.
- `buildSecondaryProjectsSection()` explicitly frames secondary repositories as read-only references and is shared by both prompt variants.
- Empty secondary arrays are treated the same as `undefined`, so prompts stay identical to FT-14B/FT-14C when no extra repositories are selected.

## Scope Guards

- FT-14B prompts only one primary project path.
- The MCP prompt intentionally does not embed bug title, description, categorization, or other fields that MCP should fetch live.
- FT-14D secondary projects are guidance-only context and never replace the primary project block.
- Empty description, tags, and keywords are normalized into explicit placeholders instead of omitted sections.

## Dependencies

- [[wiki/entities/shared-types]]
- [[wiki/entities/project-registry]]

## See also

- [[wiki/entities/agent-session-manager]]
- [[wiki/entities/project-matcher]]
- [[wiki/topics/cross-repo-agent-analysis]]
- [[wiki/concepts/mcp-capability-probe-and-fallback]]
- [[wiki/topics/agent-analysis-sessions]]
