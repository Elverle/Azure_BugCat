---
title: 'Agent Prompt Builder'
type: entity
subtype: library
created: 2026-05-18
updated: 2026-05-26
sources:
	[
		'[[wiki/sources/ft-14b-agent-sessions]]',
		'[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]',
		'[[wiki/sources/ft-14d-cross-repo-project-suggestions]]',
		'[[wiki/sources/ft-14g-code-source-selection-mcp-repos-vs-local-filesystem]]'
	]
tags: [agent, prompt, bugs, project-context]
lang: en
---

## Description

Pure helper that builds the session prompt for FT-14B through FT-14G. It now supports three distinct analysis variants: the original full bug-embedding prompt, the FT-14C MCP bug-fetch prompt that still reads code locally, and the FT-14G MCP-repo prompt that removes local filesystem assumptions entirely. Both cross-repo secondary context and the optional fenced `## Note utente` block remain shared across every variant.

## Location

`src/main/agent/prompt-builder.ts`

## Prompt Variants

### `buildAnalyzePrompt()`

- Role framing: senior engineer performing root-cause analysis
- Bug report block: identity, status, timestamps, tags, categorization, description
- Project context block: selected project metadata from FT-14A registry
- Optional architecture context block
- Optional FT-14D `Secondary Projects` table with secondary repo name, path, type, and description
- Optional `userContext?: string` block injected as `## Note utente` before `## Your Task`
- Explicit task list: inspect code, identify likely root cause, list affected files/components, suggest next steps, produce a structured report

### `buildMcpPrompt()`

- Replaces the full bug block with a bug ID and instructions to fetch work item context through Azure DevOps MCP tools.
- Still includes project metadata plus optional architecture context so local code navigation stays grounded.
- Adds DevOps organization and project labels for operator-visible context without embedding the full bug payload.
- Reuses the same FT-14D secondary-project table when optional cross-repo context is available.
- Reuses the same optional fenced `## Note utente` section as the non-MCP prompt so operator hints survive the MCP/fallback branch.

### `buildMcpReposPrompt()`

- Keeps MCP-based live bug retrieval, but also instructs the model to use Azure DevOps repo tools for all code navigation.
- Removes local-path framing from the primary-project block and treats the project name as the Azure DevOps repository identifier.
- Documents the intended repo-tool sequence explicitly: `repo_get_repo_by_name_or_id` -> `repo_list_directory` -> `repo_get_file_content`.
- Renders FT-14D secondary repositories as repo names rather than filesystem paths.
- Preserves the same optional fenced `## Note utente` block and architecture context used by the other prompt variants.

## min-09 Notes

- Both prompt variants accept `userContext?: string` and inject it only when the trimmed value is non-empty.
- The operator note is emitted after architecture/secondary-project context and before `## Your Task`, so it can enrich the investigation without replacing the prompt contract.
- The section is wrapped in `---` delimiters and explicitly labeled as background information only, which reduces the chance that user prose is interpreted as higher-priority instructions.

## FT-14D Notes

- `escapeTableCell()` sanitizes `|`, carriage returns, and newlines so markdown table rows cannot be broken by project metadata.
- `buildSecondaryProjectsSection()` explicitly frames secondary repositories as read-only references and is shared by both prompt variants.
- Empty secondary arrays are treated the same as `undefined`, so prompts stay identical to FT-14B/FT-14C when no extra repositories are selected.

## Scope Guards

- FT-14B prompts only one primary project path.
- The MCP prompt intentionally does not embed bug title, description, categorization, or other fields that MCP should fetch live.
- FT-14D secondary projects are guidance-only context and never replace the primary project block.
- Empty description, tags, and keywords are normalized into explicit placeholders instead of omitted sections.
- min-09 keeps note handling symmetric across MCP and fallback prompts, so MCP availability changes transport, not operator-visible note semantics.
- FT-14G keeps the prompt and runtime aligned: the MCP-repo prompt never instructs the model to read local files, which matches the Claude runner's tool filtering in `mcp-repos` mode.

## Dependencies

- [[wiki/entities/shared-types]]
- [[wiki/entities/project-registry]]

## See also

- [[wiki/entities/agent-session-manager]]
- [[wiki/entities/project-matcher]]
- [[wiki/topics/cross-repo-agent-analysis]]
- [[wiki/concepts/code-source-selection-for-agent-analysis]]
- [[wiki/concepts/mcp-capability-probe-and-fallback]]
- [[wiki/topics/agent-analysis-sessions]]
