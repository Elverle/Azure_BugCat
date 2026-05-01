## Spec-Planner — Iteration 1

### Feature Context

- **Feature:** Structured Output for LLM Providers
- **Feature #:** feature-9
- **Feature Type:** backend

---

## Part 1: Requirements

### Functional Requirements

#### Structured Output Schema Definition

- **FR-SCHEMA-001:** Define a shared JSON Schema for bug categorization output
  - Description: Create a reusable JSON Schema object describing `{ results: [{ bugId: number, macroCategory: string, subCategory: string, categoryReason: string }] }` that can be consumed by all providers in their respective formats.
  - Acceptance Criteria: Given the schema module is imported, When a provider accesses the categorization schema, Then it receives a valid JSON Schema draft-compatible object with required fields, types, and `additionalProperties: false`.
  - Priority: Must-Have

- **FR-SCHEMA-002:** Define a shared JSON Schema for similar-bugs output
  - Description: Create a reusable JSON Schema object describing `{ groups: [{ similarityScore: number, reason: string, bugIds: number[] }] }` for the similar-bugs detection feature.
  - Acceptance Criteria: Given the schema module is imported, When a provider accesses the similar-bugs schema, Then it receives a valid JSON Schema with the groups array structure.
  - Priority: Must-Have

#### Provider-Specific Structured Output

- **FR-OPENAI-001:** OpenAI provider uses `response_format` with `json_schema`
  - Description: The OpenAI provider must pass `response_format: { type: "json_schema", json_schema: { name: "bug_categorization", strict: true, schema: {...} } }` in the API call for categorization, and an equivalent schema for similar-bugs.
  - Acceptance Criteria: Given a categorization request to OpenAI, When the API call is made, Then the request body includes the `response_format` field with the correct JSON Schema and `strict: true`.
  - Priority: Must-Have

- **FR-GEMINI-001:** Gemini provider uses `generationConfig` with `responseSchema`
  - Description: The Gemini provider must pass `responseMimeType: "application/json"` and `responseSchema: {...}` in the config for structured output.
  - Acceptance Criteria: Given a categorization request to Gemini, When the API call is made, Then the config includes `responseMimeType` and `responseSchema` fields.
  - Priority: Must-Have

- **FR-ANTHROPIC-001:** Anthropic provider uses tool-use pattern for structured output
  - Description: The Anthropic provider must use a `tools` array with a single tool definition whose `input_schema` contains the JSON Schema, plus `tool_choice: { type: "tool", name: "salva_risultati_triage" }` to force structured output.
  - Acceptance Criteria: Given a categorization request to Anthropic, When the API call is made, Then the request includes a tool definition and tool_choice forcing structured output. The response is extracted from `tool_use` content blocks.
  - Priority: Must-Have

- **FR-GENERIC-001:** Generic provider uses `response_format` (OpenAI-compatible)
  - Description: The Generic provider must pass `response_format: { type: "json_schema", json_schema: {...} }` in the fetch body, matching the OpenAI-compatible format.
  - Acceptance Criteria: Given a categorization request to the generic provider, When the fetch call is made, Then the request body JSON includes `response_format` with the schema.
  - Priority: Must-Have

#### Interface Evolution

- **FR-IFACE-001:** Extend `LLMProvider.chat()` to accept an optional schema parameter
  - Description: The `chat` method signature must support an optional `options` parameter that includes a `responseSchema` field. Providers that support structured output will use it; others can ignore it gracefully.
  - Acceptance Criteria: Given a call to `provider.chat(systemPrompt, userMessage, { responseSchema })`, When the provider supports structured output, Then it includes the schema in the API request. When the provider does not support it (or the option is omitted), Then it falls back to prompt-only JSON.
  - Priority: Must-Have

- **FR-IFACE-002:** Define a `ChatOptions` type with schema identifier
  - Description: Create a `ChatOptions` interface with a `responseSchema` field that is a discriminated union or enum identifying which schema to use (e.g., `'categorization' | 'similar-bugs'`), so providers can map it to their native format internally.
  - Acceptance Criteria: Given the ChatOptions type is defined, When it is used in the chat signature, Then TypeScript correctly types the optional options parameter.
  - Priority: Must-Have

