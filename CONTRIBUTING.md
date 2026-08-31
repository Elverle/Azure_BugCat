# Contributing to Azure BugCat

## Setup

```bash
git clone https://github.com/Elverle/Azure_BugCat.git
cd Azure_BugCat
npm ci
npm run dev
```

To exercise the app for real you need an Azure DevOps organization, a saved
work item query, a personal access token scoped to **Work Items · Read**, and
an API key for one of the supported LLM providers.

## The gate

Before opening a pull request:

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

All four must pass. This is the same gate CI runs, build included — it stayed
broken for three commits once when only lint and tests were checked.

## Commits

Conventional commits, written in English. One logical change per commit.

## How the project is organized

| Path | What lives there |
| --- | --- |
| `src/main` | Electron main process: IPC handlers, store, Azure DevOps and LLM clients |
| `src/renderer` | React UI |
| `src/shared` | Types, validation and constants used by both sides |
| `wiki/` | Architectural knowledge base: components, concepts, decisions |

## Language

Everything you contribute goes in English — code, comments, commit messages,
UI strings, tests and documentation alike. `tests/repo/no-italian-strings.spec.ts`
enforces this for `src/` and will fail the build on a stray Italian string.
