---
title: 'Project Registry'
type: entity
subtype: model
created: 2026-05-17
updated: 2026-05-26
sources:
  [
    '[[wiki/sources/ft-14a-agent-configuration-project-registry]]',
    '[[wiki/sources/ft-14d-cross-repo-project-suggestions]]',
    '[[wiki/sources/ft-14g-code-source-selection-mcp-repos-vs-local-filesystem]]'
  ]
tags: [settings, projects, model, registry, filesystem]
lang: en
---

## Description

Domain model representing the set of codebases that agent sessions may target. The registry is stored inside `AppSettings.projects` and is edited in Settings, but FT-14G lets the same entries represent either local directories or Azure DevOps repositories depending on the selected code source.

## Location

- `src/shared/types.ts`
- `src/renderer/src/hooks/useSettings.ts`
- `src/main/ipc-handlers.ts`

## Data Model

```typescript
interface ProjectEntry {
  id: string
  name: string
  path?: string
  type: 'backend' | 'frontend' | 'shared'
  description: string
  keywords: string[]
}
```

## Rules

- `id` is generated in the renderer with `crypto.randomUUID()` when a new project row is added.
- `name` is required and capped at 60 characters.
- `path` is required only in `local` mode and must resolve to an existing directory at save time.
- `description` is optional and capped at 300 characters.
- Each `keyword` is capped at 30 characters.
- An empty registry is valid; at least one project is not required.
- FT-14D uses `type`, `description`, and `keywords` as runtime metadata for automatic project suggestions and prompt context, so those fields now influence analysis quality rather than acting as passive notes only.
- FT-14G uses the same `name` field as the Azure DevOps repository identifier in `mcp-repos` mode.

## Persistence Flow

1. Settings edits mutate `settings.projects` through [[wiki/entities/use-settings-hook]].
2. Local validators enforce required fields and max lengths.
3. Save-time IPC checks verify that each path exists and points to a directory only when `codeSource === 'local'`.
4. The sanitized full `AppSettings` object is written through `settings:set`.
5. Dedicated `projects:get` / `projects:set` channels also exist as a narrower foundation for agent launch flows.
6. FT-14D reads the persisted registry through `agent:suggest-projects` and `agent:start` to choose a primary repo and resolve optional secondary context paths.
7. FT-14G resolves secondaries differently by mode: local mode requires real directories, while MCP-repos mode keeps the metadata even without local paths because repo names are sufficient.

## See also

- [[wiki/entities/project-registry-section]]
- [[wiki/entities/shared-types]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/concepts/code-source-selection-for-agent-analysis]]
- [[wiki/topics/agent-session-configuration-foundation]]
- [[wiki/topics/cross-repo-agent-analysis]]
