---
title: 'ADO Connection Section'
type: entity
subtype: component
created: 2026-04-29
updated: 2026-08-20
sources: ['[[wiki/sources/ft-02-settings]]']
tags: [react, component, settings, azure-devops, secrets]
lang: en
---

## Description

Settings card for Azure DevOps connection configuration. Renders fields for organization URL, project name, query ID, top N bugs, and PAT. Includes a Test Connection button with inline result feedback.

## Location

`src/renderer/src/components/settings/AdoConnectionSection.tsx`

## Props

```typescript
interface AdoConnectionSectionProps {
  settings: AppSettings
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  onFieldChange: (field: keyof AppSettings, value: unknown) => void
  onClearSecret: (field: 'pat' | 'apiKey') => void
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
| 3   | Top N Bugs + PAT (2-col grid)                            |
| 4   | Test Connection button (right-aligned) + result message |

## Features

- PAT field has two rendering modes, driven by `isSecretPlaceholder(settings.pat)` (FT-14):
  - **Editable** (no stored value yet): a show/hide toggle (Eye/EyeOff icons) on a normal password input, unchanged from before FT-14.
  - **Stored** (value is the [[wiki/entities/secret-storage|`SECRET_PLACEHOLDER`]] sentinel): a disabled, empty password input, a "Token stored" status text (`aria-describedby`-linked to the input), and a "Replace" button (`aria-label="Replace PAT"`) that calls `onClearSecret('pat')` to clear the field back to editable state.
- Validation errors shown below each field only when field is touched.
- Test Connection button shows spinner while loading; the request sends the current form's PAT — real value if the user typed one, sentinel otherwise — for the main process to resolve.
- Responsive: 2-col grid collapses to 1-col on narrow screens (`md:grid-cols-2`).

## Dependencies

- [[wiki/entities/input-component]], [[wiki/entities/label-component]], [[wiki/entities/button-component]]
- [[wiki/entities/secret-storage]] — `isSecretPlaceholder()` gates the stored/editable rendering
- `lucide-react` — Database, Eye, EyeOff, Loader2

## See also

- [[wiki/entities/settings-page]]
- [[wiki/entities/use-settings-hook]]
- [[wiki/entities/secret-storage]]
- [[wiki/concepts/settings-persistence-flow]]
