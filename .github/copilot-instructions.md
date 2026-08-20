# Azure BugCat

## Build, test, and lint
- `npm run dev` starts the Electron app with `electron-vite`.
- `npm run build` builds main, preload, and renderer bundles into `out/`.
- `npm run test` runs the full Vitest suite.
- `npx vitest run tests/main/ipc-handlers.spec.ts` runs a single main-process test file. Use the same pattern for renderer specs, for example `npx vitest run tests/renderer/DashboardPage.spec.tsx`.
- `npm run test:coverage` writes coverage output to `coverage/`.
- `npm run lint` is the current lint script, but it currently fails under ESLint 9 because the repo still uses `.eslintrc.cjs` instead of a flat `eslint.config.*` file.

## Architecture
- This is an Electron desktop app split across `src/main`, `src/preload`, `src/renderer/src`, and `src/shared`. `src/shared` is the cross-process contract layer for IPC channels and domain types.
- `src/main` owns the real application state. Settings and session data are persisted in encrypted `electron-store`, migrations run at startup, and renderer code reloads state through IPC after mutations instead of keeping its own persisted store.
- The main workflow is: configure ADO + LLM settings on the Settings page, fetch bugs from Azure DevOps into session state, categorize them in chunked LLM calls with progress/cancellation support, then optionally run a second LLM pass for similarity grouping.
- Bug descriptions follow a security pipeline: main converts ADO HTML to plain text for analysis but also keeps `descriptionHtml`; renderer sanitizes the HTML before display; main is the only layer allowed to open external links or fetch ADO attachment data URLs.

## Conventions
- Do renderer-to-main work only through the shared contract: update `src/shared/types.ts` / `src/shared/ipc-channels.ts`, expose it in `src/preload/index.ts`, implement it in `src/main/ipc-handlers.ts`, then consume it from a renderer hook or page.
- Keep renderer responsibilities split the way the repo already does it: pages compose hooks and UI, hooks own async/session state, and `src/renderer/src/lib` contains pure helpers like validation, sorting, grouping, and sanitization.
- `window.electronAPI` is intentionally loose at the boundary (`unknown` in preload/global typings). Cast and normalize in renderer hooks/pages using shared types; do not import main-process modules into renderer code.
- LLM integrations go through the existing provider pipeline: `provider-factory.ts`, `providers/*`, `schemas.ts`, and `response-validator.ts`. Structured JSON output is treated as a real contract, not just a prompt preference.
- Tests are split by runtime. `tests/main/**` run in Node and mock Electron/services, while `tests/renderer/**` run in jsdom and usually mock `window.electronAPI`. Coverage intentionally excludes app bootstraps and low-level `components/ui` primitives, and there are currently no Electron end-to-end tests.
- Respect the existing path aliases: `@main/*` for main/preload/tests, `@renderer/*` for renderer/tests, and `@shared/*` across both runtimes.
- The `wiki/` folder is a primary context source for this repository: consult it early to recover project context quickly, because it links the main concepts and the relevant parts of the codebase.
- After every completed code change, always review the affected pages under `wiki/` and update them before considering the task finished.
- Always use the `codebase-expert` agent after implementation to reread the updated codebase context and refresh the relevant `wiki/` documentation.
- Always keep `feature-index.md` updated before closing a task. Track every new entry with an explicit prefix: `FT-##` for features, `min-##` for minor improvements tied to an existing feature, and `fix-##` for fixes tied to an existing feature.
