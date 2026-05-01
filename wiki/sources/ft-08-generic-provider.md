---
title: 'FT-08 — GenericProvider OpenAI-Compatible e Rimozione Copilot'
type: source
created: 2026-05-01
updated: 2026-05-01
sources: []
tags: [llm, generic-provider, openai-compatible, settings, migration, validation]
lang: en
---

## Summary

FT-08 removes the GitHub Copilot SDK integration and introduces `GenericProvider`, a fetch-based adapter for any OpenAI-compatible chat-completions endpoint. The feature extends settings with `baseUrl` and `llmModel`, adds renderer and main-process URL validation, and ships a schema v2 migration that normalizes legacy Copilot settings while removing `copilotAuthStatus`.

## Files Created

| File                                         | Purpose                                        |
| -------------------------------------------- | ---------------------------------------------- |
| `src/main/llm/providers/generic-provider.ts` | OpenAI-compatible provider using raw `fetch()` |

## Files Modified

| File                                                          | Change                                                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/shared/types.ts`                                         | Replaced `github-copilot` with `generic`; added `baseUrl` and `llmModel` to settings    |
| `src/main/llm/types.ts`                                       | Added `baseUrl` to `LLMProviderConfig`                                                  |
| `src/main/llm/provider-factory.ts`                            | Replaced `CopilotProvider` case with `GenericProvider`                                  |
| `src/main/llm/llm-service.ts`                                 | Passed `baseUrl` and `llmModel` into provider creation                                  |
| `src/renderer/src/lib/validation.ts`                          | Added `validateBaseUrl`; removed Copilot-specific API key exemption                     |
| `src/renderer/src/components/settings/LlmProviderSection.tsx` | Replaced Copilot option with `Generico`; added Base URL and Model inputs                |
| `src/main/store-migration.ts`                                 | Bumped schema to v2; migrated `github-copilot` to `openai`; removed `copilotAuthStatus` |
| `src/main/ipc-handlers.ts`                                    | Simplified LLM test connection path; no Copilot auth branch                             |
| `src/renderer/src/hooks/useSettings.ts`                       | Added generic-provider fields to default settings                                       |
| `package.json`                                                | Removed `@github/copilot-sdk` dependency                                                |

## Files Deleted

| File                                         | Reason                                         |
| -------------------------------------------- | ---------------------------------------------- |
| `src/main/llm/providers/copilot-provider.ts` | Replaced by the generic OpenAI-compatible path |

## Key Takeaways

1. **Provider abstraction stayed intact** — FT-08 changes one concrete provider without affecting chunking, prompt building, or response validation.
2. **Generic is settings-driven** — users now choose `Generico` and provide `API Key`, `Base URL`, and optional `Model` directly in Settings.
3. **Validation is defense-in-depth** — the renderer rejects malformed URLs for immediate feedback, while the main process enforces HTTPS except for localhost loopback endpoints.
4. **Migration is explicit** — schema v2 rewrites stored `github-copilot` values to `openai` and strips the removed `copilotAuthStatus` key.
5. **Migration ordering was hardened** — migrated data is persisted before `schemaVersion` is bumped.
6. **The dependency surface is smaller** — removing the Copilot SDK avoids the previous session-based auth flow and its `approveAll` permission trade-off.

## Architecture

```
Settings UI (Generico)
  ├─ apiKey
  ├─ baseUrl
  └─ llmModel
        │
        ▼
useSettings / validateSettings
        │
        ▼
IPC llm:test-connection / llm:categorize
        │
        ▼
createLLMProvider('generic', { apiKey, baseUrl, model, timeout })
        │
        ▼
GenericProvider
  ├─ validate URL scheme
  ├─ POST {baseUrl}/chat/completions
  └─ map HTTP / parse failures to AppError
```

## See also

- [[wiki/entities/generic-provider]]
- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/store-migration]]
- [[wiki/entities/llm-provider-section]]
- [[wiki/entities/validation-utils]]
- [[wiki/concepts/llm-provider-abstraction]]
