---
title: 'Analysis: Cancellable categorization flow'
type: analysis
created: 2026-05-03
updated: 2026-08-20
sources:
  [
    '[[wiki/sources/ft-04-llm-provider]]',
    '[[wiki/sources/ft-05-dashboard]]',
    '[[wiki/sources/ft-11-openrouter-provider]]',
    '[[wiki/sources/ft-12-incremental-session-cache]]'
  ]
tags: [analysis, llm, dashboard, ipc, cancellation, abort-controller, catalog]
lang: en
---

## Problem

The `Categorize` action could take several minutes for slower models, but the product had no way to stop the run once the renderer invoked `llm:categorize`. The only available behavior was to wait for completion or for a provider-level timeout.

## Root Cause

The categorization workflow was implemented as a single long-lived IPC invoke with no cancellation contract:

- the renderer exposed only `categorizeBugs()` plus progress subscription,
- the main process did not keep any per-request `AbortController`,
- `llm-service` and the provider adapters had timeout-aware abort handling but no user-provided `AbortSignal`,
- dashboard UI state reused generic `loading` semantics, so there was no dedicated in-progress categorization state to drive a cancel control.

## Solution

The follow-up change makes categorization abort-aware end to end. At the time of this change persistence was kept all-or-nothing; FT-12 later replaced that with chunk-by-chunk persistence — see the note under Product Behavior below.

- [[wiki/entities/ipc-channels]] adds `llm:categorize-cancel`.
- [[wiki/entities/preload-bridge]] exposes `cancelCategorization()` to the renderer.
- [[wiki/entities/ipc-handlers]] now keeps one `AbortController` per `webContents` while categorization is running and aborts it on cancel.
- [[wiki/entities/llm-provider-interface]] extends `ChatOptions` with `signal?: AbortSignal`.
- [[wiki/entities/provider-shared-utilities]] merges provider timeout handling with an optional external signal and exposes `didTimeout()` so adapters can distinguish user cancellation from a real timeout.
- [[wiki/entities/llm-service]] propagates the signal through `chatWithRetry()`, stops before the next chunk when cancellation is requested, and throws `OPERATION_CANCELLED` instead of normalizing everything to `LLM_TIMEOUT`.
- [[wiki/entities/use-dashboard-hook]] splits `isCategorizing` from generic page `loading`, exposes `cancelCategorization()`, and suppresses the blocking error modal for intentional cancellation.
- [[wiki/entities/dashboard-header]] swaps the primary action from `Categorize` to `Cancel` only while categorization is active.

## Product Behavior

- Progress still arrives through `llm:categorize-progress` for completed chunks.
- If the user presses `Cancel`, the current provider request is aborted as soon as the transport supports it.
- The run ends with `OPERATION_CANCELLED`, not `LLM_TIMEOUT`.
- The dashboard returns to its normal state without showing the blocking categorization error dialog.

> **Superseded by FT-12 (2026-05-13):** at the time this analysis was written, no partial categorization was written to `SessionData` — persistence happened only after a fully successful run, all-or-nothing. FT-12's incremental session cache changed this: `llm:categorize` now defines a `persistChunk()` callback (`src/main/ipc-handlers.ts`) that runs on every `llm:categorize-progress` event and merges the just-completed chunk into both `session` and `bugCatalog` through [[wiki/entities/catalog-merge-utility|`mergeCategorization()`]] immediately, not at the end of the run. A cancel therefore no longer discards completed work: every chunk that finished before the cancel signal was honored is persisted, and only the bugs in the chunk that was in flight (or not yet started) remain uncategorized. This was a deliberate trade — see the code comment on `persistChunk` — so a run that later dies (timeout, rate limit, or user cancel) does not make the user pay LLM tokens twice for chunks that already succeeded. The all-or-nothing framing above described the product correctly for FT-04/FT-05/FT-11-era categorization; it no longer does once FT-12 shipped.

## Verification

The change was validated with focused tests and a production build:

- `tests/main/llm-service.spec.ts` verifies that cancellation stops the workflow before the next chunk.
- `tests/main/ipc-handlers.spec.ts` verifies that cancel aborts an active run and does not persist partial results.
- `tests/renderer/DashboardPage.spec.tsx` verifies that the cancel button appears only while categorization is running and that cancellation is silent in the UI.
- `npm run build` completed successfully after the wiki-triggering code changes.

## Components Involved

- [[wiki/entities/ipc-channels]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/shared-types]]
- [[wiki/entities/llm-provider-interface]]
- [[wiki/entities/provider-shared-utilities]]
- [[wiki/entities/llm-service]]
- [[wiki/entities/openai-provider]]
- [[wiki/entities/anthropic-provider]]
- [[wiki/entities/gemini-provider]]
- [[wiki/entities/generic-provider]]
- [[wiki/entities/openrouter-provider]]
- [[wiki/entities/use-dashboard-hook]]
- [[wiki/entities/dashboard-header]]
- [[wiki/entities/dashboard-page]]
- [[wiki/topics/llm-categorization-pipeline]]
- [[wiki/topics/dashboard-bug-exploration]]

## See also

- [[wiki/analyses/llm-provider-cleanup]]
- [[wiki/analyses/structured-output-routing-mismatch]]
- [[wiki/concepts/chunk-retry-pattern]]
- [[wiki/concepts/llm-provider-abstraction]]
