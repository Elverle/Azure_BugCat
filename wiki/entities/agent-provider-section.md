---
title: 'Agent Provider Section'
type: entity
subtype: component
created: 2026-05-17
updated: 2026-05-26
sources:
  [
    '[[wiki/sources/ft-14a-agent-configuration-project-registry]]',
    '[[wiki/sources/ft-14b-agent-sessions]]',
    '[[wiki/sources/ft-14f-provider-auth-parity-analysis]]'
  ]
tags: [react, component, settings, agent, byok]
lang: en
---

## Description

Settings card that configures which agent runtime should be used for agent sessions. It combines auto-derived provider badges, manual provider selection for non-derived LLMs, optional manual credentials/model inputs, Copilot BYOK controls, a Codex CLI installation check, and an FT-14F Copilot connectivity probe.

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
- Marks the Claude SDK API key as optional and clarifies that local Claude Code auth/config can satisfy FT-14B when that field is blank.
- Shows a `Verifica installazione CLI` action when the effective provider is `codex-sdk`; the result banner comes from `BinaryCheckResult` returned by main-process IPC.
- Shows the Copilot preview warning and subscription/BYOK mode switch only when the effective provider is `copilot-sdk`.
- Reveals `copilotByokProvider`, `copilotByokBaseUrl`, and `copilotByokApiKey` only when BYOK mode is enabled.
- Marks the Copilot BYOK base URL as optional only for providers where BugCat can infer a safe default endpoint (`openai`, `anthropic`, `openrouter`); generic and Gemini-compatible modes require an explicit URL.
- Explains that Copilot BYOK is wired through the SDK `SessionConfig.provider` object, not through `CopilotClientOptions`.
- Shows `agentModel` for Copilot SDK as well, so the persisted session model is visible and editable instead of remaining hidden after switching from another provider such as Claude Code SDK.
- Clarifies that the Copilot model field is optional: when blank, BugCat falls back to the runner default for the selected Copilot mode/provider.
- FT-14F adds a `Verifica connessione Copilot` button that accepts unsaved draft settings through preload IPC.
- In Copilot subscription mode the test returns immediate configuration success without a network probe, because runtime auth is delegated to the SDK session startup.
- In Copilot BYOK mode the test performs a provider-aware API probe: Anthropic uses `x-api-key`, Gemini uses the query-string key pattern, and OpenAI/OpenRouter/generic use a bearer token on `/models`.

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
- [[wiki/concepts/proactive-agent-configuration-blocking]]
- [[wiki/concepts/settings-sanitization-before-save]]
- [[wiki/topics/agent-session-configuration-foundation]]
- [[wiki/topics/agent-analysis-sessions]]
