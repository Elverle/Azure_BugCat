# Wiki Operation Log

| Date       | Action                     | Author         | Notes                                                                                                                                                                                                   |
| ---------- | -------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-21 | phase 3 close: code/doc sync and repo shape | Claude Code | Synchronised the IPC, validation and UI pages with the code they describe: the channel list was missing nine of the twenty-two channels, the preload page understated the exposed surface, the validation pages pointed at a renderer-local module that lives in `shared/` because both processes use it and left `assertValidSettings()` undocumented, and two UI pages still quoted the Italian strings the english migration replaced. Capturing the README screenshots surfaced three live defects, all fixed: two Italian strings on the AI Clusters tab that the `no-italian-strings` guard did not catch because neither root was in its marker list, a real company name still standing in as the ADO organization in a `DashboardPage` fixture, and a group header counting "12 Bug" in the singular. Repo shape changed on the author's call: `feature/` and `feature-index.md` were removed — the wiki's own feature table is now the single record, and minor deliveries live in git history and in this log — and `.vscode/` was untracked and ignored. The historical rows below and the superseded note on the README onboarding analysis were left untouched: they describe what was true when written. |
| 2026-08-20 | scan FT-14 + docs public showcase | Claude Code | Documented the `feat/public-showcase` branch (14 commits): FT-14 OS keychain protection for the PAT/API key (`secret-storage.ts`, the `enc:v1:` ciphertext format, the idempotent startup sweep, and the `SECRET_PLACEHOLDER` sentinel that keeps decrypted secrets out of the renderer), plus min-10 (license, identity metadata, English README rewrite, contributing guide, changelog) and min-11 (CI + release workflows) registered in `feature-index.md`. Corrected the product name from the stale "Bug Categorizer" to "Azure BugCat" in the index and two topic pages, corrected a claim inherited from the pre-FT-12 cancellation design — "cancelled runs persist nothing" — that three pages (`ipc-handlers`, `llm-service`, the cancel-categorization-flow analysis) still stated despite FT-12's chunk-by-chunk persistence, and annotated the README onboarding analysis as superseded by the from-scratch English README rewrite rather than rewriting it, since the two documents no longer share a structure worth diffing. |
| 2026-08-19 | docs field-rename sync     | Claude Code    | Closed the documentation debt left by the `subCategory` → `technicalLayer` rename and by the english-UI pass: 17 pages that still named the old field, the removed `getSubCategoryBgTint()`, the pre-rename `GroupBy` union and `FilterState` shape, or quoted italian labels and sentinel text as current behaviour. Pages that name the old field legitimately — the validator's legacy alias and the v4 migration's rename source — were left alone, as were the append-only log and the FT-13 delivery record, which now carries a pointer to the current copy. |
| 2026-08-18 | docs FT-11 + sentinel labels | Claude Code  | Rewrote the two FT-11 OpenRouter pages against the shared-fetch-core implementation that replaced the SDK (removing the stale-page warning from the index), documented the Phase 2 machine-value/label split (`categorization-sentinels`, `labels-utility`, `sentinel-value-label-separation`) and its schema v4 migration extension, and corrected a handful of other pages left describing the removed SDK. |
| 2026-08-14 | analysis production-ready  | Claude Code    | Closed the production-ready hardening phase (Fase 0+1, 22 tasks): static checks restored as a permanent gate (lint, typecheck, build), catalog data-lifecycle chain fixed, a single `AppError` contract across every IPC channel, incremental persistence and concurrency guards on both LLM flows, and the OpenRouter SDK replaced by a shared OpenAI-compatible fetch core. Suite from 348 to 568 tests. |
| 2026-05-14 | update min-07              | GitHub Copilot | Refined Storico Chiusi with a local detail filter by bug ID/title and collapsible macro-category sections, keeping KPI cards stable while making historical rows easier to navigate.                    |
| 2026-05-13 | update min-06              | GitHub Copilot | Refined Storico Chiusi KPIs with a persisted `lastClearedAt` baseline for history cleanup, richer bug-level detail under each macro-category, and updated docs/tests for the new renderer contract.     |
| 2026-05-13 | scan FT-13                 | GitHub Copilot | Scanned Storico Chiusi. Created the FT-13 source, 3 renderer entities, 1 concept, and 1 topic. Updated catalog, IPC, renderer navigation, and tracker docs.                                             |
| 2026-05-13 | update min-05              | GitHub Copilot | Added a dashboard fetch summary that shows how many retrieved bugs are new versus the historical catalog. Updated shared types, fetch merge docs, dashboard header/hook docs, and the delivery tracker. |
| 2026-05-13 | scan FT-12                 | GitHub Copilot | Scanned incremental session cache and selective re-categorization. Created 1 source, 1 entity, 1 concept, and 1 topic. Updated persistence, IPC, preload, settings, and tracker docs.                   |
| 2026-05-05 | analysis README onboarding | GitHub Copilot | Added and refined the root README with Windows/macOS packaging guidance, Settings quickstart, operator workflow, and more functional wording for categorization and similarity.                         |
| 2026-05-03 | update feature index       | GitHub Copilot | Updated `feature-index.md` to track the latest non-feature deliveries with explicit `min-##` / `fix-##` IDs and linked the convention from the wiki index.                                              |
| 2026-04-29 | Wiki structure initialized | Claude Code    | Project in pre-development, no source code yet                                                                                                                                                          |
| 2026-04-29 | scan FT-01                 | GitHub Copilot | Scanned FT-01 scaffold. Created 1 source, 9 entities, 3 concepts, 2 topics.                                                                                                                             |
| 2026-04-29 | scan FT-02                 | GitHub Copilot | Scanned FT-02 settings. Created 1 source, 10 entities, 2 concepts. Updated 3 entities, 1 topic.                                                                                                         |
| 2026-04-30 | scan FT-03                 | GitHub Copilot | Scanned FT-03 ADO fetch. Created 1 source, 4 entities, 1 concept. Updated 2 entities.                                                                                                                   |
| 2026-04-30 | scan FT-04                 | GitHub Copilot | Scanned FT-04 LLM provider. Created 1 source, 10 entities, 2 concepts, 1 topic. Updated 1 entity.                                                                                                       |
| 2026-04-30 | scan FT-05                 | GitHub Copilot | Scanned FT-05 dashboard. Created 1 source, 11 entities, 2 concepts, 1 topic. Updated 1 topic.                                                                                                           |
| 2026-04-30 | scan FT-06                 | GitHub Copilot | Scanned FT-06 drawer flow. Created 1 source, 3 entities, 1 concept. Updated 6 entities, 1 concept, 1 topic, 1 index.                                                                                    |
| 2026-05-01 | scan FT-07                 | GitHub Copilot | Scanned FT-07 session persistence. Created 1 source, 3 entities, 2 concepts, 1 topic. Updated 8 existing pages.                                                                                         |
| 2026-05-01 | scan FT-08                 | GitHub Copilot | Scanned FT-08 generic provider. Created 1 source, 1 entity. Updated LLM/settings/migration pages, index, and historical Copilot docs.                                                                   |
| 2026-05-01 | scan FT-09                 | GitHub Copilot | Scanned FT-09 structured output. Created 1 source, 1 entity, 1 concept. Updated LLM provider, prompt, validator, topic, index, and log pages.                                                           |
| 2026-05-01 | scan FT-10                 | GitHub Copilot | Scanned FT-10 AI Cluster. Created 1 source, 5 entities, 1 concept, 1 topic. Updated LLM, IPC, renderer, drawer, session, index, and log pages.                                                          |
| 2026-05-02 | scan FT-11                 | GitHub Copilot | Scanned FT-11 OpenRouter provider. Created 1 source, 1 entity. Updated LLM/build/topic pages, index, and log.                                                                                           |
| 2026-05-03 | update FT-11               | GitHub Copilot | Updated FT-11 docs for OpenRouter structured-output routing mismatch handling, blocking categorization behavior, and dashboard error modal UX.                                                          |
| 2026-05-03 | analysis FT-11             | GitHub Copilot | Added a dedicated analysis page for the OpenRouter `structured-output-routing-mismatch` failure mode and linked it from the wiki index.                                                                 |
| 2026-05-03 | cleanup wiki               | GitHub Copilot | Removed the obsolete historical Copilot provider page so the wiki no longer exposes a deleted provider as a current entity.                                                                             |
| 2026-05-03 | analysis LLM cleanup       | GitHub Copilot | Documented the shared LLM provider cleanup, added pages for the new helper modules, and updated provider/service docs to reflect aligned timeout, parsing, and blocking-error behavior.                 |
| 2026-05-03 | analysis cancel flow       | GitHub Copilot | Documented abort-aware categorization cancellation, updated IPC/dashboard/provider pages, and recorded the all-or-nothing persistence rule for cancel.                                                  |
| 2026-05-03 | analysis dashboard state   | GitHub Copilot | Documented Dashboard remount recovery for active categorization, immediate cancelling feedback, and renderer-safe IPC error normalization.                                                              |

