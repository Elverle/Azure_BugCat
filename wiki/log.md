# Wiki Operation Log

| Date       | Action                     | Author         | Notes                                                                                                                                 |
| ---------- | -------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-29 | Wiki structure initialized | Claude Code    | Project in pre-development, no source code yet                                                                                        |
| 2026-04-29 | scan FT-01                 | GitHub Copilot | Scanned FT-01 scaffold. Created 1 source, 9 entities, 3 concepts, 2 topics.                                                           |
| 2026-04-29 | scan FT-02                 | GitHub Copilot | Scanned FT-02 settings. Created 1 source, 10 entities, 2 concepts. Updated 3 entities, 1 topic.                                       |
| 2026-04-30 | scan FT-03                 | GitHub Copilot | Scanned FT-03 ADO fetch. Created 1 source, 4 entities, 1 concept. Updated 2 entities.                                                 |
| 2026-04-30 | scan FT-04                 | GitHub Copilot | Scanned FT-04 LLM provider. Created 1 source, 10 entities, 2 concepts, 1 topic. Updated 1 entity.                                     |
| 2026-04-30 | scan FT-05                 | GitHub Copilot | Scanned FT-05 dashboard. Created 1 source, 11 entities, 2 concepts, 1 topic. Updated 1 topic.                                         |
| 2026-04-30 | scan FT-06                 | GitHub Copilot | Scanned FT-06 drawer flow. Created 1 source, 3 entities, 1 concept. Updated 6 entities, 1 concept, 1 topic, 1 index.                  |
| 2026-05-01 | scan FT-07                 | GitHub Copilot | Scanned FT-07 session persistence. Created 1 source, 3 entities, 2 concepts, 1 topic. Updated 8 existing pages.                       |
| 2026-05-01 | scan FT-08                 | GitHub Copilot | Scanned FT-08 generic provider. Created 1 source, 1 entity. Updated LLM/settings/migration pages, index, and historical Copilot docs. |

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
- [[wiki/entities/copilot-provider]]
- [[wiki/entities/gemini-provider]]
- [[wiki/entities/llm-provider-factory]]
- [[wiki/entities/llm-service]]
- [[wiki/entities/response-validator]]
- [[wiki/entities/chunking-utility]]
- [[wiki/entities/llm-prompts]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/concepts/chunk-retry-pattern]]
- [[wiki/topics/llm-categorization-pipeline]]

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
- [[wiki/entities/copilot-provider]]
- [[wiki/concepts/llm-provider-abstraction]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/concepts/settings-persistence-flow]]
- [[wiki/topics/llm-categorization-pipeline]]
- [[wiki/sources/ft-02-settings]]
- [[wiki/sources/ft-04-llm-provider]]
