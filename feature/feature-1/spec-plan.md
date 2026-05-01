## Spec-Planner — Iteration 1

### Feature Context

- **Feature:** Scaffold Electron + Infrastruttura Base
- **Feature #:** feature-1
- **Feature ID:** FT-01
- **Feature Type:** full-stack (Electron Main + Renderer + Preload)
- **Priority:** Critica — prerequisito per tutte le altre feature
- **Dependencies:** Nessuna (greenfield)

---

## Part 1: Requirements

### Functional Requirements

#### FR-SCAFFOLD — Project Initialization

- **FR-SCAFFOLD-001:** Initialize electron-vite project
  - Description: Create an electron-vite project with React 18, TypeScript, and the canonical folder structure (`src/main`, `src/renderer`, `src/preload`, `src/shared`).
  - Acceptance Criteria: Given a fresh workspace, when `npm install` completes, then the project structure matches the canonical layout and TypeScript compiles without errors.
  - Priority: Must-Have

- **FR-SCAFFOLD-002:** Configure Tailwind CSS
  - Description: Install and configure Tailwind CSS v3 with the Inter font from Google Fonts. Configure `tailwind.config.ts` to scan renderer sources. Include base layer reset.
  - Acceptance Criteria: Given the renderer process, when a Tailwind utility class is used in a React component, then the class is applied correctly at runtime.
  - Priority: Must-Have

- **FR-SCAFFOLD-003:** Configure shadcn/ui
  - Description: Initialize shadcn/ui (or Radix UI primitives) in the renderer, configured to work with Tailwind. At minimum, install the `Button` and `NavigationMenu` (or equivalent) components.
  - Acceptance Criteria: Given a shadcn/ui component is imported, when rendered, then it displays correctly with Tailwind styling.
  - Priority: Must-Have

- **FR-SCAFFOLD-004:** Configure path aliases
  - Description: Set up TypeScript path aliases (`@main/*`, `@renderer/*`, `@preload/*`, `@shared/*`) in `tsconfig.json` files and the Vite/electron-vite config so imports resolve at compile time and runtime.
  - Acceptance Criteria: Given an import using `@shared/types`, when the project compiles, then the import resolves correctly.
  - Priority: Must-Have

#### FR-IPC — IPC Architecture

- **FR-IPC-001:** Preload script with contextBridge
  - Description: Create a preload script that uses `contextBridge.exposeInMainWorld` to expose a typed `electronAPI` object to the renderer. Node integration must be disabled; context isolation must be enabled.
  - Acceptance Criteria: Given the renderer window, when `window.electronAPI` is accessed, then the exposed methods are available. When `window.require` is accessed, then it is `undefined`.
  - Priority: Must-Have

- **FR-IPC-002:** Typed IPC channels
  - Description: Define a typed IPC channel map in `src/shared/ipc-channels.ts` listing all channel names as constants. Create typed invoke/on wrappers in the preload script and typed handler registration in main.
  - Acceptance Criteria: Given a new IPC channel is added to the shared map, when main registers a handler and renderer invokes it, then type safety is enforced at compile time on both sides.
  - Priority: Must-Have

- **FR-IPC-003:** Boilerplate IPC round-trip
  - Description: Implement a sample `ping` IPC channel: renderer invokes `electronAPI.ping()`, main handler returns `"pong"`. This proves the IPC pipeline works end-to-end.
  - Acceptance Criteria: Given the app is running, when `electronAPI.ping()` is called from the renderer console, then it returns `"pong"`.
  - Priority: Must-Have

#### FR-STORE — Encrypted Persistence

- **FR-STORE-001:** electron-store with encryption
  - Description: Configure `electron-store` in the main process with an `encryptionKey` derived from `node-machine-id` (machine-specific). Define a typed store schema for `AppSettings`.
  - Acceptance Criteria: Given a value is written to the store, when the JSON file on disk is inspected, then the values are encrypted. When the app restarts on the same machine, then the value is readable.
  - Priority: Must-Have

