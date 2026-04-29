---
title: 'Renderer UI'
type: topic
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-01-scaffold]]', '[[wiki/sources/ft-02-settings]]']
tags: [react, ui, routing, tailwind, shadcn-ui]
lang: en
---

## Overview

The renderer is a React 18 SPA bundled by Vite, styled with Tailwind CSS + Inter font, and using shadcn/ui components (manual). Routing uses `HashRouter` for Electron `file://` compatibility.

## Routing

| Path        | Component       | Status                 |
| ----------- | --------------- | ---------------------- |
| `/`         | `DashboardPage` | Placeholder (FT-05)    |
| `/settings` | `SettingsPage`  | ✅ Implemented (FT-02) |
| `*`         | `Navigate to /` | Catch-all redirect     |

All routes are wrapped in `AppLayout` (Topbar + Outlet).

## Component Tree

```
<App>
  <HashRouter>
    <Routes>
      <Route element={<AppLayout />}>     ← Topbar + scrollable main
        <Route path="/" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  </HashRouter>
</App>
```

## Components

| Component                                | Type             | Page                        |
| ---------------------------------------- | ---------------- | --------------------------- |
| [[wiki/entities/app-layout]]             | Layout shell     | Topbar + Outlet             |
| [[wiki/entities/topbar]]                 | Navigation       | BugCat brand + nav links    |
| [[wiki/entities/button-component]]       | UI primitive     | shadcn Button with variants |
| [[wiki/entities/input-component]]        | UI primitive     | shadcn Input                |
| [[wiki/entities/label-component]]        | UI primitive     | shadcn Label                |
| [[wiki/entities/select-component]]       | UI primitive     | shadcn Select               |
| [[wiki/entities/textarea-component]]     | UI primitive     | shadcn Textarea             |
| [[wiki/entities/settings-page]]          | Page             | Full settings page          |
| [[wiki/entities/ado-connection-section]] | Settings section | ADO connection card         |
| [[wiki/entities/llm-provider-section]]   | Settings section | LLM provider card           |
| [[wiki/entities/categories-section]]     | Settings section | Categories editor card      |
| [[wiki/entities/use-settings-hook]]      | Hook             | Settings state management   |
| [[wiki/entities/validation-utils]]       | Library          | Pure validation functions   |

## Styling Stack

See [[wiki/concepts/tailwind-styling]] for full details.

- **Tailwind CSS v3** — utility-first CSS
- **@fontsource/inter** — self-hosted Inter font (400, 500, 600, 700)
- **class-variance-authority** — component variant management
- **clsx + tailwind-merge** — `cn()` utility for conditional classes

## Entry Points

- `src/renderer/index.html` — HTML with CSP meta tag
- `src/renderer/src/main.tsx` — ReactDOM.createRoot with StrictMode
- `src/renderer/src/App.tsx` — Router and route definitions

## See also

- [[wiki/topics/electron-architecture]]
- [[wiki/concepts/tailwind-styling]]
