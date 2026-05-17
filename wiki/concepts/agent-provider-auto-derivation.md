---
title: 'Agent Provider Auto-Derivation'
type: concept
created: 2026-05-17
updated: 2026-05-17
sources: ['[[wiki/sources/ft-14a-agent-configuration-project-registry]]']
tags: [settings, agent, llm, pattern, derivation]
lang: en
---

## Definition

FT-14A introduces a hybrid selection model where some agent providers are derived automatically from the currently selected LLM provider, while other LLM providers still expose a manual agent-provider choice.

## Mapping

| `llmProvider` | Effective `agentProvider` | UI Mode |
| ------------- | ------------------------- | ------- |
| `anthropic`   | `claude-sdk`              | Auto    |
| `openai`      | `codex-sdk`               | Auto    |
| `gemini`      | user-selected             | Manual  |
| `generic`     | user-selected             | Manual  |
| `openrouter`  | user-selected             | Manual  |

## How It Works in This Project

- [[wiki/entities/use-settings-hook]] watches `settings.llmProvider` in a `useEffect`.
- The effect is guarded by `initialLoadDone` so persisted settings are not immediately rewritten during initial hydration.
- When the user switches to `anthropic` or `openai`, the hook writes the corresponding derived `agentProvider` back into state.
- [[wiki/entities/agent-provider-section]] renders a badge instead of a dropdown when the provider is derived.
- Validation logic treats derived `claude-sdk` and `codex-sdk` as non-manual, so `agentApiKey` is not required in those auto-derived cases.

## Why It Matters Here

- The UI reuses operator intent already expressed through the LLM provider instead of making them repeat a second aligned choice.
- The resulting `agentProvider` is still persisted in settings, so future flows do not need to recompute it from scratch.
- The model leaves room for provider combinations that have no automatic mapping yet, such as Copilot SDK over non-OpenAI/non-Anthropic LLM selections.

## Trade-offs

- **Pro:** Fewer redundant choices when the agent runtime naturally follows the LLM provider.
- **Pro:** The derived value still lands in persisted state, which keeps later layers simple.
- **Con:** Changing `llmProvider` can overwrite a previously chosen manual `agentProvider` when the new LLM is one of the auto-derived providers.

## See also

- [[wiki/entities/agent-provider-section]]
- [[wiki/entities/use-settings-hook]]
- [[wiki/concepts/settings-sanitization-before-save]]
- [[wiki/topics/agent-session-configuration-foundation]]