## [2026-08-18] docs | FT-11 rescan and sentinel/label documentation

Closed two rounds of documentation debt. First, rescanned FT-11 after the production-ready hardening phase removed `@openrouter/sdk`: both FT-11 pages now describe the current `openAiCompatibleChat()`-based implementation while keeping the original SDK-backed delivery as an explicit historical record, and the `wiki/index.md` stale-page warning that pointed at them was removed. Second, documented the Phase 2 machine-value/label split that had no page yet — the `__name__`-shaped categorization sentinels, the renderer-only `sentinelLabel()` / `errorLabel()` mapping, and the schema v4 store migration's sentinel conversion (including its known `'N/D'`-in-`macroCategory` gap). A handful of directly-linked pages that still described the removed SDK or the pre-sentinel fallback values were also corrected in passing.

Pages created:

- [[wiki/entities/categorization-sentinels]]
- [[wiki/entities/labels-utility]]
- [[wiki/concepts/sentinel-value-label-separation]]

Pages updated:

- [[wiki/index.md]]
- [[wiki/entities/openrouter-provider]]
- [[wiki/sources/ft-11-openrouter-provider]]
- [[wiki/entities/provider-shared-utilities]]
- [[wiki/entities/llm-provider-factory]]
- [[wiki/concepts/electron-vite-build]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/topics/llm-categorization-pipeline]]
- [[wiki/analyses/structured-output-routing-mismatch]]
- [[wiki/entities/response-validator]]
- [[wiki/entities/llm-service]]
- [[wiki/entities/store-migration]]
- [[wiki/concepts/schema-versioned-store-migration]]