#### Prompt Simplification

- **FR-PROMPT-001:** Simplify the output format section in `buildSystemPrompt`
  - Description: The "Output format" / "Schema:" section in the system prompt should be kept but simplified as a secondary reinforcement (since the structured output now enforces the shape). The prompt should still instruct "Return ONLY valid JSON" as a safety net.
  - Acceptance Criteria: Given the updated prompt, When the LLM reads it, Then the format instructions are present but more concise. The functional categorization logic remains unchanged.
  - Priority: Should-Have

- **FR-PROMPT-002:** Simplify the output format section in `buildSimilarBugsSystemPrompt`
  - Description: Same simplification for the similar-bugs prompt.
  - Acceptance Criteria: Given the updated similar-bugs prompt, When the LLM reads it, Then it still describes the expected schema shape as guidance but relies on structured output for enforcement.
  - Priority: Should-Have

#### Service Integration

- **FR-SERVICE-001:** `categorizeBugs` passes schema option to `chat()` calls
  - Description: The LLM service must pass `{ responseSchema: 'categorization' }` when calling `provider.chat()` for bug categorization.
  - Acceptance Criteria: Given a categorization flow, When the service calls the provider, Then the options include the categorization schema identifier.
  - Priority: Must-Have

- **FR-SERVICE-002:** Similar-bugs flow passes schema option to `chat()` calls
  - Description: Any code that calls the provider for similar-bugs detection must pass `{ responseSchema: 'similar-bugs' }`.
  - Acceptance Criteria: Given a similar-bugs flow, When the service calls the provider, Then the options include the similar-bugs schema identifier.
  - Priority: Must-Have

#### Response Extraction

- **FR-EXTRACT-001:** Anthropic response extraction from tool_use blocks
  - Description: When Anthropic returns structured output via tool_use, the provider must extract the JSON from `content[].input` of the `tool_use` block (not from `text` blocks).
  - Acceptance Criteria: Given an Anthropic response with a tool_use block, When the provider processes it, Then it returns the stringified JSON from the tool_use input.
  - Priority: Must-Have

### Non-Functional Requirements

- **NFR-TEMP-001:** Temperature MUST be set to 0.1 for ALL providers
  - Currently: OpenAI=0.2, Anthropic=unset, Gemini=unset, Generic=0.1
  - All must be standardized to 0.1.

- **NFR-COMPAT-001:** Backward compatibility / graceful fallback
  - If a provider fails to use structured output (e.g., API version mismatch, unsupported model), the system must fall back to prompt-only JSON and rely on the response-validator.

- **NFR-VALIDATOR-001:** Response validator remains as safety net
  - The existing `validateLLMResponse` function continues to parse and validate the raw string from providers. It handles edge cases like markdown fences, extra text, etc.

- **NFR-PERF-001:** No additional API calls introduced
  - Structured output adds parameters to existing calls, not extra round-trips.

- **NFR-TEST-001:** All existing tests must pass or be updated
  - Test updates should reflect new behavior (temperature changes, schema parameters).

### Constraints

- The `LLMProvider` interface change must be backward-compatible (optional parameter)
- Only backend (`src/main/`) is affected; no renderer changes
- Each provider SDK has different syntax for structured output — no one-size-fits-all abstraction at the API call level
- The `testConnection()` method does NOT need structured output (simple test)
- Anthropic tool-use pattern requires extracting from `tool_use` blocks rather than `text` blocks

### Assumptions

- OpenAI SDK supports `response_format` with `json_schema` (available since GPT-4o / late 2024)
- `@google/genai` SDK supports `responseSchema` in `generationConfig`
- `@anthropic-ai/sdk` supports `tools` and `tool_choice` for forced structured output
- Generic (OpenAI-compatible) endpoints support `response_format` parameter
- The similar-bugs feature is called from the same service layer pattern (provider.chat)