- **FR-STORE-002:** IPC bridge for store access
  - Description: Expose `store:get` and `store:set` IPC channels so the renderer can read/write settings through the preload bridge, without direct filesystem access.
  - Acceptance Criteria: Given the renderer calls `electronAPI.storeGet('testKey')`, when a value was previously set via `electronAPI.storeSet('testKey', 'hello')`, then `"hello"` is returned.
  - Priority: Must-Have

#### FR-SHELL — Application Shell & Navigation

- **FR-SHELL-001:** App shell layout
  - Description: Create a React layout component with a fixed topbar and a content area. The body uses `bg-gray-50`. The content area renders the active route.
  - Acceptance Criteria: Given the app is running, when the window renders, then the topbar is fixed at the top and the content area fills the remaining space with a gray-50 background.
  - Priority: Must-Have

- **FR-SHELL-002:** Topbar component
  - Description: Create a topbar matching design.html: white background, `border-b border-gray-200`, blue-700 branding with bug icon and text "BugCat", navigation items "Dashboard" and "Settings" with active state indicator (blue-700 text + bottom border).
  - Acceptance Criteria: Given the app is running, when viewing the topbar, then it matches the design.html reference: Inter font, blue-700 branding, nav items with active state.
  - Priority: Must-Have

- **FR-SHELL-003:** Client-side routing
  - Description: Implement client-side routing (react-router-dom or equivalent) with two routes: `/` → Dashboard page, `/settings` → Settings page. Navigation items in the topbar link to these routes. Both pages render placeholder content.
  - Acceptance Criteria: Given the user clicks "Settings" in the topbar, when the route changes, then the Settings placeholder is displayed and the nav item shows active state. Same for Dashboard.
  - Priority: Must-Have

#### FR-BUILD — Build & Package

- **FR-BUILD-001:** npm scripts
  - Description: Configure npm scripts: `dev` (starts electron-vite dev server with HMR), `build` (compiles for production), `package` (runs electron-builder to produce distributable).
  - Acceptance Criteria: Given a clean project, when `npm run dev` is executed, then the Electron app launches with HMR. When `npm run build` is executed, then production output is generated.
  - Priority: Must-Have

- **FR-BUILD-002:** electron-builder configuration
  - Description: Configure electron-builder in `electron-builder.yml` (or `package.json`) for Windows (NSIS), macOS (DMG), and Linux (AppImage). App name: "BugCat", app ID: `com.gversino.bugcat`.
  - Acceptance Criteria: Given `npm run package` is executed on Windows, then a `.exe` installer is produced in the `dist` folder.
  - Priority: Must-Have

#### FR-LINT — Code Quality

- **FR-LINT-001:** ESLint + Prettier
  - Description: Configure ESLint with TypeScript and React rules. Configure Prettier. Add npm scripts `lint` and `format`. Ensure they cover `src/`.
  - Acceptance Criteria: Given the project, when `npm run lint` is executed, then ESLint runs without errors on the boilerplate code. When `npm run format` is executed, then Prettier formats files.
  - Priority: Must-Have

#### FR-TYPES — Shared TypeScript Types

- **FR-TYPES-001:** Shared type definitions
  - Description: Create `src/shared/types.ts` with all shared types from the PRD: `BugItem`, `CategorizedBug`, `AppSettings`, `LLMProviderType` (enum), `SessionData`, `AppError`, `ErrorCode` (enum), `ChunkProgress`. These types serve as the contract between Main and Renderer.
  - Acceptance Criteria: Given the types file, when imported from both main and renderer code, then TypeScript compiles without errors.
  - Priority: Must-Have

---

### Non-Functional Requirements

