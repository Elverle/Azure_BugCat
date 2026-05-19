---
title: 'Agent Prompt Builder'
type: entity
subtype: library
created: 2026-05-18
updated: 2026-05-18
sources: ['[[wiki/sources/ft-14b-agent-sessions]]']
tags: [agent, prompt, bugs, project-context]
lang: en
---

## Description

Pure helper that builds the FT-14B analysis prompt from one categorized bug, one selected project, and the optional architecture context captured in Settings.

## Location

`src/main/agent/prompt-builder.ts`

## Prompt Structure

- Role framing: senior engineer performing root-cause analysis
- Bug report block: identity, status, timestamps, tags, categorization, description
- Project context block: selected project metadata from FT-14A registry
- Optional architecture context block
- Explicit task list: inspect code, identify likely root cause, list affected files/components, suggest next steps, produce a structured report

## Scope Guards

- FT-14B prompts only one primary project path.
- Tests assert that the prompt does not mention MCP, secondary projects, or cross-repo workflows.
- Empty description, tags, and keywords are normalized into explicit placeholders instead of omitted sections.

## Dependencies

- [[wiki/entities/shared-types]]
- [[wiki/entities/project-registry]]

## See also

- [[wiki/entities/agent-session-manager]]
- [[wiki/topics/agent-analysis-sessions]]