## [2026-05-03] analysis | Dashboard categorization state recovery

Updated the wiki after the manual-test follow-up on cancellable categorization. The Dashboard now rehydrates an active run after route remounts through a dedicated status IPC, shows immediate `Cancelling...` feedback before the next chunk event, and receives readable renderer errors from `llm:categorize` instead of generic `[object Object]` invoke wrappers.

Pages created:

- [[wiki/analyses/dashboard-categorization-state-recovery]]

Pages updated:

- [[wiki/index.md]]

## [2026-05-05] analysis | README onboarding guide

Added the missing root README so first-time users can understand the product scope, start the Electron app locally, fill the Settings page correctly, and follow the dashboard workflow from fetch to similarity analysis without reconstructing the flow from the wiki alone.

Pages created:

- [[wiki/analyses/readme-onboarding-guide]]

Pages updated:

- [[wiki/index.md]]

## [2026-05-13] scan | FT-13 - Storico Chiusi

Scanned FT-13 after the renderer gained its first historical-catalog page. The feature adds a dedicated `/closed-bugs` route, a filtered `catalog:get-closed` IPC read model for closed catalog entries, pure KPI derivation in the renderer, and explicit loading, error, and empty states for the new historical analytics surface. Also updated `feature-index.md` to register FT-13 in the delivery tracker.