- **NFR-SEC-001:** Node integration disabled in renderer (`nodeIntegration: false`, `contextIsolation: true`). No `remote` module. Preload exposes only whitelisted APIs.
- **NFR-SEC-002:** Encryption key for electron-store derived from machine ID — not hardcoded.
- **NFR-SEC-003:** No credentials or secrets accessible from renderer process. Store operations go through IPC only.
- **NFR-PERF-001:** `npm run dev` cold start < 10 seconds.
- **NFR-PERF-002:** HMR reload < 2 seconds for renderer changes.
- **NFR-DX-001:** Path aliases (`@shared/*`, etc.) resolve in IDE (VS Code) and at build time.
- **NFR-DX-002:** Single `npm install` with no manual post-install steps.
- **NFR-COMPAT-001:** electron-builder configured for Windows, macOS, Linux (actual build on current OS only).

---

### Constraints

- **C-001:** Must use `electron-vite` (not raw Vite + Electron or Electron Forge).
- **C-002:** React 18 (not 19) — stable and proven with Electron.
- **C-003:** Tailwind CSS v3 (v4 has compatibility concerns with electron-vite).
- **C-004:** Electron 30+ (latest stable).
- **C-005:** No database in FT-01 — only electron-store for config. SQLite deferred to FT-07.
- **C-006:** Font Inter loaded locally (bundled) or via Google Fonts in the renderer HTML.

---

### Assumptions

- **A-001:** Developer machine has Node.js 20+ and npm 9+ installed.
- **A-002:** `electron-vite` CLI (`npm create @quick-start/electron`) generates a valid base scaffold that we can adapt.
- **A-003:** shadcn/ui CLI works within the electron-vite renderer directory structure (may require manual adaptation of `components.json` paths).
- **A-004:** `node-machine-id` works on Windows/macOS/Linux without native compilation issues.

---

### Out of Scope

- Settings form UI (FT-02)
- Azure DevOps API integration (FT-03)
- LLM provider implementations (FT-04)
- Dashboard data views (FT-05)
- Bug detail drawer (FT-06)
- Session persistence / SQLite (FT-07)
- Unit/E2E testing framework setup (deferred; placeholder npm script OK)
- Auto-update (v2)
- Dark mode (v2)

---

### Edge Cases

| Scenario                                         | Expected Behavior                                                         | Related Requirement       |
| ------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------- |
| electron-store JSON file corrupted on disk       | App starts without crash; store reinitializes with defaults; logs warning | FR-STORE-001              |
| `node-machine-id` fails (containers, unusual OS) | Fallback to a static key with console warning                             | FR-STORE-001, NFR-SEC-002 |
| User navigates to unknown route                  | Redirect to `/` (Dashboard)                                               | FR-SHELL-003              |
| Window resized to very small dimensions          | Topbar remains usable; content area scrolls                               | FR-SHELL-001              |
| `npm run package` on non-Windows OS              | Produces platform-native distributable (not Windows exe)                  | FR-BUILD-002              |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 13
- **Parallelizable:** 9 (69%)
- **Execution Waves:** 4

### Execution Waves

#### Wave 1 — Project Bootstrap

**Execution:** SEQUENTIAL (single foundational task)

| Task ID | Type  | Title                            | Description                                                                         | Files                                                                                                                                | Depends On | Complexity |
| ------- | ----- | -------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ---------- |
| T-001   | SETUP | Initialize electron-vite project | Scaffold project with electron-vite CLI, install core deps, set up folder structure | `package.json`, `electron.vite.config.ts`, `tsconfig.*.json`, `src/main/index.ts`, `src/renderer/index.html`, `src/preload/index.ts` | None       | L          |

#### Wave 2 — Configuration & Foundation

**Execution:** PARALLEL (all tasks independent after T-001)

