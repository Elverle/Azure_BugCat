---
title: 'Cross-Repo Project Suggestion Heuristics'
type: concept
created: 2026-05-20
updated: 2026-05-20
sources: ['[[wiki/sources/ft-14d-cross-repo-project-suggestions]]']
tags: [agent, projects, heuristics, cross-repo, prompt]
lang: en
---

## Overview

FT-14D introduces a lightweight recommendation layer in front of `agent:start`. Instead of forcing the operator to pick repositories manually every time, BugCat scores the bug against registered project metadata, proposes a primary repository when confidence is high enough, and suggests a small compatible set of secondary repositories for read-only context.

## Heuristic Model

- **Primary recommendation:** computed from bug `areaPath`, tags, title words, and current categorization values.
- **Confidence threshold:** the best project wins only if its score is at least `3`; otherwise the UI falls back to an explicit user selection.
- **Secondary recommendation:** derived from the chosen primary project type rather than from a second scoring pass.
- **Operator override:** the renderer can send `primaryOverride` back through `agent:suggest-projects`, causing the main process to recompute secondaries for the new primary instead of trusting stale renderer state.

## Safety Rules

- Single-project registries bypass the heuristic IPC entirely.
- Secondary repositories are described as read-only context in both prompt variants.
- The main process resolves only known project IDs whose paths still exist and are directories before filling `secondaryPaths`.
- Prompt rendering escapes markdown table cells so project descriptions or paths containing `|` or newlines cannot corrupt the prompt.

## See also

- [[wiki/entities/project-matcher]]
- [[wiki/entities/analyze-start-panel]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/topics/cross-repo-agent-analysis]]
- [[wiki/topics/agent-analysis-sessions]]
