---
title: 'ADO Connection Section'
type: entity
subtype: component
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-02-settings]]']
tags: [react, component, settings, azure-devops]
lang: en
---

## Description

Settings card for Azure DevOps connection configuration. Renders fields for organization URL, project name, query ID, top N bugs, and PAT (with show/hide toggle). Includes a Test Connection button with inline result feedback.

## Location

`src/renderer/src/components/settings/AdoConnectionSection.tsx`

## Props

```typescript
interface AdoConnectionSectionProps {
  settings: AppSettings
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  onFieldChange: (field: keyof AppSettings, value: unknown) => void
  onTestConnection: () => Promise<void>
  testResult: { type: 'success' | 'error'; message: string } | null
  testLoading: boolean
}
```

## Field Layout

| Row | Fields                                                  |
| --- | ------------------------------------------------------- |
| 1   | Organization URL (full width)                           |
| 2   | Project Name + Query ID (2-col grid)                    |
| 3   | Top N Bugs + PAT (2-col grid, PAT has eye toggle)       |
| 4   | Test Connection button (right-aligned) + result message |

## Features

- PAT field has show/hide toggle (Eye/EyeOff icons)
- Validation errors shown below each field only when field is touched
- Test Connection button shows spinner while loading
- Responsive: 2-col grid collapses to 1-col on narrow screens (`md:grid-cols-2`)

## Dependencies

- [[wiki/entities/input-component]], [[wiki/entities/label-component]], [[wiki/entities/button-component]]
- `lucide-react` — Database, Eye, EyeOff, Loader2

## See also

- [[wiki/entities/settings-page]]
- [[wiki/entities/use-settings-hook]]