| Task ID | Type      | Title                     | Description                                                                  | Files                                                                                 | Depends On | Complexity |
| ------- | --------- | ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------- | ---------- |
| T-002   | SETUP     | Tailwind CSS + Inter font | Install & configure Tailwind CSS, add Inter font, configure content paths    | `tailwind.config.ts`, `postcss.config.js`, `src/renderer/assets/main.css`             | T-001      | S          |
| T-003   | SETUP     | ESLint + Prettier         | Configure ESLint (TS + React), Prettier, add lint/format scripts             | `.eslintrc.cjs`, `.prettierrc`, `package.json` (scripts)                              | T-001      | S          |
| T-004   | SETUP     | Path aliases              | Configure TS path aliases and electron-vite resolve aliases                  | `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`, `electron.vite.config.ts` | T-001      | S          |
| T-005   | IMPLEMENT | Shared TypeScript types   | Create all shared types from PRD: BugItem, CategorizedBug, AppSettings, etc. | `src/shared/types.ts`                                                                 | T-001      | M          |
| T-006   | IMPLEMENT | IPC channel definitions   | Define typed IPC channel constants and type map                              | `src/shared/ipc-channels.ts`                                                          | T-001      | S          |
| T-007   | SETUP     | electron-builder config   | Configure electron-builder for Win/macOS/Linux, app metadata, npm scripts    | `electron-builder.yml`, `package.json` (scripts, build config)                        | T-001      | S          |

#### Wave 3 — Core Infrastructure

**Execution:** PARALLEL (T-008 ∥ T-009 ∥ T-010, after Wave 2)

| Task ID | Type      | Title                             | Description                                                                                                                | Files                                                                                           | Depends On   | Complexity |
| ------- | --------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------ | ---------- |
| T-008   | IMPLEMENT | Preload script + contextBridge    | Implement preload with typed contextBridge exposing electronAPI (ping, store:get, store:set)                               | `src/preload/index.ts`, `src/preload/index.d.ts`                                                | T-005, T-006 | M          |
| T-009   | IMPLEMENT | electron-store with encryption    | Configure typed electron-store in main, derive encryptionKey from node-machine-id, register IPC handlers for store get/set | `src/main/store.ts`, `src/main/index.ts`                                                        | T-005, T-006 | M          |
| T-010   | IMPLEMENT | shadcn/ui setup + base components | Initialize shadcn/ui, configure components.json paths, install Button component                                            | `components.json`, `src/renderer/src/lib/utils.ts`, `src/renderer/src/components/ui/button.tsx` | T-002, T-004 | M          |

#### Wave 4 — App Shell & Integration

**Execution:** PARALLEL (T-011 ∥ T-012, then T-013)

| Task ID | Type      | Title                          | Description                                                                                                       | Files                                                                                                                                          | Depends On                 | Complexity |
| ------- | --------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------- |
| T-011   | IMPLEMENT | Topbar + Layout component      | Create Topbar matching design.html (BugCat branding, nav items) and Layout shell (topbar + outlet)                | `src/renderer/src/components/layout/Topbar.tsx`, `src/renderer/src/components/layout/Layout.tsx`                                               | T-010                      | M          |
| T-012   | IMPLEMENT | Routing + placeholder pages    | Set up react-router-dom with `/` and `/settings` routes, Dashboard and Settings placeholder pages                 | `src/renderer/src/App.tsx`, `src/renderer/src/pages/DashboardPage.tsx`, `src/renderer/src/pages/SettingsPage.tsx`, `src/renderer/src/main.tsx` | T-010                      | M          |
| T-013   | INTEGRATE | Main process wiring + IPC ping | Wire main process: create BrowserWindow with preload, register IPC handlers (ping + store), verify end-to-end IPC | `src/main/index.ts`                                                                                                                            | T-008, T-009, T-011, T-012 | M          |

---

### Critical Path

T-001 → T-005 → T-008 → T-013 (4 tasks, serial bottleneck)

Parallel alternative path: T-001 → T-002 → T-010 → T-011/T-012 → T-013

Both paths converge at T-013 (final integration). Overall critical path length: **4–5 tasks**.

---

### Task Details

#### T-001: Initialize electron-vite project