Pages created:

- [[wiki/sources/ft-13-closed-bugs-history]]
- [[wiki/entities/closed-bugs-page]]
- [[wiki/entities/use-closed-bug-kpis-hook]]
- [[wiki/entities/closed-bug-kpis-utility]]
- [[wiki/concepts/renderer-safe-closed-catalog-projection]]
- [[wiki/topics/closed-bug-history-analytics]]

Pages updated:

- [[wiki/index.md]]
- [[wiki/entities/ipc-channels]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/topbar]]
- [[wiki/concepts/catalog-backed-selective-re-categorization]]
- [[wiki/topics/renderer-ui]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]

## [2026-05-13] update | min-06 - Baseline pulizia storico e dettaglio bug chiusi

Refined the FT-13 historical analytics flow so the `Bug Chiusi Totali` KPI now declares the current history baseline through the last explicit catalog cleanup timestamp, and each macro-category now exposes bug-level detail (`id`, `title`, close timestamp, and whether similarity history exists). The underlying closed-history IPC contract now also returns the persisted cleanup baseline.

Pages updated:

- [[wiki/index.md]]
- [[wiki/sources/ft-13-closed-bugs-history]]
- [[wiki/entities/closed-bugs-page]]
- [[wiki/entities/use-closed-bug-kpis-hook]]
- [[wiki/entities/closed-bug-kpis-utility]]
- [[wiki/entities/shared-types]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/topics/closed-bug-history-analytics]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]

## [2026-05-14] update | min-07 - Filtro dettaglio e collapse per categoria

Refined the FT-13 historical analytics page so bug-detail rows can now be filtered locally by bug ID or title and each macro-category can be collapsed independently. The KPI cards remain unfiltered, while the detail section reports only the currently visible rows.

Pages updated:

- [[wiki/entities/closed-bugs-page]]
- [[wiki/topics/closed-bug-history-analytics]]
- [[wiki/sources/ft-13-closed-bugs-history]]
- [[wiki/index.md]]

## [2026-05-13] scan | FT-12 - Incremental Session Cache & Selective Re-Categorization

Scanned FT-12 after the persistence redesign that split the open `session` snapshot from the historical `bugCatalog`. The feature adds signature-based fetch merging, selective LLM categorization, similarity lifecycle metadata, migration v3 backfill, and separate Settings actions for clearing the session snapshot vs clearing historical catalog data. Also updated `feature-index.md` to register FT-12 in the delivery tracker.

Pages created:

- [[wiki/sources/ft-12-incremental-session-cache]]
- [[wiki/entities/catalog-merge-utility]]
- [[wiki/concepts/catalog-backed-selective-re-categorization]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]

Pages updated:

- [[wiki/index.md]]
- [[wiki/entities/electron-store]]
- [[wiki/entities/shared-types]]
- [[wiki/entities/ipc-channels]]
- [[wiki/entities/store-migration]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/settings-page]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/llm-categorization-pipeline]]

## [2026-05-05] update | README packaging and quickstart refinement

Expanded the root README so it now explains how to prepare a Windows `.exe` installer and a macOS `.dmg`, how Mac users should launch the packaged app, which Settings fields are essential on first run, and what categorization and similarity mean in functional terms for operators.

Pages updated:

- [[wiki/index.md]]
- [[wiki/analyses/readme-onboarding-guide]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/ipc-channels]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/use-dashboard-hook]]
- [[wiki/entities/dashboard-header]]
- [[wiki/entities/dashboard-page]]
- [[wiki/topics/llm-categorization-pipeline]]
- [[wiki/topics/dashboard-bug-exploration]]

## [2026-05-03] update | Feature index convention and recent minor/fix history

