---
title: 'LLM Provider Section'
type: entity
subtype: component
created: 2026-04-29
updated: 2026-05-01
sources: ['[[wiki/sources/ft-02-settings]]', '[[wiki/sources/ft-08-generic-provider]]']
tags: [react, component, settings, llm]
lang: en
---

## Description

Settings card for LLM provider configuration. Includes provider select dropdown, API key field with dynamic label, generic-provider-only Base URL and Model inputs, chunk size input, and Test Connection button.

## Location

`src/renderer/src/components/settings/LlmProviderSection.tsx`

## Props

```typescript
interface LlmProviderSectionProps {
  settings: AppSettings
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  onFieldChange: (field: keyof AppSettings, value: unknown) => void
  onTestConnection: () => Promise<void>
  testResult: { type: 'success' | 'error'; message: string } | null
  testLoading: boolean
}
```

## Conditional Rendering

The API key field is always shown:

- Shows API key input with show/hide toggle
- Label dynamically changes: "OpenAI API Key", "Anthropic API Key", "Gemini API Key", or generic "API Key"

When `llmProvider === 'generic'`:

- Shows `Base URL` input with an OpenAI-compatible endpoint placeholder
- Shows optional `Model` input so the user can override the default `gpt-4o`
- Renders inline `errors.baseUrl` feedback when validation fails

## Provider Options

| Value       | Label            |
| ----------- | ---------------- |
| `openai`    | OpenAI           |
| `anthropic` | Anthropic Claude |
| `generic`   | Generico         |
| `gemini`    | Gemini           |

## Dependencies

- [[wiki/entities/input-component]], [[wiki/entities/label-component]], [[wiki/entities/select-component]], [[wiki/entities/button-component]]
- `lucide-react` — Bot, Eye, EyeOff, Loader2

## See also

- [[wiki/entities/settings-page]]
- [[wiki/entities/use-settings-hook]]
