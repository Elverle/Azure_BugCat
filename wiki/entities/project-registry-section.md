---
title: 'Project Registry Section'
type: entity
subtype: component
created: 2026-05-17
updated: 2026-05-26
sources:
  [
    '[[wiki/sources/ft-14a-agent-configuration-project-registry]]',
    '[[wiki/sources/ft-14g-code-source-selection-mcp-repos-vs-local-filesystem]]'
  ]
tags: [react, component, settings, projects, registry]
lang: en
---

## Description

Settings card for managing the list of projects that future agent sessions may work against. FT-14G makes the same registry support two different execution models: local filesystem targets and Azure DevOps repository identifiers.

## Location

`src/renderer/src/components/settings/ProjectRegistrySection.tsx`

## Props

```typescript
interface ProjectRegistrySectionProps {
  projects: ProjectEntry[]
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  codeSource: CodeSource
  onAddProject: () => void
  onUpdateProject: (id: string, updates: Partial<ProjectEntry>) => void
  onRemoveProject: (id: string) => void
  onSelectDirectory: () => Promise<string | null>
}
```

## Behavior

- Shows an empty-state hint when no projects are registered.
- Adds new rows through `onAddProject()`, with row-local editing handled by `onUpdateProject(id, updates)`.
- In `local` mode, shows the `path` field plus a folder-picker button that delegates directory selection to the main process instead of exposing filesystem access in the renderer.
- In `mcp-repos` mode, hides the `path` field and instead explains that `project.name` is treated as the Azure DevOps repository name.
- Supports the `backend`, `frontend`, and `shared` project-type radio group.
- Accepts keyword entry as comma-separated text, keeps the raw typed draft visible while editing, and normalizes it to a trimmed string array for persistence.
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
- [[wiki/concepts/code-source-selection-for-agent-analysis]]
- [[wiki/topics/agent-session-configuration-foundation]]