- **Type:** SETUP
- **Wave:** 1 — SEQUENTIAL
- **Implementation Notes:**
  1. Run `npm create @quick-start/electron@latest bug-categorizer -- --template react-ts` in a temp location, then move/adapt files into the workspace root (since the workspace already exists).
  2. Alternatively, manually scaffold: create `package.json` with electron-vite deps, `electron.vite.config.ts`, and the `src/main`, `src/renderer`, `src/preload` directory structure.
  3. Ensure `src/shared/` directory is created for shared types.
  4. Install core dependencies: `electron`, `electron-vite`, `react`, `react-dom`, `@types/react`, `@types/react-dom`, `typescript`, `vite`.
  5. Configure `tsconfig.json` (root), `tsconfig.node.json` (main/preload), `tsconfig.web.json` (renderer).
  6. Create minimal `src/main/index.ts` (BrowserWindow creation, loads renderer), `src/preload/index.ts` (stub), `src/renderer/index.html`, `src/renderer/src/main.tsx`, `src/renderer/src/App.tsx`.
  7. Verify `npm run dev` launches the Electron window.
- **Acceptance Criteria:** `npm install && npm run dev` opens an Electron window rendering a React component.
- **Testing Approach:** Manual — verify window opens.
- **Output:** Full project scaffold, all config files, minimal running app.

#### T-002: Tailwind CSS + Inter font

- **Type:** SETUP
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Install `tailwindcss`, `postcss`, `autoprefixer` as dev dependencies.
  2. Create `tailwind.config.ts` with content paths pointing to `src/renderer/src/**/*.{ts,tsx}`.
  3. Extend theme: `fontFamily: { sans: ['Inter', ...defaultTheme.fontFamily.sans] }`.
  4. Create `postcss.config.js` with tailwind and autoprefixer plugins.
  5. Add `@tailwind base; @tailwind directives` to `src/renderer/src/assets/main.css`.
  6. Add Inter font: `<link>` in `src/renderer/index.html` or install `@fontsource/inter` and import it.
  7. Set `body { font-family: 'Inter', sans-serif; }` as base style.
- **Acceptance Criteria:** Tailwind utility classes render correctly; Inter font is applied to all text.
- **Testing Approach:** Visual — verify font and utility classes.
- **Output:** Tailwind config, PostCSS config, base CSS.

#### T-003: ESLint + Prettier

