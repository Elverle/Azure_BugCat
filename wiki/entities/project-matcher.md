---
title: 'Project Matcher'
type: entity
subtype: library
created: 2026-05-20
updated: 2026-05-20
sources: ['[[wiki/sources/ft-14d-cross-repo-project-suggestions]]']
tags: [agent, projects, matching, heuristics, cross-repo]
lang: en
---

## Description

Pure FT-14D helper module that turns a categorized bug plus the FT-14A project registry into a suggested primary project and a list of likely secondary repositories.

## Location

`src/main/agent/project-matcher.ts`

## Public API

| Function                                        | Purpose                                                                             |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| `selectPrimaryProject(bug, projects)`           | Returns the best-matching project ID or `null` when no score reaches the threshold  |
| `suggestSecondaryProjects(primaryId, projects)` | Returns compatible secondary project IDs based on the selected primary project type |

## Primary Scoring Rules

| Signal                                                                     | Weight       |
| -------------------------------------------------------------------------- | ------------ |
| `bug.areaPath` contains a project keyword                                  | `+2`         |
| bug tag exactly matches a project keyword                                  | `+2` per tag |
| `macroCategory` or `subCategory` exactly matches a project keyword         | `+1`         |
| a word in the bug title exactly matches a project keyword                  | `+1`         |
| `bug.areaPath` contains the project type (`backend`, `frontend`, `shared`) | `+1`         |

- Matching is case-insensitive.
- The best project is accepted only when the total score is `>= 3`.
- Empty project lists or low-confidence matches return `null`.

## Secondary Suggestion Rules

- `shared` projects are suggested for any non-shared primary.
- A `backend` primary suggests `frontend` companions.
- A `frontend` primary suggests `backend` companions.
- A `shared` primary does not automatically suggest other repositories.
- The primary project itself is never returned as a secondary.

## Dependencies

- [[wiki/entities/shared-types]]
- [[wiki/entities/project-registry]]

## See also

- [[wiki/entities/analyze-start-panel]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/concepts/cross-repo-project-suggestion-heuristics]]
- [[wiki/topics/cross-repo-agent-analysis]]
