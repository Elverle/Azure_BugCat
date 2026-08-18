# Bug Categorizer — Wiki Index

L'applicazione **Bug Categorizer** è un'applicazione desktop costruita con **Electron + React + TypeScript** per la categorizzazione automatica dei bug Azure DevOps tramite LLM e il rilevamento di bug simili o duplicati all'interno delle categorie individuate.

### Struttura Wiki

| Directory   | Descrizione                                             |
| ----------- | ------------------------------------------------------- |
| `entities/` | Servizi, componenti, API, librerie                      |
| `concepts/` | Pattern, architetture, metodologie                      |
| `topics/`   | Argomenti tematici (pipeline di categorizzazione, ecc.) |
| `analyses/` | Risultati di investigazioni e confronti                 |
| `sources/`  | Riepiloghi per ogni modulo o documento scansionato      |

### Documenti Sorgente

I documenti di prodotto originali (PRD, mockup di design, definizione dei prompt) **non fanno parte del repository**: sono stati rimossi e non sono stati sostituiti da file tracciati. I punti di ingresso odierni sono il [`README.md`](../README.md) alla radice e [`feature-index.md`](../feature-index.md) per il tracciamento delle consegne, mentre le pagine `sources/` qui sotto documentano ogni feature come è stata effettivamente consegnata.

### Features

| #   | ID    | Descrizione                                               | Status |
| --- | ----- | --------------------------------------------------------- | ------ |
| 1   | FT-01 | Scaffold Electron + Infrastruttura Base                   | Done   |
| 2   | FT-02 | Pagina Settings e Persistenza Configurazione              | Done   |
| 3   | FT-03 | Azure DevOps Bug Fetching (Main Process)                  | Done   |
| 4   | FT-04 | LLM Provider Abstraction e Categorizzazione               | Done   |
| 5   | FT-05 | Dashboard Principale: Tabella, Filtri e Raggruppamenti    | Done   |
| 6   | FT-06 | Pannello Dettaglio Bug (Drawer)                           | Done   |
| 7   | FT-07 | Persistenza Dati e Gestione Sessione                      | Done   |
| 8   | FT-08 | GenericProvider OpenAI-compatible e rimozione Copilot     | Done   |
| 9   | FT-09 | Structured output JSON Schema per tutti i provider LLM    | Done   |
| 10  | FT-10 | AI Cluster - Similar Bug Detection                        | Done   |
| 11  | FT-11 | OpenRouter Provider (delivered on the official SDK, later rewritten on a shared fetch core) | Done   |
| 12  | FT-12 | Incremental Session Cache e Re-Categorizzazione Selettiva | Done   |
| 13  | FT-13 | Storico Chiusi - KPI storici per bug closed/done          | Done   |

Per il tracciamento operativo completo delle consegne, incluse minor e fix successive alle feature, consultare anche [`feature-index.md`](../feature-index.md), che usa i prefissi `FT-##`, `min-##` e `fix-##`.

> **Nota su FT-11** — la feature è viva, la sua implementazione no. L'SDK ufficiale OpenRouter è stato rimosso durante l'hardening production-ready: `OpenRouterProvider` è oggi una configurazione sottile sopra il core condiviso `openAiCompatibleChat()` di `provider-shared.ts`, e il rilevamento del routing-mismatch legge direttamente il body della risposta invece di appoggiarsi agli errori di validazione dell'SDK. Le pagine `sources/ft-11-openrouter-provider` ed `entities/openrouter-provider` sono state riscansionate il 2026-08-18 e ora descrivono l'implementazione attuale, mantenendo la delivery SDK originale come nota storica.

## Sources

