# Feature 11 — OpenRouter Provider via SDK

## Summary

Add OpenRouter as a new LLM provider using the official `@openrouter/sdk` TypeScript package, supporting structured outputs via `responseFormat` with `json_schema`.

## Implementation

### Files Created

- `src/main/llm/providers/openrouter-provider.ts` — Provider class

### Files Modified

- `src/shared/types.ts` — Added `'openrouter'` to `LLMProviderType`
- `src/main/llm/provider-factory.ts` — Factory case + import
- `src/renderer/src/components/settings/LlmProviderSection.tsx` — Dropdown, labels, placeholders
- `electron.vite.config.ts` — Added to externalizeDeps exclude list
- `package.json` — Added `@openrouter/sdk` dependency

### Tests Created

- `tests/main/openrouter-provider.spec.ts` — 16 unit tests
- `tests/main/llm-provider-factory.spec.ts` — 2 new test cases added