### Out of Scope

- Renderer/UI changes
- New provider implementations
- Changes to the chunking logic
- Changes to how errors are surfaced to the user
- Prompt content changes beyond output-format simplification
- Migration of the copilot-provider (already deprecated)

### Edge Cases

| Scenario                                             | Expected Behavior                                                 | Related Requirement            |
| ---------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------ |
| Provider model doesn't support structured output     | Falls back to prompt-only; response-validator parses output       | NFR-COMPAT-001                 |
| Anthropic returns text block instead of tool_use     | Provider falls back to text extraction (current behavior)         | FR-EXTRACT-001, NFR-COMPAT-001 |
| Generic endpoint ignores response_format             | Response-validator handles raw JSON in text                       | NFR-COMPAT-001                 |
| Schema mismatch (LLM returns extra fields)           | response-validator strips unknown fields, validates required ones | NFR-VALIDATOR-001              |
| Empty tool_use input from Anthropic                  | Treated as empty response → LLM_PARSE_ERROR                       | FR-EXTRACT-001                 |
| chat() called without options (e.g., testConnection) | Provider uses default behavior, no schema enforcement             | FR-IFACE-001                   |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 12
- **Parallelizable:** 8 (67%)
- **Execution Waves:** 4

### Execution Waves

#### Wave 1 — Foundation (Schema + Interface)

**Execution:** PARALLEL

| Task ID | Type      | Title                                         | Description                                                                 | Files                           | Depends On | Complexity |
| ------- | --------- | --------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------- | ---------- | ---------- |
| T-001   | IMPLEMENT | Create JSON Schema definitions module         | Define categorization and similar-bugs JSON Schemas as TypeScript constants | `src/main/llm/schemas.ts` (new) | None       | S          |
| T-002   | IMPLEMENT | Extend LLMProvider interface with ChatOptions | Add optional `ChatOptions` parameter to `chat()` method                     | `src/main/llm/types.ts`         | None       | S          |

#### Wave 2 — Provider Implementations

**Execution:** PARALLEL

| Task ID | Type      | Title                                | Description                                                                         | Files                                          | Depends On   | Complexity |
| ------- | --------- | ------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------- | ------------ | ---------- |
| T-003   | IMPLEMENT | OpenAI provider structured output    | Add response_format with json_schema, set temperature to 0.1                        | `src/main/llm/providers/openai-provider.ts`    | T-001, T-002 | M          |
| T-004   | IMPLEMENT | Anthropic provider structured output | Add tools/tool_choice pattern, extract from tool_use blocks, set temperature to 0.1 | `src/main/llm/providers/anthropic-provider.ts` | T-001, T-002 | L          |
| T-005   | IMPLEMENT | Gemini provider structured output    | Add responseMimeType + responseSchema in config, set temperature to 0.1             | `src/main/llm/providers/gemini-provider.ts`    | T-001, T-002 | M          |
| T-006   | IMPLEMENT | Generic provider structured output   | Add response_format to fetch body (temperature already 0.1)                         | `src/main/llm/providers/generic-provider.ts`   | T-001, T-002 | S          |

#### Wave 3 — Service Integration + Prompt Updates

**Execution:** PARALLEL

| Task ID | Type      | Title                                     | Description                                                    | Files                         | Depends On   | Complexity |
| ------- | --------- | ----------------------------------------- | -------------------------------------------------------------- | ----------------------------- | ------------ | ---------- |
| T-007   | IMPLEMENT | Update LLM service to pass schema options | Pass ChatOptions with responseSchema to provider.chat() calls  | `src/main/llm/llm-service.ts` | T-002        | S          |
| T-008   | REFACTOR  | Simplify prompt output-format sections    | Keep format instructions but make them secondary reinforcement | `src/main/llm/prompts.ts`     | None         | S          |
| T-009   | IMPLEMENT | Update module exports                     | Export new schemas and ChatOptions from index                  | `src/main/llm/index.ts`       | T-001, T-002 | S          |

#### Wave 4 — Tests

