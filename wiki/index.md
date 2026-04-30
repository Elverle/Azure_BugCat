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

| #   | ID    | Descrizione                                  | Status |
| --- | ----- | -------------------------------------------- | ------ |
| 1   | FT-01 | Scaffold Electron + Infrastruttura Base      | Done   |
| 2   | FT-02 | Pagina Settings e Persistenza Configurazione | Done   |
| 3   | FT-03 | Azure DevOps Bug Fetching (Main Process)     | Done   |
| 4   | FT-04 | LLM Provider Abstraction e Categorizzazione  | Done   |

## Sources

- [[wiki/sources/ft-01-scaffold]] — FT-01 scaffold: electron-vite, React 18, IPC architecture, encrypted store (2026-04-29)
- [[wiki/sources/ft-02-settings]] — FT-02 Settings page: form validation, IPC persistence, test connections, UI primitives (2026-04-29)
- [[wiki/sources/ft-03-ado-fetch]] — FT-03 ADO bug fetching: WIQL query, batch fetch, field mapping, HTML→text, typed errors (2026-04-30)
- [[wiki/sources/ft-04-llm-provider]] — FT-04 LLM provider abstraction: 4 providers, chunking, retry, response validation, progressive IPC (2026-04-30)

## Entities

- [[wiki/entities/electron-main-process]] — Electron main process entry point and window management
- [[wiki/entities/electron-store]] — Encrypted electron-store with machine-id key
- [[wiki/entities/ipc-handlers]] — IPC handler registration (settings, session, ADO/LLM placeholders)
- [[wiki/entities/preload-bridge]] — contextBridge with typed whitelisted API
- [[wiki/entities/ipc-channels]] — Typed IPC channel constants (shared)
- [[wiki/entities/shared-types]] — Domain model types (BugItem, AppSettings, SessionData, TestConnectionResult, etc.)
- [[wiki/entities/topbar]] — Navigation topbar component (BugCat branding + nav)
- [[wiki/entities/app-layout]] — Root layout shell (Topbar + Outlet)
- [[wiki/entities/button-component]] — shadcn/ui Button with variants (manual install)
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

## Concepts

- [[wiki/concepts/ipc-security-model]] — Electron security: sandbox, context isolation, whitelisted channels, CSP
- [[wiki/concepts/electron-vite-build]] — Build pipeline: electron-vite config, TS split, electron-builder packaging
- [[wiki/concepts/tailwind-styling]] — Tailwind CSS + Inter font + shadcn/ui approach + cn() utility
- [[wiki/concepts/form-validation-pattern]] — Pure validation functions + React hook two-layer pattern (FT-02)
- [[wiki/concepts/settings-persistence-flow]] — Renderer → IPC → Main → encrypted electron-store flow (FT-02)
- [[wiki/concepts/ado-rest-api-pattern]] — ADO REST API consumption: layered architecture, batching, typed errors (FT-03)
- [[wiki/concepts/llm-provider-abstraction]] — Strategy + Factory pattern for multi-provider LLM abstraction (FT-04)
- [[wiki/concepts/chunk-retry-pattern]] — Chunked batch processing with exponential backoff retry (FT-04)

## Topics

- [[wiki/topics/electron-architecture]] — Three-process architecture, source structure, data flow
- [[wiki/topics/renderer-ui]] — React SPA: HashRouter routing, component tree, styling stack
- [[wiki/topics/llm-categorization-pipeline]] — End-to-end LLM categorization: IPC → chunking → provider → validation → progressive results

## Analyses

_(none yet)_
