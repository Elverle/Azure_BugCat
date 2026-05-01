# Bug Categorizer — Wiki Index

L'applicazione **Bug Categorizer** è un'applicazione desktop costruita con **Electron + React + TypeScript** per la categorizzazione automatica dei bug Azure DevOps tramite LLM.

### Struttura Wiki

| Directory   | Descrizione                                             |
| ----------- | ------------------------------------------------------- |
| `raw/`      | Documenti sorgente (PRD, design mockup, specs)          |
| `entities/` | Servizi, componenti, API, librerie                      |
| `concepts/` | Pattern, architetture, metodologie                      |
| `topics/`   | Argomenti tematici (pipeline di categorizzazione, ecc.) |
| `analyses/` | Risultati di investigazioni e confronti                 |
| `sources/`  | Riepiloghi per ogni modulo o documento scansionato      |

### Documenti Sorgente

| File                             | Descrizione                    |
| -------------------------------- | ------------------------------ |
| `content/bug-categorizer-prd.md` | Product Requirements Document  |
| `content/design.html`            | Design mockup dell'interfaccia |
| `content/prompt.md`              | Prompt definition              |

### Features

| #   | ID    | Descrizione                                            | Status |
| --- | ----- | ------------------------------------------------------ | ------ |
| 1   | FT-01 | Scaffold Electron + Infrastruttura Base                | Done   |
| 2   | FT-02 | Pagina Settings e Persistenza Configurazione           | Done   |
| 3   | FT-03 | Azure DevOps Bug Fetching (Main Process)               | Done   |
| 4   | FT-04 | LLM Provider Abstraction e Categorizzazione            | Done   |
| 5   | FT-05 | Dashboard Principale: Tabella, Filtri e Raggruppamenti | Done   |
| 6   | FT-06 | Pannello Dettaglio Bug (Drawer)                        | Done   |
| 7   | FT-07 | Persistenza Dati e Gestione Sessione                   | Done   |

## Sources

- [[wiki/sources/ft-01-scaffold]] — FT-01 scaffold: electron-vite, React 18, IPC architecture, encrypted store (2026-04-29)
- [[wiki/sources/ft-02-settings]] — FT-02 Settings page: form validation, IPC persistence, test connections, UI primitives (2026-04-29)
- [[wiki/sources/ft-03-ado-fetch]] — FT-03 ADO bug fetching: WIQL query, batch fetch, field mapping, HTML→text, typed errors (2026-04-30)
- [[wiki/sources/ft-04-llm-provider]] — FT-04 LLM provider abstraction: 4 providers, chunking, retry, response validation, progressive IPC (2026-04-30)
- [[wiki/sources/ft-05-dashboard]] — FT-05 dashboard: session-backed bug triage workspace with KPIs, filters, grouped views, and accessible collection controls (2026-04-30)
- [[wiki/sources/ft-06-bug-detail-drawer]] — FT-06 bug drawer: filtered-list drill-down, secure open-external IPC, and click-outside exclusion guard (2026-04-30)
- [[wiki/sources/ft-07-session-persistence]] — FT-07 persistence hardening: schema-versioned store bootstrap, reusable confirm dialog, session clear UX, and extracted date formatting (2026-05-01)

## Entities