- [[wiki/sources/ft-01-scaffold]] — FT-01 scaffold: electron-vite, React 18, IPC architecture, encrypted store (2026-04-29)
- [[wiki/sources/ft-02-settings]] — FT-02 Settings page: form validation, IPC persistence, test connections, UI primitives (2026-04-29)
- [[wiki/sources/ft-03-ado-fetch]] — FT-03 ADO bug fetching: WIQL query, batch fetch, field mapping, HTML→text, typed errors (2026-04-30)
- [[wiki/sources/ft-04-llm-provider]] — FT-04 LLM provider abstraction: 4 providers, chunking, retry, response validation, progressive IPC (2026-04-30)
- [[wiki/sources/ft-05-dashboard]] — FT-05 dashboard: session-backed bug triage workspace with KPIs, filters, grouped views, and accessible collection controls (2026-04-30)
- [[wiki/sources/ft-06-bug-detail-drawer]] — FT-06 bug drawer: filtered-list drill-down, secure open-external IPC, and click-outside exclusion guard (2026-04-30)
- [[wiki/sources/ft-07-session-persistence]] — FT-07 persistence hardening: schema-versioned store bootstrap, reusable confirm dialog, session clear UX, and extracted date formatting (2026-05-01)
- [[wiki/sources/ft-08-generic-provider]] — FT-08 generic provider: OpenAI-compatible fetch client, Generic settings UI, HTTPS base URL validation, and schema v2 migration from Copilot (2026-05-01)
- [[wiki/sources/ft-09-structured-output]] — FT-09 structured output: shared JSON Schemas, provider-native schema enforcement, simplified prompts, and temperature 0.1 standardization (2026-05-01)
- [[wiki/sources/ft-10-ai-cluster-similarity]] — FT-10 AI Cluster: macroCategory-scoped similar-bug detection with progress IPC, session persistence, and drawer drill-down (2026-05-01)
- [[wiki/sources/ft-11-openrouter-provider]] — FT-11 OpenRouter provider: delivered on the official SDK with json_schema structured output, routing-mismatch blocking error handling, and dashboard modal feedback (2026-05-03); the SDK adapter was later replaced by a shared fetch core, documented on the page alongside the original delivery
- [[wiki/sources/ft-12-incremental-session-cache]] — FT-12 incremental persistence: bugCatalog history, signature-based fetch merge, selective categorization, migration v3 backfill, and dual cleanup controls (2026-05-13)
- [[wiki/sources/ft-13-closed-bugs-history]] — FT-13 closed-history analytics: filtered catalog IPC, cleanup-baseline metadata, bug-level category detail, local row filtering, and resilient renderer states (2026-05-13)

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
- [[wiki/entities/llm-schemas]] — Shared JSON Schema registry for categorization and similar-bugs structured output (FT-09)
- [[wiki/entities/provider-shared-utilities]] — Shared provider module: config guards, timeout handling, schema metadata, test probes, and the `openAiCompatibleChat()` fetch core behind both the OpenRouter and generic providers (2026-05-03)
- [[wiki/entities/llm-error-policy]] — Shared classification of blocking vs recoverable LLM workflow failures (2026-05-03)
- [[wiki/entities/llm-json-utilities]] — Shared tolerant JSON extraction/parsing helpers for LLM outputs (2026-05-03)
- [[wiki/entities/openai-provider]] — OpenAI SDK provider (gpt-4o) (FT-04)
- [[wiki/entities/anthropic-provider]] — Anthropic SDK provider (claude-sonnet-4-20250514) (FT-04)
- [[wiki/entities/generic-provider]] — Generic OpenAI-compatible fetch provider with configurable base URL and model (FT-08)
- [[wiki/entities/gemini-provider]] — Google GenAI provider (gemini-2.5-flash) (FT-04)
- [[wiki/entities/openrouter-provider]] — OpenRouter provider: thin configuration over the shared OpenAI-compatible core, with the `require_parameters` routing guard and structured-output routing-mismatch detection read directly from the response body (FT-11, rewritten 2026-08-11 to drop the `@openrouter/sdk` dependency)
- [[wiki/entities/llm-provider-factory]] — Factory function for LLM provider instantiation (FT-04)
- [[wiki/entities/llm-service]] — Bug categorization orchestrator with retry and progress (FT-04)
- [[wiki/entities/similarity-service]] — Macro-category similarity orchestrator with per-category progress and partial failures (FT-10)
- [[wiki/entities/response-validator]] — LLM response validation with fence stripping and fallback (FT-04)
- [[wiki/entities/categorization-sentinels]] — Shared `__name__`-shaped machine sentinels for unresolved categorization states and the `isFailedCategorization` retry-safety predicate (2026-08-18)
- [[wiki/entities/labels-utility]] — Renderer-only mapping from categorization sentinels and `ErrorCode`s to display text (`sentinelLabel`, `errorLabel`) (2026-08-18)
- [[wiki/entities/chunking-utility]] — Bug array chunk splitter (FT-04)
- [[wiki/entities/llm-prompts]] — System prompt and user message builders (FT-04)
- [[wiki/entities/dashboard-page]] — Home page for browsing, filtering, grouping, and re-categorizing bugs (FT-05)
- [[wiki/entities/closed-bugs-page]] — Top-level historical KPI page for closed catalog bugs (FT-13)
- [[wiki/entities/dashboard-header]] — Dashboard title bar with session timestamps and Fetch/Categorize actions (FT-05)
- [[wiki/entities/kpi-cards]] — KPI strip for totals, active bugs, clusters, and top assignees (FT-05)
- [[wiki/entities/filter-bar]] — Debounced search + multi-select filter row + grouping controls (FT-05)
- [[wiki/entities/bug-table]] — Sortable 8-column bug table with keyboard-accessible headers and rows (FT-05)
- [[wiki/entities/bug-card]] — Card renderer for grouped bug exploration with deterministic tinting (FT-05)
- [[wiki/entities/bug-detail-drawer]] — Fixed right-side detail drawer with LLM reasoning, metadata, and prev/next navigation (FT-06)
- [[wiki/entities/ai-cluster-category-section]] — Collapsible per-category result section for AI Cluster (FT-10)
- [[wiki/entities/similarity-group-card]] — Similarity score/reason card with clickable bug list (FT-10)
- [[wiki/entities/catalog-merge-utility]] — Main-process utility for signature computation, catalog/session merge, selective categorization merge, and similarity lifecycle metadata (FT-12)
- [[wiki/entities/group-accordion]] — Collapsible grouped container with count badges and ARIA wiring (FT-05)
- [[wiki/entities/multi-select-component]] — Custom searchable multi-select dropdown without external dependencies (FT-05)
- [[wiki/entities/use-bug-drawer-hook]] — Hook for selected bug state and filtered-list navigation inside the drawer (FT-06)
- [[wiki/entities/use-dashboard-hook]] — Renderer hook for session hydration, fetch/categorize actions, and progress subscription (FT-05)
- [[wiki/entities/use-closed-bug-kpis-hook]] — Renderer hook for loading and deriving closed-history KPIs from a filtered catalog slice (FT-13)
- [[wiki/entities/use-ai-cluster-hook]] — Renderer hook for similarity hydration, analysis progress, and stale detection (FT-10)
- [[wiki/entities/dashboard-utils]] — Pure filter/sort/group/KPI utilities for the dashboard (FT-05)
- [[wiki/entities/closed-bug-kpis-utility]] — Pure KPI aggregation helpers for historical closed bugs (FT-13)
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
- [[wiki/concepts/provider-native-structured-output]] — Single logical schema contract translated into OpenAI, Anthropic, Gemini, and generic provider-native structured output primitives (FT-09)
- [[wiki/concepts/chunk-retry-pattern]] — Chunked batch processing with exponential backoff retry (FT-04)
- [[wiki/concepts/macro-category-scoped-similarity-analysis]] — Second-pass similarity workflow bounded by existing macro-categories (FT-10)
- [[wiki/concepts/dashboard-derivation-pipeline]] — useMemo-based pipeline for filtering, sorting, grouping, KPI calculation, and dependent filter reconciliation (FT-05)
- [[wiki/concepts/accessible-collection-controls]] — Project pattern for custom listbox, sortable table headers, and accordion controls with semantic HTML + ARIA (FT-05)
- [[wiki/concepts/accessible-confirmation-dialog]] — Focus-managed modal confirmation pattern for destructive actions (FT-07)
- [[wiki/concepts/click-outside-exclusion-pattern]] — Document-level outside-click closing with `data-bug-click` exclusion markers (FT-06)
- [[wiki/concepts/catalog-backed-selective-re-categorization]] — Dual-layer persistence pattern that reuses categorization only when catalog signatures still match current open-bug inputs (FT-12)
- [[wiki/concepts/sentinel-value-label-separation]] — Machine-value sentinels vs. renderer-only display labels, the v4 migration's sentinel conversion, and the `no-italian-strings` test guard (2026-08-18)
- [[wiki/concepts/renderer-safe-closed-catalog-projection]] — Read-model pattern that exposes only closed historical bugs and fetch metadata to the renderer (FT-13)

