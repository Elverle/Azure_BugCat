# Wiki Operation Log

| Date       | Action                     | Author         | Notes                                                                                                                                                                                                                                                                                                             |
| ---------- | -------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-26 | scan FT-14F                | GitHub Copilot | Scanned FT-14F provider/auth parity for analysis. Added the agent-availability helper entity and proactive blocking concept, documented Codex CLI preflight plus Copilot diagnostics, and updated the relevant agent-session, dashboard, IPC, preload, and tracker pages.                                         |
| 2026-05-21 | update fix-07              | GitHub Copilot | Fixed the project keyword editor in Settings so comma and space remain typeable while editing. The component now keeps a freeform draft string and only normalizes to the stored keyword array for validation/persistence, and the wiki tracker was updated accordingly.                                          |
| 2026-05-21 | update fix-06              | GitHub Copilot | Removed the now-unused FT-14B single-session renderer residue after FT-14E. The Dashboard drawer now starts sessions directly through the multi-session path, the dead `agent:mcp-status` push event was removed, obsolete renderer tests were deleted, and the wiki/tracker pages were aligned with the cleanup. |
| 2026-05-21 | scan FT-14E                | GitHub Copilot | Scanned FT-14E multi-session agent workspace. Added persistence/workspace pages, documented bounded concurrent session recovery and list/detail IPC, and updated the tracker pages plus `feature-index.md`.                                                                                                       |
| 2026-05-20 | update fix-05              | GitHub Copilot | Fixed the production build regression introduced by the token-statistics work: the main-process runners now import the shared `usage` helper via relative paths again, avoiding the unsupported `@main/*` alias in the electron-vite main bundle.                                                                 |
| 2026-05-20 | update min-08              | GitHub Copilot | Added per-session token statistics for agent analysis. The runner contract now carries provider usage metadata, main/renderer session snapshots preserve it, and the Sessions workspace renders a dedicated `Statistiche` section with input/output/total token counts and related metrics when available.        |
| 2026-05-20 | scan FT-14D                | GitHub Copilot | Scanned FT-14D cross-repo agent analysis. Added project-suggestion and cross-repo workflow pages, documented conditional multi-repo prompts and secondary log tagging, and updated the FT-14 agent/session/wiki tracker pages plus `feature-index.md`.                                                            |
| 2026-05-20 | scan FT-14C                | GitHub Copilot | Scanned FT-14C MCP Azure DevOps integration for agent sessions. Added MCP source/entity/concept/topic pages and updated agent-session, IPC, preload, shared-type, renderer, and tracker docs for MCP health-check fallback behavior.                                                                              |
| 2026-05-18 | update FT-14 Copilot wait  | GitHub Copilot | Raised the explicit Copilot `session.sendAndWait()` timeout from the SDK default 60s to 10 minutes so longer repository analysis can finish without failing on `session.idle` wait time.                                                                                                                          |
| 2026-05-18 | update FT-14 model UX      | GitHub Copilot | Exposed the shared `agentModel` field for Copilot SDK in Settings so stale hidden model values are visible/editable, with copy that clarifies blank falls back to the provider default.                                                                                                                           |
| 2026-05-18 | update FT-14B Copilot path | GitHub Copilot | Aligned the Copilot runner with the SDK contract: session-scoped BYOK provider config, BYOK base URL settings/validation, read-only permission handling, and native Copilot CLI resolution on Electron with `ELECTRON_RUN_AS_NODE` kept only as a fallback path.                                                  |
| 2026-05-18 | scan FT-14B                | GitHub Copilot | Scanned FT-14B agent sessions. Added the runtime topic, 8 entity pages, 3 concepts, and updated IPC/dashboard/settings/security docs plus the delivery trackers.                                                                                                                                                  |
| 2026-05-17 | scan FT-14A                | GitHub Copilot | Scanned the Settings foundation for future agent sessions. Added FT-14A source, 4 entities, 3 concepts, and 1 topic. Updated core settings, shared types, IPC, migration, renderer, and tracker docs.                                                                                                             |
| 2026-05-14 | update min-07              | GitHub Copilot | Refined Storico Chiusi with a local detail filter by bug ID/title and collapsible macro-category sections, keeping KPI cards stable while making historical rows easier to navigate.                                                                                                                              |
| 2026-05-13 | update min-06              | GitHub Copilot | Refined Storico Chiusi KPIs with a persisted `lastClearedAt` baseline for history cleanup, richer bug-level detail under each macro-category, and updated docs/tests for the new renderer contract.                                                                                                               |
| 2026-05-13 | scan FT-13                 | GitHub Copilot | Scanned Storico Chiusi. Created the FT-13 source, 3 renderer entities, 1 concept, and 1 topic. Updated catalog, IPC, renderer navigation, and tracker docs.                                                                                                                                                       |
| 2026-05-13 | update min-05              | GitHub Copilot | Added a dashboard fetch summary that shows how many retrieved bugs are new versus the historical catalog. Updated shared types, fetch merge docs, dashboard header/hook docs, and the delivery tracker.                                                                                                           |
| 2026-05-13 | scan FT-12                 | GitHub Copilot | Scanned incremental session cache and selective re-categorization. Created 1 source, 1 entity, 1 concept, and 1 topic. Updated persistence, IPC, preload, settings, and tracker docs.                                                                                                                             |
| 2026-05-05 | analysis README onboarding | GitHub Copilot | Added and refined the root README with Windows/macOS packaging guidance, Settings quickstart, operator workflow, and more functional wording for categorization and similarity.                                                                                                                                   |
| 2026-05-03 | update feature index       | GitHub Copilot | Updated `feature-index.md` to track the latest non-feature deliveries with explicit `min-##` / `fix-##` IDs and linked the convention from the wiki index.                                                                                                                                                        |
| 2026-04-29 | Wiki structure initialized | Claude Code    | Project in pre-development, no source code yet                                                                                                                                                                                                                                                                    |
| 2026-04-29 | scan FT-01                 | GitHub Copilot | Scanned FT-01 scaffold. Created 1 source, 9 entities, 3 concepts, 2 topics.                                                                                                                                                                                                                                       |
| 2026-04-29 | scan FT-02                 | GitHub Copilot | Scanned FT-02 settings. Created 1 source, 10 entities, 2 concepts. Updated 3 entities, 1 topic.                                                                                                                                                                                                                   |
| 2026-04-30 | scan FT-03                 | GitHub Copilot | Scanned FT-03 ADO fetch. Created 1 source, 4 entities, 1 concept. Updated 2 entities.                                                                                                                                                                                                                             |
| 2026-04-30 | scan FT-04                 | GitHub Copilot | Scanned FT-04 LLM provider. Created 1 source, 10 entities, 2 concepts, 1 topic. Updated 1 entity.                                                                                                                                                                                                                 |
| 2026-04-30 | scan FT-05                 | GitHub Copilot | Scanned FT-05 dashboard. Created 1 source, 11 entities, 2 concepts, 1 topic. Updated 1 topic.                                                                                                                                                                                                                     |
| 2026-04-30 | scan FT-06                 | GitHub Copilot | Scanned FT-06 drawer flow. Created 1 source, 3 entities, 1 concept. Updated 6 entities, 1 concept, 1 topic, 1 index.                                                                                                                                                                                              |
| 2026-05-01 | scan FT-07                 | GitHub Copilot | Scanned FT-07 session persistence. Created 1 source, 3 entities, 2 concepts, 1 topic. Updated 8 existing pages.                                                                                                                                                                                                   |
| 2026-05-01 | scan FT-08                 | GitHub Copilot | Scanned FT-08 generic provider. Created 1 source, 1 entity. Updated LLM/settings/migration pages, index, and historical Copilot docs.                                                                                                                                                                             |
| 2026-05-01 | scan FT-09                 | GitHub Copilot | Scanned FT-09 structured output. Created 1 source, 1 entity, 1 concept. Updated LLM provider, prompt, validator, topic, index, and log pages.                                                                                                                                                                     |
| 2026-05-01 | scan FT-10                 | GitHub Copilot | Scanned FT-10 AI Cluster. Created 1 source, 5 entities, 1 concept, 1 topic. Updated LLM, IPC, renderer, drawer, session, index, and log pages.                                                                                                                                                                    |
| 2026-05-02 | scan FT-11                 | GitHub Copilot | Scanned FT-11 OpenRouter provider. Created 1 source, 1 entity. Updated LLM/build/topic pages, index, and log.                                                                                                                                                                                                     |
| 2026-05-03 | update FT-11               | GitHub Copilot | Updated FT-11 docs for OpenRouter structured-output routing mismatch handling, blocking categorization behavior, and dashboard error modal UX.                                                                                                                                                                    |
| 2026-05-03 | analysis FT-11             | GitHub Copilot | Added a dedicated analysis page for the OpenRouter `structured-output-routing-mismatch` failure mode and linked it from the wiki index.                                                                                                                                                                           |
| 2026-05-03 | cleanup wiki               | GitHub Copilot | Removed the obsolete historical Copilot provider page so the wiki no longer exposes a deleted provider as a current entity.                                                                                                                                                                                       |
| 2026-05-03 | analysis LLM cleanup       | GitHub Copilot | Documented the shared LLM provider cleanup, added pages for the new helper modules, and updated provider/service docs to reflect aligned timeout, parsing, and blocking-error behavior.                                                                                                                           |
| 2026-05-03 | analysis cancel flow       | GitHub Copilot | Documented abort-aware categorization cancellation, updated IPC/dashboard/provider pages, and recorded the all-or-nothing persistence rule for cancel.                                                                                                                                                            |
| 2026-05-03 | analysis dashboard state   | GitHub Copilot | Documented Dashboard remount recovery for active categorization, immediate cancelling feedback, and renderer-safe IPC error normalization.                                                                                                                                                                        |