**Execution:** PARALLEL

| Task ID | Type | Title                   | Description                                                  | Files                                                                       | Depends On  | Complexity |
| ------- | ---- | ----------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- | ----------- | ---------- |
| T-010   | TEST | Test schema definitions | Validate schema structure, required fields, types            | `tests/main/llm-schemas.spec.ts` (new)                                      | T-001       | S          |
| T-011   | TEST | Update provider tests   | Update mocks to verify structured output params, temperature | `tests/main/llm-provider-factory.spec.ts`, `tests/main/llm-service.spec.ts` | T-003–T-007 | M          |
| T-012   | TEST | Update prompt tests     | Verify simplified prompt still contains key instructions     | `tests/main/llm-prompts.spec.ts`                                            | T-008       | S          |

### Critical Path

T-001 → T-003 → T-007 → T-011 (critical path: 4 tasks)

### Task Details

#### T-001: Create JSON Schema definitions module

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Create `src/main/llm/schemas.ts`
  2. Export `CATEGORIZATION_SCHEMA` — a JSON Schema object with `type: "object"`, `properties: { results: { type: "array", items: { type: "object", properties: { bugId: { type: "number" }, macroCategory: { type: "string" }, subCategory: { type: "string" }, categoryReason: { type: "string" } }, required: [...], additionalProperties: false } } }`, `required: ["results"]`, `additionalProperties: false`
  3. Export `SIMILAR_BUGS_SCHEMA` — a JSON Schema object for `{ groups: [{ similarityScore, reason, bugIds }] }`
  4. Export a `SchemaType = 'categorization' | 'similar-bugs'` discriminator
  5. Export a `getSchema(type: SchemaType)` helper that returns the appropriate schema object
- **Acceptance Criteria:** Module exports both schemas as frozen objects; schemas are valid JSON Schema draft-07 compatible.
- **Testing Approach:** Post-implementation (T-010)
- **Output:** `src/main/llm/schemas.ts`

#### T-002: Extend LLMProvider interface with ChatOptions

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. In `src/main/llm/types.ts`, add:
     ```typescript
     export type SchemaType = 'categorization' | 'similar-bugs'
     export interface ChatOptions {
       responseSchema?: SchemaType
     }
     ```
  2. Update `LLMProvider.chat` signature to:
     ```typescript
     chat(systemPrompt: string, userMessage: string, options?: ChatOptions): Promise<string>
     ```
- **Acceptance Criteria:** Interface compiles; existing implementations still satisfy the interface (optional param).
- **Testing Approach:** Compilation check; existing tests pass without modification at this step.
- **Output:** Modified `src/main/llm/types.ts`

#### T-003: OpenAI provider structured output

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Import `getSchema` and `ChatOptions` from the schemas/types modules
  2. Update `chat()` signature to accept `options?: ChatOptions`
  3. Change `temperature: 0.2` → `temperature: 0.1`
  4. When `options?.responseSchema` is provided, add to the create params:
     ```typescript
     response_format: {
       type: "json_schema",
       json_schema: {
         name: options.responseSchema === 'categorization' ? 'bug_categorization' : 'similar_bugs_detection',
         strict: true,
         schema: getSchema(options.responseSchema)
       }
     }
     ```
  5. If `options?.responseSchema` is undefined (e.g., testConnection), omit `response_format`
- **Acceptance Criteria:** API call includes response_format when schema provided; temperature is 0.1; testConnection still works without schema.
- **Testing Approach:** Unit test with mocked OpenAI client.
- **Output:** Modified `src/main/llm/providers/openai-provider.ts`

#### T-004: Anthropic provider structured output

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Import `getSchema` and `ChatOptions`
  2. Update `chat()` signature to accept `options?: ChatOptions`
  3. Add `temperature: 0.1` to the create params
  4. When `options?.responseSchema` is provided, add to create params:
     ```typescript
     tools: [{
       name: options.responseSchema === 'categorization' ? 'salva_risultati_triage' : 'salva_bug_simili',
       description: '...',
       input_schema: getSchema(options.responseSchema)
     }],
     tool_choice: { type: "tool", name: "salva_risultati_triage" | "salva_bug_simili" }
     ```
  5. Update response extraction: check for `tool_use` content block first; if found, return `JSON.stringify(block.input)`; else fall back to text block extraction (backward compat).
