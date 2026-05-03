---
title: 'LLM Provider Section'
type: entity
subtype: component
created: 2026-04-29
updated: 2026-05-02
sources:
  [
    '[[wiki/sources/ft-02-settings]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-11-openrouter-provider]]'
  ]
tags: [react, component, settings, llm]
lang: en
---

## Description

Settings card for LLM provider configuration. Includes provider select dropdown, API key field with dynamic label, provider-aware model placeholder, generic-provider-only Base URL input, chunk size input, and Test Connection button.

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
- Label dynamically changes: "OpenAI API Key", "Anthropic API Key", "Gemini API Key", "OpenRouter API Key", or generic "API Key"

The model field is always shown:

- Placeholder changes per provider (`gpt-4.1-mini`, `claude-sonnet-4.6`, `gemini-2.5-flash`, `openai/gpt-4.1-mini`)
- OpenRouter uses the shared API-key + model surface, so no extra provider-specific fields are required

When `llmProvider === 'generic'`:

- Shows `Base URL` input with an OpenAI-compatible endpoint placeholder
- Renders inline `errors.baseUrl` feedback when validation fails

## Provider Options

| Value        | Label            |
| ------------ | ---------------- |
| `openai`     | OpenAI           |
| `anthropic`  | Anthropic Claude |
| `generic`    | Generico         |
| `gemini`     | Gemini           |
| `openrouter` | OpenRouter       |

## Dependencies

- [[wiki/entities/input-component]], [[wiki/entities/label-component]], [[wiki/entities/select-component]], [[wiki/entities/button-component]]
- `lucide-react` — Bot, Eye, EyeOff, Loader2

## See also

- [[wiki/entities/settings-page]]
- [[wiki/entities/use-settings-hook]]