Aligned the repository trackers so `feature-index.md` now records not only major features but also minor improvements and fixes with explicit `min-##` / `fix-##` IDs. Added the latest three non-feature deliveries from git history and linked the convention from the wiki index for easier context recovery.

Pages updated:

- [[wiki/index.md]]

## [2026-05-03] analysis | Cancellable categorization flow

Updated the wiki after adding a user-triggered cancel path for long-running categorization runs. The new behavior propagates `AbortSignal` from renderer to providers, distinguishes cancellation from timeout, swaps the dashboard action to `Cancel` while work is in progress, and keeps session persistence all-or-nothing.

Pages created:

- [[wiki/analyses/cancel-categorization-flow]]

Pages updated:

- [[wiki/index.md]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/ipc-channels]]
- [[wiki/entities/preload-bridge]]
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

## [2026-05-03] analysis | LLM provider cleanup and wiki sync

Updated the wiki after the LLM runtime cleanup that extracted shared provider helpers, aligned blocking-error handling between categorization and similarity, unified tolerant JSON parsing, and added direct adapter tests for OpenAI, Anthropic, and Gemini.

Pages created:

- [[wiki/entities/provider-shared-utilities]]
- [[wiki/entities/llm-error-policy]]
- [[wiki/entities/llm-json-utilities]]
- [[wiki/analyses/llm-provider-cleanup]]

Pages updated:

- [[wiki/index.md]]
- [[wiki/entities/openai-provider]]
- [[wiki/entities/anthropic-provider]]
- [[wiki/entities/gemini-provider]]
- [[wiki/entities/generic-provider]]
- [[wiki/entities/openrouter-provider]]
- [[wiki/entities/llm-service]]
- [[wiki/entities/similarity-service]]
- [[wiki/entities/response-validator]]
- [[wiki/entities/llm-provider-interface]]
- [[wiki/concepts/llm-provider-abstraction]]

## [2026-04-29] scan | FT-01 — Scaffold Electron + Infrastruttura Base

Full scan of FT-01 feature: electron-vite project with React 18, TypeScript, Tailwind CSS, shadcn/ui, IPC security model, encrypted electron-store, HashRouter routing.

Pages created:

- [[wiki/sources/ft-01-scaffold]]
- [[wiki/entities/electron-main-process]]
- [[wiki/entities/electron-store]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/ipc-channels]]
- [[wiki/entities/shared-types]]
- [[wiki/entities/topbar]]
- [[wiki/entities/app-layout]]
- [[wiki/entities/button-component]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/concepts/electron-vite-build]]
- [[wiki/concepts/tailwind-styling]]
- [[wiki/topics/electron-architecture]]
- [[wiki/topics/renderer-ui]]

Pages updated:

- [[wiki/index.md]]

## [2026-04-29] scan | FT-02 — Settings Page & Configuration Persistence

Full scan of FT-02 feature: Settings page with form validation, IPC persistence, test connections, UI primitives (Input, Label, Select, Textarea), section components (ADO, LLM, Categories), useSettings hook, and validation utilities.

Pages created:

- [[wiki/sources/ft-02-settings]]
- [[wiki/entities/settings-page]]
- [[wiki/entities/use-settings-hook]]
- [[wiki/entities/validation-utils]]
- [[wiki/entities/ado-connection-section]]
- [[wiki/entities/llm-provider-section]]
- [[wiki/entities/categories-section]]
- [[wiki/entities/input-component]]
- [[wiki/entities/label-component]]
- [[wiki/entities/select-component]]

## [2026-04-30] scan | FT-03 — Azure DevOps Bug Fetching

Scanned FT-03 feature: ADO service layer with WIQL query execution, batch work item fetching, HTML→text conversion, typed error handling, and IPC handler wiring.

Pages created:

- [[wiki/sources/ft-03-ado-fetch]]
- [[wiki/entities/ado-types]]
- [[wiki/entities/ado-client]]
- [[wiki/entities/ado-service]]
- [[wiki/entities/html-to-text]]
- [[wiki/concepts/ado-rest-api-pattern]]