- [[wiki/entities/electron-main-process]] — Electron main process entry point and window management
- [[wiki/entities/electron-store]] — Encrypted electron-store with machine-id key
- [[wiki/entities/store-migration]] — Versioned startup migration pipeline for persisted settings/session data (FT-07)
- [[wiki/entities/ipc-handlers]] — IPC handler registration (settings, session, ADO/LLM placeholders)
- [[wiki/entities/preload-bridge]] — contextBridge with typed whitelisted API
- [[wiki/entities/ipc-channels]] — Typed IPC channel constants (shared)
- [[wiki/entities/shared-types]] — Domain model types (BugItem, AppSettings, SessionData, TestConnectionResult, etc.)
- [[wiki/entities/topbar]] — Navigation topbar component (BugCat branding + nav)
- [[wiki/entities/app-layout]] — Root layout shell (Topbar + Outlet)
- [[wiki/entities/button-component]] — shadcn/ui Button with variants (manual install)
- [[wiki/entities/confirm-dialog]] — Reusable accessible confirmation modal for destructive or guarded actions (FT-07)
- [[wiki/entities/input-component]] — shadcn/ui Input component (FT-02)
- [[wiki/entities/label-component]] — shadcn/ui Label component (FT-02)
- [[wiki/entities/select-component]] — shadcn/ui Select component (FT-02)
- [[wiki/entities/textarea-component]] — shadcn/ui Textarea component (FT-02)
- [[wiki/entities/settings-page]] — Full settings page with ADO, LLM, and categories sections (FT-02)
- [[wiki/entities/ado-connection-section]] — ADO connection settings card (FT-02)
- [[wiki/entities/llm-provider-section]] — LLM provider settings card with conditional rendering (FT-02)
- [[wiki/entities/categories-section]] — Categories textarea editor card (FT-02)
- [[wiki/entities/use-settings-hook]] — Central settings state management hook (FT-02)
- [[wiki/entities/validation-utils]] — Pure validation functions for settings fields (FT-02)
- [[wiki/entities/ado-types]] — ADO interfaces, QueryStrategy, constants (FT-03)
- [[wiki/entities/ado-client]] — Low-level ADO HTTP client with auth and error mapping (FT-03)
- [[wiki/entities/ado-service]] — ADO orchestration: validate → query → batch → map (FT-03)
- [[wiki/entities/html-to-text]] — HTML→plain text conversion utility (FT-03)
- [[wiki/entities/llm-provider-interface]] — LLMProvider interface and config types (FT-04)
- [[wiki/entities/openai-provider]] — OpenAI SDK provider (gpt-4o) (FT-04)
- [[wiki/entities/anthropic-provider]] — Anthropic SDK provider (claude-sonnet-4-20250514) (FT-04)
- [[wiki/entities/copilot-provider]] — GitHub Copilot SDK provider (gpt-4.1) (FT-04)
- [[wiki/entities/gemini-provider]] — Google GenAI provider (gemini-2.5-flash) (FT-04)
- [[wiki/entities/llm-provider-factory]] — Factory function for LLM provider instantiation (FT-04)
- [[wiki/entities/llm-service]] — Bug categorization orchestrator with retry and progress (FT-04)
- [[wiki/entities/response-validator]] — LLM response validation with fence stripping and fallback (FT-04)
- [[wiki/entities/chunking-utility]] — Bug array chunk splitter (FT-04)
- [[wiki/entities/llm-prompts]] — System prompt and user message builders (FT-04)
- [[wiki/entities/dashboard-page]] — Home page for browsing, filtering, grouping, and re-categorizing bugs (FT-05)
- [[wiki/entities/dashboard-header]] — Dashboard title bar with session timestamps and Fetch/Categorize actions (FT-05)
- [[wiki/entities/kpi-cards]] — KPI strip for totals, active bugs, clusters, and top assignees (FT-05)
- [[wiki/entities/filter-bar]] — Debounced search + multi-select filter row + grouping controls (FT-05)
- [[wiki/entities/bug-table]] — Sortable 8-column bug table with keyboard-accessible headers and rows (FT-05)
- [[wiki/entities/bug-card]] — Card renderer for grouped bug exploration with deterministic tinting (FT-05)
- [[wiki/entities/bug-detail-drawer]] — Fixed right-side detail drawer with LLM reasoning, metadata, and prev/next navigation (FT-06)
- [[wiki/entities/group-accordion]] — Collapsible grouped container with count badges and ARIA wiring (FT-05)
- [[wiki/entities/multi-select-component]] — Custom searchable multi-select dropdown without external dependencies (FT-05)
- [[wiki/entities/use-bug-drawer-hook]] — Hook for selected bug state and filtered-list navigation inside the drawer (FT-06)
- [[wiki/entities/use-dashboard-hook]] — Renderer hook for session hydration, fetch/categorize actions, and progress subscription (FT-05)
- [[wiki/entities/dashboard-utils]] — Pure filter/sort/group/KPI utilities for the dashboard (FT-05)
- [[wiki/entities/date-format-utility]] — Pure `formatDate()` helper for renderer session timestamps (FT-07)
- [[wiki/entities/badge-color-utilities]] — Deterministic badge and tint color helpers for status/categories (FT-05)
- [[wiki/entities/open-external-ipc]] — Secure IPC contract for opening Azure DevOps work item URLs in the system browser (FT-06)

## Concepts

- [[wiki/concepts/ipc-security-model]] — Electron security: sandbox, context isolation, whitelisted channels, CSP
- [[wiki/concepts/electron-vite-build]] — Build pipeline: electron-vite config, TS split, electron-builder packaging
- [[wiki/concepts/tailwind-styling]] — Tailwind CSS + Inter font + shadcn/ui approach + cn() utility
- [[wiki/concepts/form-validation-pattern]] — Pure validation functions + React hook two-layer pattern (FT-02)
- [[wiki/concepts/settings-persistence-flow]] — Renderer → IPC → Main → encrypted electron-store flow (FT-02)
- [[wiki/concepts/schema-versioned-store-migration]] — Explicit schemaVersion bootstrap and ordered migration pipeline for persisted data (FT-07)
- [[wiki/concepts/ado-rest-api-pattern]] — ADO REST API consumption: layered architecture, batching, typed errors (FT-03)
- [[wiki/concepts/llm-provider-abstraction]] — Strategy + Factory pattern for multi-provider LLM abstraction (FT-04)
- [[wiki/concepts/chunk-retry-pattern]] — Chunked batch processing with exponential backoff retry (FT-04)
- [[wiki/concepts/dashboard-derivation-pipeline]] — useMemo-based pipeline for filtering, sorting, grouping, KPI calculation, and dependent filter reconciliation (FT-05)
- [[wiki/concepts/accessible-collection-controls]] — Project pattern for custom listbox, sortable table headers, and accordion controls with semantic HTML + ARIA (FT-05)
- [[wiki/concepts/accessible-confirmation-dialog]] — Focus-managed modal confirmation pattern for destructive actions (FT-07)
- [[wiki/concepts/click-outside-exclusion-pattern]] — Document-level outside-click closing with `data-bug-click` exclusion markers (FT-06)

## Topics

- [[wiki/topics/electron-architecture]] — Three-process architecture, source structure, data flow
- [[wiki/topics/renderer-ui]] — React SPA: HashRouter routing, component tree, styling stack
- [[wiki/topics/llm-categorization-pipeline]] — End-to-end LLM categorization: IPC → chunking → provider → validation → progressive results
- [[wiki/topics/dashboard-bug-exploration]] — Main triage workspace tying session data, dashboard derivation, filters, views, drawer drill-down, and categorization actions together
- [[wiki/topics/session-persistence-lifecycle]] — Startup migration, session hydration, timestamp display, and user-triggered session reset (FT-07)

## Analyses

_(none yet)_
