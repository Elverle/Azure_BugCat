# Wiki Operation Log

| Date       | Action                     | Author         | Notes                                                                                           |
| ---------- | -------------------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| 2026-04-29 | Wiki structure initialized | Claude Code    | Project in pre-development, no source code yet                                                  |
| 2026-04-29 | scan FT-01                 | GitHub Copilot | Scanned FT-01 scaffold. Created 1 source, 9 entities, 3 concepts, 2 topics.                     |
| 2026-04-29 | scan FT-02                 | GitHub Copilot | Scanned FT-02 settings. Created 1 source, 10 entities, 2 concepts. Updated 3 entities, 1 topic. |
| 2026-04-30 | scan FT-03                 | GitHub Copilot | Scanned FT-03 ADO fetch. Created 1 source, 4 entities, 1 concept. Updated 2 entities.           |

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
