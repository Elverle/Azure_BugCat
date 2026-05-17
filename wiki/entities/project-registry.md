---
title: 'Project Registry'
type: entity
subtype: model
created: 2026-05-17
updated: 2026-05-17
sources: ['[[wiki/sources/ft-14a-agent-configuration-project-registry]]']
tags: [settings, projects, model, registry, filesystem]
lang: en
---

## Description

Domain model representing the set of local codebases that future agent sessions may target. The registry is stored inside `AppSettings.projects` and is edited in Settings, but path validation and directory picking are delegated to the main process.

## Location

- `src/shared/types.ts`
- `src/renderer/src/hooks/useSettings.ts`
- `src/main/ipc-handlers.ts`

## Data Model

```typescript
interface ProjectEntry {
  id: string
  name: string
  path: string
  type: 'backend' | 'frontend' | 'shared'
  description: string
  keywords: string[]
}
```

## Rules

- `id` is generated in the renderer with `crypto.randomUUID()` when a new project row is added.
- `name` is required and capped at 60 characters.
- `path` is required and must resolve to an existing directory at save time.
- `description` is optional and capped at 300 characters.
- Each `keyword` is capped at 30 characters.
- An empty registry is valid; at least one project is not required.

## Persistence Flow

1. Settings edits mutate `settings.projects` through [[wiki/entities/use-settings-hook]].
2. Local validators enforce required fields and max lengths.
3. Save-time IPC checks verify that each path exists and points to a directory.
4. The sanitized full `AppSettings` object is written through `settings:set`.
5. Dedicated `projects:get` / `projects:set` channels also exist as a narrower foundation for future FT-14B flows.

## See also

- [[wiki/entities/project-registry-section]]
- [[wiki/entities/shared-types]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/topics/agent-session-configuration-foundation]]