## [2026-05-26] scan | FT-14F - Provider/Auth Parity for Analysis

Scanned FT-14F after the agent-analysis flow gained proactive provider/auth parity checks. The renderer now computes a pure availability result before launch, Settings can test Copilot connectivity in either subscription or provider-aware BYOK mode, and `agent:start` performs a Codex CLI preflight so missing local binaries fail before runner creation.

Pages created:

- [[wiki/sources/ft-14f-provider-auth-parity-analysis]]
- [[wiki/entities/agent-availability]]
- [[wiki/concepts/proactive-agent-configuration-blocking]]

Pages updated:

- [[wiki/index.md]]
- [[wiki/entities/analyze-start-panel]]
- [[wiki/entities/agent-provider-section]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/ipc-channels]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/dashboard-page]]
- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/session-workspace]]
- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/agent-session-configuration-foundation]]

## [2026-05-03] analysis | Dashboard categorization state recovery

Updated the wiki after the manual-test follow-up on cancellable categorization. The Dashboard now rehydrates an active run after route remounts through a dedicated status IPC, shows immediate `Cancelling...` feedback before the next chunk event, and receives readable renderer errors from `llm:categorize` instead of generic `[object Object]` invoke wrappers.

Pages created:

- [[wiki/analyses/dashboard-categorization-state-recovery]]