Pages updated:

- [[wiki/index.md]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/textarea-component]]
- [[wiki/concepts/form-validation-pattern]]
- [[wiki/concepts/settings-persistence-flow]]

Pages updated:

- [[wiki/entities/ipc-handlers]] — test connection stubs now return structured responses
- [[wiki/entities/shared-types]] — added TestConnectionResult
- [[wiki/topics/renderer-ui]] — SettingsPage implemented, new components listed
- [[wiki/index.md]]

## [2026-04-30] scan | FT-04 — LLM Provider Abstraction e Categorizzazione

Scanned FT-04 feature: LLM provider layer with polymorphic interface, 4 concrete providers (OpenAI, Anthropic, GitHub Copilot, Gemini), factory, chunking, response validation with markdown fence stripping, exponential backoff retry, progressive IPC chunk updates, and test connection flow.

Pages created:

- [[wiki/sources/ft-04-llm-provider]]
- [[wiki/entities/llm-provider-interface]]
- [[wiki/entities/openai-provider]]
- [[wiki/entities/anthropic-provider]]
- Historical GitHub Copilot provider page (removed from the wiki on 2026-05-03)
- [[wiki/entities/gemini-provider]]
- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/llm-service]]
- [[wiki/entities/response-validator]]
- [[wiki/entities/chunking-utility]]
- [[wiki/entities/llm-prompts]]

## [2026-05-02] scan | FT-11 - OpenRouter SDK Provider

Scanned FT-11 feature: added an OpenRouter SDK-backed LLM provider with the SDK's nested `chatRequest` envelope, provider-native `json_schema` structured output, native `timeoutMs` handling, status-code-based error normalization, renderer settings registration, and main-process bundling through `electron.vite.config.ts`.

Pages created:

- [[wiki/sources/ft-11-openrouter-provider]]
- [[wiki/entities/openrouter-provider]]

Pages updated:

- [[wiki/index.md]]
- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/llm-provider-section]]
- [[wiki/entities/shared-types]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/concepts/provider-native-structured-output]]
- [[wiki/concepts/electron-vite-build]]
- [[wiki/topics/llm-categorization-pipeline]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/concepts/chunk-retry-pattern]]
- [[wiki/topics/llm-categorization-pipeline]]

## [2026-05-03] update | FT-11 - OpenRouter blocking routing mismatch UX

Updated FT-11 documentation after the OpenRouter follow-up hardening: structured-output routing mismatches are now treated as blocking categorization failures, `useDashboard()` exposes a renderer-facing `categorizeError`, `DashboardPage` opens a modal popup through `ConfirmDialog`, and the provider docs clarify the dedicated `structured-output-routing-mismatch` parse-error reason.

Pages updated:

- [[wiki/index.md]]
- [[wiki/sources/ft-11-openrouter-provider]]
- [[wiki/entities/openrouter-provider]]
- [[wiki/entities/llm-service]]
- [[wiki/entities/use-dashboard-hook]]
- [[wiki/entities/dashboard-page]]
- [[wiki/entities/confirm-dialog]]
- [[wiki/topics/llm-categorization-pipeline]]

## [2026-05-03] analysis | OpenRouter structured-output routing mismatch

Added a dedicated analysis page for the OpenRouter failure mode where a valid `json_schema` request is routed to an upstream backend that downgrades the response format. The page captures symptoms, root cause, detection logic, product behavior, and mitigation guidance.

Pages created:

- [[wiki/analyses/structured-output-routing-mismatch]]

Pages updated:

- [[wiki/index.md]]

## [2026-05-03] cleanup | Remove obsolete Copilot provider page

Removed the historical `copilot-provider` entity page from the wiki because the provider no longer exists in the product and should not appear as a maintained wiki entity.

Pages updated:

- [[wiki/log.md]]

Pages updated:

