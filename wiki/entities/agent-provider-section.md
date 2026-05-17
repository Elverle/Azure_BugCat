---
title: 'Agent Provider Section'
type: entity
subtype: component
created: 2026-05-17
updated: 2026-05-17
sources: ['[[wiki/sources/ft-14a-agent-configuration-project-registry]]']
tags: [react, component, settings, agent, byok]
lang: en
---

## Description

Settings card that configures which agent runtime should be used for future agent sessions. It combines auto-derived provider badges, manual provider selection for non-derived LLMs, optional manual credentials/model inputs, Copilot BYOK controls, and a Codex CLI installation check.

## Location

`src/renderer/src/components/settings/AgentProviderSection.tsx`

## Props

```typescript
interface AgentProviderSectionProps {
  settings: AppSettings
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  onFieldChange: (field: keyof AppSettings, value: unknown) => void
  onCheckBinary: () => Promise<void>
  binaryCheckResult: BinaryCheckResult | null
  binaryCheckLoading: boolean
}
```

## Behavior

- Shows a non-editable `Claude Code SDK (automatico)` badge when `llmProvider === 'anthropic'`.
- Shows a non-editable `Codex CLI (automatico)` badge when `llmProvider === 'openai'`.
- Falls back to a manual dropdown only for `gemini`, `generic`, and `openrouter` LLM selections.
- Shows `agentApiKey` and `agentModel` only when the effective provider is a manual SDK provider other than `copilot-sdk` and `none`.
- Shows a `Verifica installazione CLI` action when the effective provider is `codex-sdk`; the result banner comes from `BinaryCheckResult` returned by main-process IPC.
- Shows the Copilot preview warning and subscription/BYOK mode switch only when the effective provider is `copilot-sdk`.
- Reveals `copilotByokProvider` and `copilotByokApiKey` only when BYOK mode is enabled.

## Dependencies

- [[wiki/entities/use-settings-hook]]
- [[wiki/entities/validation-utils]]
- [[wiki/entities/button-component]]
- [[wiki/entities/input-component]]
- [[wiki/entities/label-component]]
- [[wiki/entities/select-component]]
- `lucide-react` - `Terminal`, `Eye`, `EyeOff`, `CheckCircle2`, `XCircle`, `Loader2`, `AlertTriangle`

## See also

- [[wiki/entities/settings-page]]
- [[wiki/concepts/agent-provider-auto-derivation]]
- [[wiki/concepts/settings-sanitization-before-save]]
- [[wiki/topics/agent-session-configuration-foundation]]