- **Acceptance Criteria:** API call includes tools/tool_choice when schema provided; response correctly extracted from tool_use; temperature 0.1; fallback to text works.
- **Testing Approach:** Unit test with mocked Anthropic client.
- **Output:** Modified `src/main/llm/providers/anthropic-provider.ts`

#### T-005: Gemini provider structured output

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Import `getSchema` and `ChatOptions`
  2. Update `chat()` signature to accept `options?: ChatOptions`
  3. When `options?.responseSchema` is provided, add to config:
     ```typescript
     config: {
       systemInstruction: systemPrompt,
       abortSignal: controller.signal,
       temperature: 0.1,
       responseMimeType: "application/json",
       responseSchema: getSchema(options.responseSchema)
     }
     ```
  4. When no schema, still add `temperature: 0.1` to config
- **Acceptance Criteria:** API call includes responseMimeType and responseSchema when schema provided; temperature is 0.1 always.
- **Testing Approach:** Unit test with mocked Gemini client.
- **Output:** Modified `src/main/llm/providers/gemini-provider.ts`

#### T-006: Generic provider structured output

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Import `getSchema` and `ChatOptions`
  2. Update `chat()` signature to accept `options?: ChatOptions`
  3. When `options?.responseSchema` is provided, add to fetch body:
     ```typescript
     response_format: {
       type: "json_schema",
       json_schema: {
         name: '...',
         strict: true,
         schema: getSchema(options.responseSchema)
       }
     }
     ```
  4. Temperature already 0.1 — no change needed
- **Acceptance Criteria:** Fetch body includes response_format when schema provided; temperature unchanged at 0.1.
- **Testing Approach:** Unit test verifying fetch body content.
- **Output:** Modified `src/main/llm/providers/generic-provider.ts`

#### T-007: Update LLM service to pass schema options

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. In `categorizeBugs()`, change:
     ```typescript
     const raw = await chatWithRetry(provider, systemPrompt, userMessage)
     ```
     to:
     ```typescript
     const raw = await chatWithRetry(provider, systemPrompt, userMessage, {
       responseSchema: 'categorization'
     })
     ```
  2. Update `chatWithRetry` signature to pass options through to `provider.chat()`
  3. If a similar-bugs service function exists or is added, pass `{ responseSchema: 'similar-bugs' }`
- **Acceptance Criteria:** Service passes correct schema option for each flow type; chatWithRetry forwards options.
- **Testing Approach:** Update llm-service.spec.ts mock expectations.
- **Output:** Modified `src/main/llm/llm-service.ts`

#### T-008: Simplify prompt output-format sections

- **Type:** REFACTOR
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. In `buildSystemPrompt()`, simplify the "Output format" lines:
     - Keep "Return ONLY valid JSON, no markdown fences, no preamble, no explanation outside the JSON."
     - Keep "Return exactly one result for each input bug."
     - Simplify "Schema:" line to a brief reminder: "Each result must have: bugId, macroCategory, subCategory, categoryReason."
  2. In `buildSimilarBugsSystemPrompt()`, similarly simplify the "Output Format" section
  3. Do NOT change the categorization logic, examples, or rules
- **Acceptance Criteria:** Prompts still instruct JSON-only output; schema shape mentioned but not as the sole enforcement mechanism.
- **Testing Approach:** Update prompt tests for new text.
- **Output:** Modified `src/main/llm/prompts.ts`

#### T-009: Update module exports

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. In `src/main/llm/index.ts`, add export for schemas:
     ```typescript
     export { CATEGORIZATION_SCHEMA, SIMILAR_BUGS_SCHEMA, getSchema } from './schemas'
     ```
  2. Export `ChatOptions` and `SchemaType` from types re-export line