Pages updated:

- [[wiki/index.md]]
- [[wiki/entities/agent-prompt-builder]]
- [[wiki/entities/agent-session-manager]]
- [[wiki/entities/use-agent-session-hook]]
- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/dashboard-page]]
- [[wiki/entities/shared-types]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/ipc-channels]]
- [[wiki/entities/project-registry]]
- [[wiki/concepts/streaming-agent-session-ipc]]
- [[wiki/concepts/single-active-agent-session-lifecycle]]
- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/mcp-backed-agent-analysis]]

## [2026-05-05] analysis | README onboarding guide

Added the missing root README so first-time users can understand the product scope, start the Electron app locally, fill the Settings page correctly, and follow the dashboard workflow from fetch to similarity analysis without reconstructing the flow from the wiki alone.

Pages created:

- [[wiki/analyses/readme-onboarding-guide]]

Pages updated:

- [[wiki/index.md]]

## [2026-05-17] scan | FT-14A - Agent Configuration & Project Registry

Scanned FT-14A after the Settings route gained the foundation for future agent sessions: auto-derived agent providers, Copilot BYOK mode, a Codex CLI binary check, a persisted project registry with save-time path validation, architecture context, concurrency limits, and schema v4 backfill. Also updated `feature-index.md` to register FT-14A in the delivery tracker.

Pages created:

- [[wiki/sources/ft-14a-agent-configuration-project-registry]]
- [[wiki/entities/agent-provider-section]]
- [[wiki/entities/project-registry-section]]
- [[wiki/entities/architecture-context-section]]
- [[wiki/entities/project-registry]]
- [[wiki/concepts/agent-provider-auto-derivation]]
- [[wiki/concepts/settings-sanitization-before-save]]
- [[wiki/concepts/dynamic-collection-touched-state]]
- [[wiki/topics/agent-session-configuration-foundation]]

Pages updated:

- [[wiki/index.md]]
- [[wiki/entities/settings-page]]
- [[wiki/entities/use-settings-hook]]
- [[wiki/entities/validation-utils]]
- [[wiki/entities/store-migration]]
- [[wiki/entities/shared-types]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/ipc-channels]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/concepts/settings-persistence-flow]]
- [[wiki/topics/renderer-ui]]

## [2026-05-18] scan | FT-14B - Agent Sessions

Scanned FT-14B after the app gained its first end-to-end agent-analysis workflow. The feature adds main-process runner orchestration for Claude, Codex, and Copilot, a reconnectable single-session manager, streamed chunk/completion/error IPC, a Dashboard `Sessioni` tab with Markdown report rendering, and a bug-drawer entry point that targets one registered local project. Also updated `feature-index.md` to register FT-14B in the delivery tracker.

Pages created:

