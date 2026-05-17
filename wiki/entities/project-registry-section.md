---
title: 'Project Registry Section'
type: entity
subtype: component
created: 2026-05-17
updated: 2026-05-17
sources: ['[[wiki/sources/ft-14a-agent-configuration-project-registry]]']
tags: [react, component, settings, projects, registry]
lang: en
---

## Description

Settings card for managing the list of local projects that future agent sessions may work against. It renders a CRUD interface over `AppSettings.projects`, including typed metadata, a directory picker, and field-level error display keyed per project row.

## Location

`src/renderer/src/components/settings/ProjectRegistrySection.tsx`

## Props

```typescript
interface ProjectRegistrySectionProps {
  projects: ProjectEntry[]
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  onAddProject: () => void
  onUpdateProject: (id: string, updates: Partial<ProjectEntry>) => void
  onRemoveProject: (id: string) => void
  onSelectDirectory: () => Promise<string | null>
}
```

## Behavior

- Shows an empty-state hint when no projects are registered.
- Adds new rows through `onAddProject()`, with row-local editing handled by `onUpdateProject(id, updates)`.
- Uses a folder-picker button that delegates path selection to the main process instead of exposing filesystem access in the renderer.
- Supports the `backend`, `frontend`, and `shared` project-type radio group.
- Accepts keyword entry as comma-separated text and normalizes it to a trimmed string array.
- Shows validation messages only for the specific touched fields of each row, not for every untouched field in a newly created project.

## Dependencies

- [[wiki/entities/project-registry]]
- [[wiki/entities/use-settings-hook]]
- [[wiki/entities/validation-utils]]
- [[wiki/entities/button-component]]
- [[wiki/entities/input-component]]
- [[wiki/entities/label-component]]
- [[wiki/entities/textarea-component]]

## See also

- [[wiki/entities/settings-page]]
- [[wiki/concepts/dynamic-collection-touched-state]]
- [[wiki/topics/agent-session-configuration-foundation]]
