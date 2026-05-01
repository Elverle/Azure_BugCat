---
title: 'FT-09 - Structured Output JSON Schema per Tutti i Provider LLM'
type: source
created: 2026-05-01
updated: 2026-05-01
sources: []
tags: [llm, structured-output, json-schema, openai, anthropic, gemini, generic, categorization]
lang: en
---

## Summary

FT-09 hardens the LLM layer by moving response-shape enforcement from prompt text into provider-native structured-output APIs. A shared schema registry now defines the JSON contract for categorization and similar-bugs flows, `LLMProvider.chat()` accepts optional schema-aware `ChatOptions`, and each concrete provider translates that logical contract into its own native request format. Prompts remain as semantic guidance, while `response-validator.ts` stays in place as a defensive safety net for malformed or incomplete outputs.

## Files Created

| File                             | Purpose                                                      |
| -------------------------------- | ------------------------------------------------------------ |
| `src/main/llm/schemas.ts`        | Shared JSON Schema definitions and `getSchema()` helper      |
| `tests/main/llm-schemas.spec.ts` | Structural tests for categorization and similar-bugs schemas |

## Files Modified

| File                                           | Change                                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/main/llm/types.ts`                        | Added `ChatOptions`, `SchemaType` export, and optional `chat(..., options)` contract          |
| `src/main/llm/providers/openai-provider.ts`    | Added `response_format.json_schema` support and standardized `temperature: 0.1`               |
| `src/main/llm/providers/anthropic-provider.ts` | Added tool-use structured output with `tools` / `tool_choice`, plus tool/text dual extraction |
| `src/main/llm/providers/gemini-provider.ts`    | Added `responseMimeType: 'application/json'` and `responseSchema` wiring                      |
| `src/main/llm/providers/generic-provider.ts`   | Added OpenAI-compatible `response_format` support and standardized temperature                |
| `src/main/llm/llm-service.ts`                  | Forwarded `ChatOptions` from retry layer and passed `responseSchema: 'categorization'`        |
| `src/main/llm/prompts.ts`                      | Reduced output-format instructions to guidance instead of full enforcement                    |
| `src/main/llm/index.ts`                        | Re-exported schemas and new types                                                             |
| `tests/main/llm-prompts.spec.ts`               | Updated prompt assertions after prompt simplification                                         |
| `tests/main/llm-service.spec.ts`               | Added assertion that `chat()` receives `responseSchema`                                       |

## Key Takeaways

1. **Single logical schema contract** - `SchemaType` abstracts output intent (`categorization`, `similar-bugs`) away from vendor APIs.
2. **Provider-native enforcement** - OpenAI/Generic use `response_format`, Anthropic uses tool input schemas, Gemini uses `responseSchema` and JSON MIME type.
3. **Prompt simplification** - Prompts still describe the task and desired output, but they no longer carry the full burden of structural enforcement.
4. **Validator remains necessary** - Runtime validation still covers ignored schemas, partial payloads, empty responses, and provider quirks.
5. **Determinism tightened** - All providers now run at `temperature: 0.1` for more stable categorization output.

## Architecture Delta

```text
llm-service.ts
  -> chatWithRetry(provider, systemPrompt, userMessage, { responseSchema: 'categorization' })
      -> provider.chat(..., options)
          -> getSchema(options.responseSchema)
          -> provider-native structured output request
          -> raw JSON string response
      -> validateLLMResponse(raw, chunk)
```

## Validation Surface

- `tests/main/llm-schemas.spec.ts` checks schema shape and `getSchema()` dispatch.
- `tests/main/llm-service.spec.ts` verifies schema-aware options are forwarded to the provider.
- `tests/main/llm-prompts.spec.ts` tracks the lighter prompt wording after API-level enforcement.

## See also

- [[wiki/entities/llm-schemas]]
- [[wiki/entities/llm-provider-interface]]
- [[wiki/entities/llm-service]]
- [[wiki/concepts/provider-native-structured-output]]
- [[wiki/topics/llm-categorization-pipeline]]
