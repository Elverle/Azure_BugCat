---
title: 'LLM Provider Section'
type: entity
subtype: component
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-02-settings]]']
tags: [react, component, settings, llm]
lang: en
---

## Description

Settings card for LLM provider configuration. Includes provider select dropdown, conditional API key field (for OpenAI/Anthropic/Gemini) or Copilot auth status badge (for GitHub Copilot), chunk size input, and Test Connection button.

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

When `llmProvider !== 'github-copilot'`:

- Shows API key input with show/hide toggle
- Label dynamically changes: "OpenAI API Key", "Anthropic API Key", "Gemini API Key"

When `llmProvider === 'github-copilot'`:

- Shows authentication status badge (green/red/gray pill)
- Informational text: "GitHub Copilot uses your GitHub session. No API key needed."

## Provider Options

| Value            | Label            |
| ---------------- | ---------------- |
| `openai`         | OpenAI           |
| `anthropic`      | Anthropic Claude |
| `github-copilot` | GitHub Copilot   |
| `gemini`         | Gemini           |

## Copilot Auth Status Badges

| Status            | Badge                    |
| ----------------- | ------------------------ |
| `authenticated`   | Green: "Authenticated"   |
| `unauthenticated` | Red: "Not Authenticated" |
| `unknown`         | Gray: "Unknown"          |

## Dependencies

- [[wiki/entities/input-component]], [[wiki/entities/label-component]], [[wiki/entities/select-component]], [[wiki/entities/button-component]]
- `lucide-react` — Bot, Eye, EyeOff, Loader2

## See also

- [[wiki/entities/settings-page]]
- [[wiki/entities/use-settings-hook]]
