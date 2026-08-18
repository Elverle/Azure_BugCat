---
title: 'Sentinel Value / Label Separation'
type: concept
created: 2026-08-18
updated: 2026-08-18
sources: []
tags: [i18n, categorization, error-handling, migration, design-pattern]
lang: en
---

## Definition

Every "no real value" state the app can be in — a bug the LLM never categorized, a chunk that failed, an error dialog title — is represented internally by a **machine value**: an ASCII constant such as `__uncategorized__`, or an `ErrorCode` string such as `LLM_PARSE_ERROR`. The main process and every persisted store only ever see machine values. Turning a machine value into text a user reads is a single, total, renderer-only step.

## How It Works in This Project

- [[wiki/entities/categorization-sentinels]] (`src/shared/categorization.ts`) defines the six categorization sentinels, all shaped `__name__`: `UNCATEGORIZED`, `PROCESSING_ERROR`, `NO_LLM_RESPONSE`, `NOT_AVAILABLE`, `PARSE_ERROR`, `UNASSIGNED`. The `__name__` shape is deliberate — it cannot collide with a category a user types into Settings, and a code path that forgets the label layer renders the literal sentinel on screen instead of failing silently or showing a misleadingly plausible string.
- [[wiki/entities/labels-utility]] (`src/renderer/src/lib/labels.ts`) is the only place that maps machine values to text, through two functions:
  - `sentinelLabel(value)` — total: any value that is not one of the six sentinels (a user category, a technical layer, the model's free-form reason) comes back untouched, so call sites never need to ask "is this a sentinel?" first.
  - `errorLabel(code)` — typed `Record<ErrorCode, string>`, so adding an error code without giving it a title is a compile error. Error dialogs take their title from the code and keep the main-process message as diagnostic detail underneath.
- The main process never imports `labels.ts`. `response-validator.ts`, `llm-service.ts`, and `similarity-service.ts` write and compare sentinel constants directly and never resolve them to text — only the renderer does that translation, at the point where a value actually reaches the screen.
- `isFailedCategorization(macroCategory)` in the same shared module is the single predicate for "this categorization did not really happen." `llm-service.ts`'s `applyCategorization()` uses it to leave `categorizedAt: ''` on a failed bug instead of stamping a timestamp — which is what keeps a chunk failure retry-eligible on the next categorization run rather than persisting the fallback as a permanent result.

### Migration extension (schema v4)

[[wiki/concepts/schema-versioned-store-migration]] describes the general versioned-migration pipeline; schema v4 extends it with a one-time conversion of previously-persisted Italian sentinel text into the new machine values, on three surfaces: session bugs, catalog entries, and the category names inside persisted similarity results (`src/main/store-migration.ts`, `SENTINEL_CONVERSIONS`). The conversion table is keyed by field (`macroCategory`, `technicalLayer`, `categoryReason`) and matches **exact strings only** — `'Non categorizzato'` -> `UNCATEGORIZED`, `'Errore elaborazione'` -> `PROCESSING_ERROR`, `'Nessuna risposta LLM'` -> `NO_LLM_RESPONSE`, `'Errore parsing'` -> `PARSE_ERROR`, `'Non determinabile'` -> `'Undetermined'`, `'N/D'` (in `categoryReason`) -> `NOT_AVAILABLE`. Exact-match-only is what lets a user category or a model's free-form reason survive untouched, and an empty technical layer keeps meaning "not categorized yet" rather than being coerced into a sentinel.

**Known limitation, recorded rather than fixed:** `macroCategory` could independently hold the literal string `'N/D'` in a pre-migration store — it is `getStringField()`'s fallback in `response-validator.ts` for a present-but-blank `macroCategory` field, back when that fallback constant held Italian text. The v4 migration deliberately does **not** convert `'N/D'` in `macroCategory`, because in already-persisted data it is indistinguishable from a user category literally named `N/D`; converting it would risk relabeling someone's real category as `NOT_AVAILABLE`. The cost is cosmetic: such a bug displays `N/D` instead of `N/A` until it is re-categorized. See [[wiki/entities/response-validator]] and [[wiki/entities/store-migration]].

### Test guard

`tests/repo/no-italian-strings.spec.ts` scans every `.ts`/`.tsx` file under `src/` for Italian markers and fails the suite if one appears outside an explicit allow-list. The allow-list exists for two legitimate reasons that are not violations of this pattern: the categorization prompt's few-shot examples intentionally show the model Italian input, and the v4 migration's `SENTINEL_CONVERSIONS` table has to keep the Italian strings as literal object keys forever, because a migration describes a historical state of the data and cannot be translated after the fact.

## Why It Matters Here

- The product's own domain data — a user's categories, a model's free-text reasoning — is unconstrained user-facing text. Machine values need a shape that provably cannot collide with it, and `__name__` is that shape.
- Centralizing the mapping in one renderer file is what makes a future localization pass, or a wording change, a one-file edit instead of a search-and-replace across every component and every persisted record.
- Keeping the main process ignorant of labels keeps persistence and orchestration free of presentation concerns — the same separation [[wiki/concepts/schema-versioned-store-migration]] already relies on when it decides what a "legacy" value looks like.

## Trade-offs

| Advantage                                                        | Disadvantage                                                                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| A forgotten label call fails visibly (`__uncategorized__` on screen) instead of silently | Every new sentinel needs a matching entry in `labels.ts`, with no compiler enforcement (unlike `errorLabel`'s `Record<ErrorCode, string>`) |
| `errorLabel()` is exhaustive by construction, so a missing title is a build failure | `sentinelLabel()` is not exhaustive by construction — a missing sentinel just falls through as "not a sentinel" and renders raw |
| Persisted data stays machine-readable and stable across UI wording changes | The v4 migration can only convert what it can recognize with certainty, so some pre-existing ambiguity (`'N/D'` in `macroCategory`) has to be accepted rather than resolved |

## See also

- [[wiki/entities/categorization-sentinels]]
- [[wiki/entities/labels-utility]]
- [[wiki/entities/response-validator]]
- [[wiki/entities/llm-service]]
- [[wiki/entities/store-migration]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/topics/llm-categorization-pipeline]]