- [[wiki/entities/ipc-handlers]] — LLM stubs replaced with real handlers, added llm-service dependency
- [[wiki/index.md]]

## [2026-04-30] scan | FT-05 — Dashboard Principale: Tabella, Filtri e Raggruppamenti

Scanned FT-05 feature: renderer dashboard with session hydration, KPI cards, debounced text search, multi-select filters, sortable table view, grouped card/table views, collapsible accordions, deterministic badge colors, and progress-aware categorization actions.

Pages created:

- [[wiki/sources/ft-05-dashboard]]
- [[wiki/entities/dashboard-page]]
- [[wiki/entities/dashboard-header]]
- [[wiki/entities/kpi-cards]]
- [[wiki/entities/filter-bar]]
- [[wiki/entities/bug-table]]
- [[wiki/entities/bug-card]]
- [[wiki/entities/group-accordion]]
- [[wiki/entities/multi-select-component]]
- [[wiki/entities/use-dashboard-hook]]
- [[wiki/entities/dashboard-utils]]
- [[wiki/entities/badge-color-utilities]]
- [[wiki/concepts/dashboard-derivation-pipeline]]
- [[wiki/concepts/accessible-collection-controls]]
- [[wiki/topics/dashboard-bug-exploration]]

Pages updated:

- [[wiki/topics/renderer-ui]] — DashboardPage is now the implemented index route with dashboard-specific components
- [[wiki/index.md]]

## [2026-04-30] scan | FT-06 — Pannello Dettaglio Bug (Drawer)

Scanned FT-06 feature: slide-in bug detail drawer, filtered-list prev/next navigation, click-outside guard with `data-bug-click` exclusion, and secure `shell:open-external` IPC integration for Azure DevOps deep links.

Pages created:

- [[wiki/sources/ft-06-bug-detail-drawer]]
- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/use-bug-drawer-hook]]
- [[wiki/entities/open-external-ipc]]
- [[wiki/concepts/click-outside-exclusion-pattern]]

Pages updated:

- [[wiki/entities/bug-table]] — rows now participate in drawer drill-down and expose exclusion markers for outside-click handling
- [[wiki/entities/bug-card]] — grouped cards are now keyboard-triggerable drawer launchers with exclusion markers
- [[wiki/entities/ipc-channels]] — added `shell:open-external` channel constant
- [[wiki/entities/ipc-handlers]] — added validated shell handler for external HTTPS links
- [[wiki/entities/preload-bridge]] — exposed `openExternal(url)` on `window.electronAPI`
- [[wiki/entities/dashboard-page]] — integrated drawer state, content offset, and ADO deep-link composition
- [[wiki/concepts/accessible-collection-controls]] — extended accessibility pattern to row/card drill-down and drawer controls
- [[wiki/topics/dashboard-bug-exploration]] — added persistent drawer interaction model and secure external navigation flow
- [[wiki/index.md]]

## [2026-05-01] scan | FT-07 — Persistenza Dati e Gestione Sessione

Scanned FT-07 feature: schema-versioned `electron-store` bootstrap, reusable confirmation dialog with focus trap/focus restore, Settings danger zone for clearing session data, extracted date formatting utility, and targeted tests for migration + clear-session behavior.

Pages created:

- [[wiki/sources/ft-07-session-persistence]]
- [[wiki/entities/store-migration]]
- [[wiki/entities/confirm-dialog]]
- [[wiki/entities/date-format-utility]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/concepts/accessible-confirmation-dialog]]
- [[wiki/topics/session-persistence-lifecycle]]

Pages updated:

- [[wiki/entities/electron-store]] — documented schemaVersion handling and startup migration relationship
- [[wiki/entities/ipc-handlers]] — linked FT-07 source and session-clear consumer flow
- [[wiki/entities/settings-page]] — added danger zone, confirmation dialog, and clear-session feedback behavior
- [[wiki/entities/dashboard-header]] — timestamp rendering now uses the shared `formatDate()` utility
- [[wiki/concepts/settings-persistence-flow]] — expanded to cover startup migration plus session read/clear flow
- [[wiki/topics/electron-architecture]] — boot sequence now includes `migrateStore(store)` and FT-07 milestone
- [[wiki/topics/renderer-ui]] — documented reusable dialog + shared date utility and Settings danger zone
- [[wiki/index.md]]