## Topics

- [[wiki/topics/electron-architecture]] — Three-process architecture, source structure, data flow
- [[wiki/topics/renderer-ui]] — React SPA: HashRouter routing, component tree, styling stack
- [[wiki/topics/llm-categorization-pipeline]] — End-to-end LLM categorization: IPC → chunking → provider → validation → progressive results
- [[wiki/topics/ai-cluster-similar-bug-detection]] — End-to-end similar-bug detection: dashboard tab → session gate → IPC → per-category LLM analysis → persisted results
- [[wiki/topics/dashboard-bug-exploration]] — Main triage workspace tying session data, dashboard derivation, filters, views, drawer drill-down, and categorization actions together
- [[wiki/topics/session-persistence-lifecycle]] — Startup migration, session hydration, timestamp display, and user-triggered session reset (FT-07)
- [[wiki/topics/historical-bug-catalog-lifecycle]] — End-to-end lifecycle of the persisted bug catalog across fetch, selective categorization, similarity, migration, and cleanup (FT-12)
- [[wiki/topics/closed-bug-history-analytics]] — Top-level historical analytics flow for closed catalog bugs, from filtered IPC to KPI rendering (FT-13)

## Analyses

- [[wiki/analyses/dashboard-categorization-state-recovery]] — Dashboard categorization state now survives route remounts, reports immediate cancel feedback, and surfaces readable IPC errors (2026-05-03)
- [[wiki/analyses/structured-output-routing-mismatch]] — OpenRouter routed a `json_schema` request to a backend that downgraded structured output support; categorization now stops and surfaces a modal error (2026-05-03)
- [[wiki/analyses/llm-provider-cleanup]] — Shared provider helpers, shared blocking-error policy, unified tolerant JSON parsing, and direct adapter test coverage for every current LLM provider (2026-05-03)
- [[wiki/analyses/cancel-categorization-flow]] — Categorization now supports user-triggered cancellation through abort-aware IPC and provider propagation, without persisting partial results (2026-05-03)
- [[wiki/analyses/readme-onboarding-guide]] — Root README now documents Windows/macOS packaging, Settings quickstart, and a more functional explanation of categorization and similarity workflows (2026-05-05)