- [[wiki/sources/ft-14b-agent-sessions]]
- [[wiki/entities/agent-session-manager]]
- [[wiki/entities/agent-runner-factory]]
- [[wiki/entities/agent-prompt-builder]]
- [[wiki/entities/claude-sdk-runner]]
- [[wiki/entities/codex-sdk-runner]]
- [[wiki/entities/copilot-sdk-runner]]
- [[wiki/entities/use-agent-session-hook]]
- [[wiki/entities/sessions-panel]]
- [[wiki/concepts/single-active-agent-session-lifecycle]]
- [[wiki/concepts/streaming-agent-session-ipc]]
- [[wiki/concepts/read-only-agent-analysis-sandboxing]]
- [[wiki/topics/agent-analysis-sessions]]

Pages updated:

- [[wiki/index.md]]
- [[wiki/entities/agent-provider-section]]
- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/dashboard-page]]
- [[wiki/entities/ipc-channels]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/shared-types]]
- [[wiki/entities/validation-utils]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/topics/agent-session-configuration-foundation]]
- [[wiki/topics/dashboard-bug-exploration]]

## [2026-05-20] scan | FT-14C - MCP Azure DevOps Integration for Agent Sessions

Scanned FT-14C after the agent-session workflow gained an MCP-first Azure DevOps path with graceful fallback. The feature adds project-local `.mcp.json` writing for Claude/Codex, programmatic `mcpServers` injection for Copilot, a spawn-based MCP health check with a 500ms crash-detection window, a shorter MCP prompt variant, and renderer-visible `MCP` / `Fallback` status.

Pages created:

- [[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]
- [[wiki/entities/mcp-config-writer]]
- [[wiki/entities/mcp-health-check]]
- [[wiki/concepts/mcp-capability-probe-and-fallback]]
- [[wiki/topics/mcp-backed-agent-analysis]]

Pages updated:

- [[wiki/index.md]]
- [[wiki/entities/agent-prompt-builder]]
- [[wiki/entities/claude-sdk-runner]]
- [[wiki/entities/codex-sdk-runner]]
- [[wiki/entities/copilot-sdk-runner]]
- [[wiki/entities/use-agent-session-hook]]
- [[wiki/entities/sessions-panel]]
- [[wiki/entities/shared-types]]
- [[wiki/entities/ipc-channels]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/dashboard-page]]
- [[wiki/concepts/read-only-agent-analysis-sandboxing]]
- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/mcp-backed-agent-analysis]]

## [2026-05-20] scan | FT-14D - Cross-Repo Analysis & Project Suggestions

Scanned FT-14D after the agent-session workflow gained smart multi-project launch support. The feature adds heuristic primary-project selection from bug metadata, optional secondary-project suggestions based on project type, a dedicated drawer launch panel with override/recompute behavior, conditional cross-repo prompt sections for both MCP and fallback prompts, and chunk provenance tagging for reads coming from secondary repositories. Also updated `feature-index.md` to register FT-14D in the delivery tracker.

Pages created:

- [[wiki/sources/ft-14d-cross-repo-project-suggestions]]
- [[wiki/entities/project-matcher]]
- [[wiki/entities/analyze-start-panel]]
- [[wiki/concepts/cross-repo-project-suggestion-heuristics]]
- [[wiki/topics/cross-repo-agent-analysis]]

Pages updated:

- [[wiki/index.md]]

## [2026-05-21] scan | FT-14E - Multi-Session Agent Workspace

Scanned FT-14E after the agent-session flow was refactored from one live session into a bounded concurrent workspace. The feature adds persisted `agentSessions` recovery with 24-hour retention and stale-running conversion, a list/detail Dashboard workspace with filtering and report actions, new summary/update/save-report IPC contracts, and a numeric running-count tab badge. Also updated `feature-index.md` to register FT-14E in the delivery tracker.

Pages created:

- [[wiki/sources/ft-14e-multi-session-agent-workspace]]
- [[wiki/entities/agent-session-persistence]]
- [[wiki/entities/use-agent-sessions-hook]]
- [[wiki/entities/session-list-panel]]
- [[wiki/entities/session-detail-panel]]
- [[wiki/entities/session-workspace]]
- [[wiki/concepts/bounded-concurrent-agent-session-lifecycle]]
- [[wiki/topics/agent-session-workspace]]

Pages updated:

- [[wiki/index.md]]
- [[wiki/entities/agent-session-manager]]
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/preload-bridge]]
- [[wiki/entities/ipc-channels]]
- [[wiki/entities/shared-types]]
- [[wiki/entities/dashboard-page]]
- [[wiki/entities/store-migration]]
- [[wiki/entities/electron-store]]
- [[wiki/entities/use-agent-session-hook]]
- [[wiki/entities/sessions-panel]]
- [[wiki/topics/agent-analysis-sessions]]
- [[wiki/topics/mcp-backed-agent-analysis]]
- [[wiki/topics/session-persistence-lifecycle]]

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