## [2026-05-01] scan | FT-08 — GenericProvider OpenAI-Compatible e Rimozione Copilot

Scanned FT-08 feature: replaced the GitHub Copilot SDK provider with a generic OpenAI-compatible HTTP adapter, extended settings with `baseUrl` and `llmModel`, added URL validation at both renderer and main-process boundaries, and introduced schema v2 migration to normalize legacy provider settings.

Pages created:

- [[wiki/sources/ft-08-generic-provider]]
- [[wiki/entities/generic-provider]]

Pages updated:

- [[wiki/index.md]]
- [[wiki/entities/shared-types]]
- [[wiki/entities/llm-provider-interface]]
- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/llm-service]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/validation-utils]]
- [[wiki/entities/llm-provider-section]]
- [[wiki/entities/use-settings-hook]]
- [[wiki/entities/store-migration]]
- [[wiki/entities/electron-store]]
- Historical Copilot provider page reference removed from the wiki
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/concepts/settings-persistence-flow]]
- [[wiki/topics/llm-categorization-pipeline]]
- [[wiki/sources/ft-02-settings]]
- [[wiki/sources/ft-04-llm-provider]]

## [2026-05-01] scan | FT-09 - Structured Output JSON Schema per Tutti i Provider LLM

Scanned FT-09 feature: introduced shared JSON Schema definitions for categorization and similar-bugs output, extended the `LLMProvider.chat()` contract with schema-aware `ChatOptions`, mapped that logical schema to each provider's native structured-output API, simplified prompts because structure is now enforced at transport level, and standardized temperature to `0.1` across all providers.

Pages created:

- [[wiki/sources/ft-09-structured-output]]
- [[wiki/entities/llm-schemas]]
- [[wiki/concepts/provider-native-structured-output]]

Pages updated:

- [[wiki/index.md]]
- [[wiki/log.md]]
- [[wiki/entities/llm-service]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/ipc-channels]]
- [[wiki/entities/shared-types]]
- [[wiki/entities/topbar]]
- [[wiki/entities/llm-prompts]]
- [[wiki/entities/llm-schemas]]
- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/use-bug-drawer-hook]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/topics/llm-categorization-pipeline]]
- [[wiki/topics/renderer-ui]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/electron-architecture]]
- [[wiki/entities/llm-provider-interface]]
- [[wiki/entities/llm-service]]
- [[wiki/entities/llm-prompts]]
- [[wiki/entities/response-validator]]
- [[wiki/entities/openai-provider]]
- [[wiki/entities/anthropic-provider]]
- [[wiki/entities/gemini-provider]]
- [[wiki/entities/generic-provider]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/topics/llm-categorization-pipeline]]

## [2026-05-01] scan | FT-10 - AI Cluster Similar Bug Detection

Scanned FT-10 feature: added a dedicated AI Cluster route for macro-category-scoped similar-bug detection, a new main-process similarity orchestrator that reuses the LLM provider abstraction and FT-09 similar-bugs schema, progress IPC events, session-persisted results, stale detection, and bug drawer drill-down from grouped similarity cards.

Pages created:

- [[wiki/sources/ft-10-ai-cluster-similarity]]
- [[wiki/entities/similarity-service]]
- [[wiki/entities/use-ai-cluster-hook]]
- [[wiki/entities/dashboard-page]]
- [[wiki/entities/ai-cluster-category-section]]
- [[wiki/entities/similarity-group-card]]
- [[wiki/concepts/macro-category-scoped-similarity-analysis]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]

Pages updated:

- [[wiki/index.md]]
- [[wiki/log.md]]