- **Acceptance Criteria:** All new public APIs are accessible from `src/main/llm`.
- **Testing Approach:** Compilation check.
- **Output:** Modified `src/main/llm/index.ts`

#### T-010: Test schema definitions

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Create `tests/main/llm-schemas.spec.ts`
  2. Test that `CATEGORIZATION_SCHEMA` has correct structure (required fields, types, no additional properties)
  3. Test that `SIMILAR_BUGS_SCHEMA` has correct structure
  4. Test `getSchema('categorization')` and `getSchema('similar-bugs')` return correct schemas
- **Acceptance Criteria:** All schema structure assertions pass.
- **Testing Approach:** Direct assertion tests.
- **Output:** `tests/main/llm-schemas.spec.ts` (new)

#### T-011: Update provider and service tests

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Update `llm-service.spec.ts` to verify `chat()` is called with options parameter
  2. Update `llm-provider-factory.spec.ts` if it tests chat calls
  3. Add/update provider unit tests to verify:
     - OpenAI: response_format included, temperature 0.1
     - Anthropic: tools/tool_choice included, response extracted from tool_use, temperature 0.1
     - Gemini: responseSchema in config, temperature 0.1
     - Generic: response_format in fetch body
  4. Verify testConnection() still works without schema options
- **Acceptance Criteria:** All provider tests pass with new behavior; no regressions.
- **Testing Approach:** Mock-based unit tests.
- **Output:** Modified test files

#### T-012: Update prompt tests

- **Type:** TEST
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Update `tests/main/llm-prompts.spec.ts` assertions for simplified output format text
  2. Ensure tests still verify that JSON-output instruction is present
  3. Ensure tests still verify categorization logic instructions are unchanged
- **Acceptance Criteria:** Prompt tests pass with updated text expectations.
- **Testing Approach:** String assertion updates.
- **Output:** Modified `tests/main/llm-prompts.spec.ts`

### Risk Register

| Risk                                                                     | Impact                                                     | Likelihood | Mitigation                                                                                            |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| OpenAI SDK version doesn't support `response_format.json_schema`         | High — structured output won't work for most-used provider | Low        | Check SDK version; fall back to `response_format: { type: "json_object" }` if json_schema unsupported |
| Gemini SDK `responseSchema` API mismatch                                 | Medium — Gemini structured output fails                    | Medium     | Verify `@google/genai` SDK docs; wrap in try/catch with fallback                                      |
| Anthropic tool_use changes response shape unexpectedly                   | Medium — parsing breaks                                    | Low        | Dual extraction: check tool_use first, fall back to text block                                        |
| Generic endpoints don't support response_format                          | Low — already works without it                             | Medium     | Schema is additive; response-validator handles raw JSON                                               |
| Temperature change from 0.2→0.1 on OpenAI changes categorization quality | Low — minimal difference                                   | Low        | Monitor outputs; temperature is easily adjustable                                                     |
| Prompt simplification causes regression in edge-case categorization      | Medium                                                     | Low        | Keep key instructions; structured output + validator provides safety                                  |

---

### Completeness Assessment

- Functional coverage: **High** — all providers covered, both schema types addressed
- Non-functional coverage: **High** — temperature, backward compat, validator safety net
- Task-to-requirement mapping: **Complete** — every FR maps to at least one task

### Status

**READY FOR APPROVAL**

---

## Questions for User

1. **Similar-bugs invocation:** The `buildSimilarBugsSystemPrompt` is exported but I don't see it called from `llm-service.ts`. Is there a separate service function for similar-bugs detection, or is it called directly from `ipc-handlers.ts`? This affects where to pass `{ responseSchema: 'similar-bugs' }`.

2. **Anthropic tool names:** You specified `"salva_risultati_triage"` for categorization. Should the similar-bugs tool be named `"salva_bug_simili"` or do you have a preferred name?

3. **Fallback behavior:** If structured output fails (e.g., model doesn't support it), should the provider retry without structured output, or just let the response-validator handle whatever text comes back?