- **Type:** SETUP
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Install `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `prettier`, `eslint-config-prettier`.
  2. Create `.eslintrc.cjs` with TypeScript + React config.
  3. Create `.prettierrc` with project conventions (singleQuote, semi, trailingComma).
  4. Add scripts to `package.json`: `"lint": "eslint src/ --ext .ts,.tsx"`, `"format": "prettier --write src/"`.
  5. Verify `npm run lint` passes on boilerplate code.
- **Acceptance Criteria:** `npm run lint` and `npm run format` execute successfully.
- **Testing Approach:** Run both scripts.
- **Output:** ESLint config, Prettier config, npm scripts.

#### T-004: Path aliases

- **Type:** SETUP
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. In `tsconfig.json` (or relevant tsconfig files), add paths:
     - `@shared/*` → `src/shared/*`
     - `@main/*` → `src/main/*`
     - `@renderer/*` → `src/renderer/src/*`
     - `@preload/*` → `src/preload/*`
  2. In `electron.vite.config.ts`, add `resolve.alias` entries for renderer (Vite handles renderer) and configure main/preload aliases.
  3. Verify a test import using `@shared/types` resolves.
- **Acceptance Criteria:** Aliased imports compile and resolve at runtime.
- **Testing Approach:** Add a test import, compile successfully.
- **Output:** Updated tsconfig files, updated vite config.

#### T-005: Shared TypeScript types

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `src/shared/types.ts`.
  2. Define all types from PRD Section 11:
     - `enum LLMProviderType { OpenAI, Anthropic, GitHubCopilot, Gemini }`
     - `enum ErrorCode { ADO_AUTH, ADO_NOT_FOUND, ADO_EMPTY, ADO_TIMEOUT, LLM_AUTH, LLM_RATE_LIMIT, LLM_TIMEOUT, LLM_PARSE_ERROR, STORE_ERROR, UNKNOWN }`
     - `interface BugItem { id: number; title: string; state: string; assignee: string; areaPath: string; description: string; priority: number; createdDate: string; updatedDate: string; tags: string[] }`
     - `interface CategorizedBug extends BugItem { macroCategory: string; subCategory: string; categoryReason: string; categorizedAt: string }`
     - `interface AppSettings { orgUrl: string; projectName: string; queryId: string; topN: number; chunkSize: number; llmProvider: LLMProviderType; apiKey?: string; pat: string; categories: string[]; copilotAuthStatus?: string }`
     - `interface SessionData { bugs: CategorizedBug[]; fetchedAt: string; categorizedAt?: string }`
     - `interface AppError { code: ErrorCode; message: string; details?: unknown }`
     - `interface ChunkProgress { total: number; completed: number; currentChunk: CategorizedBug[] }`
  3. Export all types.
- **Acceptance Criteria:** File compiles; types importable from main and renderer.
- **Testing Approach:** TypeScript compilation.
- **Output:** `src/shared/types.ts`.

#### T-006: IPC channel definitions

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `src/shared/ipc-channels.ts`.
  2. Define channel name constants: `IPC_CHANNELS = { PING: 'ipc:ping', STORE_GET: 'store:get', STORE_SET: 'store:set' } as const`.
  3. Define a type map: `IpcChannelMap` that maps channel names to `{ request: ..., response: ... }` types for compile-time safety.
  4. Export everything.
- **Acceptance Criteria:** Channel names are used consistently in preload and main.
- **Testing Approach:** TypeScript compilation.
- **Output:** `src/shared/ipc-channels.ts`.

#### T-007: electron-builder configuration

- **Type:** SETUP
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Create `electron-builder.yml` at project root.
  2. Configure: `appId: com.gversino.bugcat`, `productName: BugCat`.
  3. Add platform targets: `win: { target: nsis }`, `mac: { target: dmg }`, `linux: { target: AppImage }`.
  4. Configure `directories: { output: dist, buildResources: build }`.
  5. Add `"package": "electron-vite build && electron-builder --config electron-builder.yml"` to npm scripts.
  6. Ensure `build` script is `"electron-vite build"`.
- **Acceptance Criteria:** `npm run build` succeeds. `npm run package` produces output in `dist/`.
- **Testing Approach:** Run build script.
- **Output:** `electron-builder.yml`, updated `package.json` scripts.

#### T-008: Preload script + contextBridge

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Edit `src/preload/index.ts`:
     - Import `contextBridge`, `ipcRenderer` from `electron`.
     - Import channel constants from `@shared/ipc-channels`.
     - Expose `electronAPI` via `contextBridge.exposeInMainWorld`:
       - `ping: () => ipcRenderer.invoke(IPC_CHANNELS.PING)`
       - `storeGet: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.STORE_GET, key)`
       - `storeSet: (key: string, value: unknown) => ipcRenderer.invoke(IPC_CHANNELS.STORE_SET, key, value)`
  2. Create `src/preload/index.d.ts` with type declarations for `window.electronAPI`.
  3. Ensure the `ElectronAPI` interface matches what's exposed.
- **Acceptance Criteria:** `window.electronAPI` is available in renderer with correct types.
- **Testing Approach:** Console test in dev tools.
- **Output:** `src/preload/index.ts`, `src/preload/index.d.ts`.

#### T-009: electron-store with encryption

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Install `electron-store` and `node-machine-id`.
  2. Create `src/main/store.ts`:
     - Import `Store` from `electron-store`, `machineIdSync` from `node-machine-id`.
     - Define store schema matching `AppSettings` with defaults.
     - Create store instance: `new Store({ encryptionKey: machineIdSync(), schema })`.
     - Handle corruption: wrap in try/catch, if store init fails, delete the corrupted file and reinitialize.
     - Export `getStore()` function.
  3. Register IPC handlers in main:
     - `ipcMain.handle(IPC_CHANNELS.STORE_GET, (_, key) => store.get(key))`
     - `ipcMain.handle(IPC_CHANNELS.STORE_SET, (_, key, value) => store.set(key, value))`
  4. Register `ipcMain.handle(IPC_CHANNELS.PING, () => 'pong')`.
- **Acceptance Criteria:** Store persists encrypted data; IPC get/set works; ping returns 'pong'.
- **Testing Approach:** Manual — set a value, restart app, get the value.
- **Output:** `src/main/store.ts`, updated `src/main/index.ts`.

#### T-010: shadcn/ui setup + base components

- **Type:** IMPLEMENT
- **Wave:** 3 — PARALLEL
- **Implementation Notes:**
  1. Install `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`.
  2. Create `src/renderer/src/lib/utils.ts` with the standard `cn()` helper.
  3. Create `components.json` at the renderer root (or project root) pointing to the correct paths.
  4. Manually add the `Button` component from shadcn/ui to `src/renderer/src/components/ui/button.tsx` (copy from shadcn source, adapt imports).
  5. Configure `tailwind.config.ts` with shadcn/ui CSS variables and color scheme (extend with the design.html palette).
  6. Add CSS variables for shadcn/ui theming to `main.css`.
- **Acceptance Criteria:** `<Button>` component renders correctly with proper styling.
- **Testing Approach:** Visual verification.
- **Output:** `components.json`, `utils.ts`, `button.tsx`, updated Tailwind config, updated CSS.

#### T-011: Topbar + Layout component

- **Type:** IMPLEMENT
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Create `src/renderer/src/components/layout/Topbar.tsx`:
     - White bg, `border-b border-gray-200`, flex row.
     - Left: blue-700 bug icon (lucide-react `Bug` icon) + "BugCat" bold text.
     - Center-left: nav links "Dashboard" and "Settings" using `react-router-dom` `NavLink`.
     - Active state: `text-blue-700 border-b-2 border-blue-700`.
     - Inactive: `text-gray-500 hover:text-gray-900`.
     - Right: placeholder for project info / avatar (static for now).
  2. Create `src/renderer/src/components/layout/Layout.tsx`:
     - Flex column, full height.
     - `<Topbar />` fixed at top.
     - `<Outlet />` fills remaining space with `bg-gray-50 overflow-y-auto`.
  3. Match spacing, typography weights, and visual hierarchy from design.html.
- **Acceptance Criteria:** Topbar visually matches design.html. Active nav item is highlighted.
- **Testing Approach:** Visual comparison with design.html.
- **Output:** `Topbar.tsx`, `Layout.tsx`.

#### T-012: Routing + placeholder pages

- **Type:** IMPLEMENT
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Install `react-router-dom`.
  2. Create `src/renderer/src/pages/DashboardPage.tsx`:
     - Placeholder: heading "Bug Triage" and subtitle text, matching design.html header area.
     - Empty state card: "No bugs loaded. Configure settings and fetch bugs."
  3. Create `src/renderer/src/pages/SettingsPage.tsx`:
     - Placeholder: heading "Settings".
     - Card with text: "Settings form will be implemented in FT-02."
  4. Update `src/renderer/src/App.tsx`:
     - Set up `BrowserRouter` (or `HashRouter` for Electron compatibility) with routes.
     - Route `/` → `DashboardPage` inside `Layout`.
     - Route `/settings` → `SettingsPage` inside `Layout`.
     - Catch-all `*` → redirect to `/`.
  5. Update `src/renderer/src/main.tsx` to render `<App />`.
- **Acceptance Criteria:** Both routes render their pages. Unknown routes redirect to Dashboard.
- **Testing Approach:** Click nav items, verify route changes.
- **Output:** `App.tsx`, `DashboardPage.tsx`, `SettingsPage.tsx`, updated `main.tsx`.

#### T-013: Main process wiring + IPC ping

- **Type:** INTEGRATE
- **Wave:** 4 — SEQUENTIAL (after T-008, T-009, T-011, T-012)
- **Implementation Notes:**
  1. Update `src/main/index.ts`:
     - Create BrowserWindow with: `nodeIntegration: false`, `contextIsolation: true`, `preload: path.join(__dirname, '../preload/index.js')`.
     - Set reasonable default size (1280×800).
     - Load renderer URL in dev, file in production.
  2. Import and initialize store from `src/main/store.ts`.
  3. Register all IPC handlers (ping, store:get, store:set).
  4. Verify end-to-end: launch app, open devtools, run `window.electronAPI.ping()` → expect "pong".
  5. Verify store: `window.electronAPI.storeSet('test', 'hello')` then `window.electronAPI.storeGet('test')` → expect "hello". Restart, repeat get → still "hello".
  6. Verify routing: click nav items, routes change.
  7. Final cleanup: remove any leftover template code from electron-vite scaffold.
- **Acceptance Criteria:** All 5 acceptance criteria from the feature pass.
- **Testing Approach:** Manual end-to-end verification.
- **Output:** Finalized `src/main/index.ts`, verified working app.

---

### Risk Register

| Risk                                                                                | Impact                               | Likelihood | Mitigation                                                           |
| ----------------------------------------------------------------------------------- | ------------------------------------ | ---------- | -------------------------------------------------------------------- |
| electron-vite template structure changes between versions                           | Medium — scaffold may not match docs | Low        | Pin electron-vite version; adapt manually if needed                  |
| shadcn/ui CLI doesn't work in electron-vite renderer subdir                         | Low — manual component copy works    | Medium     | Plan for manual component installation (already in task notes)       |
| `node-machine-id` requires native compilation on some platforms                     | Medium — blocks encrypted store      | Low        | Use `{ raw: false }` option; fallback to OS-specific alternatives    |
| Tailwind CSS purge misconfigured for electron-vite output                           | Low — styling breaks in production   | Medium     | Test `npm run build` output early; configure content paths carefully |
| `HashRouter` vs `BrowserRouter` — Electron file:// protocol may break BrowserRouter | Medium — routing fails in production | Medium     | Use `HashRouter` for Electron compatibility                          |
| electron-store encryption key tied to machine — store not portable                  | Low — by design                      | N/A        | Document: this is intentional per PRD security requirements          |

---

### Completeness Assessment

- **Functional coverage:** High — all PRD FT-01 scope items mapped to requirements and tasks.
- **Non-functional coverage:** High — security (IPC isolation, encrypted store), DX (aliases, linting), build (cross-platform) all covered.
- **Task-to-requirement mapping:** Complete — every FR maps to at least one task.

| Requirement     | Tasks        |
| --------------- | ------------ |
| FR-SCAFFOLD-001 | T-001        |
| FR-SCAFFOLD-002 | T-002        |
| FR-SCAFFOLD-003 | T-010        |
| FR-SCAFFOLD-004 | T-004        |
| FR-IPC-001      | T-008        |
| FR-IPC-002      | T-006, T-008 |
| FR-IPC-003      | T-009, T-013 |
| FR-STORE-001    | T-009        |
| FR-STORE-002    | T-009, T-008 |
| FR-SHELL-001    | T-011        |
| FR-SHELL-002    | T-011        |
| FR-SHELL-003    | T-012        |
| FR-BUILD-001    | T-001, T-007 |
| FR-BUILD-002    | T-007        |
| FR-LINT-001     | T-003        |
| FR-TYPES-001    | T-005        |

---

### Status

**READY FOR APPROVAL**

---

## Questions for User

1. **HashRouter vs BrowserRouter:** Electron's `file://` protocol can break `BrowserRouter` in production builds. Plan is to use `HashRouter` — acceptable?
2. **Font loading strategy:** Prefer bundling Inter via `@fontsource/inter` (offline-capable, no external requests) or Google Fonts CDN `<link>` tag? Recommendation: `@fontsource/inter` for a desktop app.
3. **shadcn/ui component installation:** The shadcn CLI may not work directly in the electron-vite renderer subdirectory. Plan is to manually copy component source files instead. Acceptable?
