---
title: 'FT-03 — ADO Bug Fetching'
type: source
created: 2026-04-30
updated: 2026-04-30
sources: []
tags: [feature, azure-devops, rest-api, electron, main-process]
lang: en
---

## Summary

FT-03 implements Azure DevOps bug fetching in the Electron Main Process. It adds a complete ADO service layer that:

1. Executes a Saved Query via WIQL endpoint to get work item IDs
2. Fetches work item details in batches of 200
3. Maps ADO fields to the app's `BugItem` model
4. Converts HTML descriptions to semantically-preserved plain text
5. Handles typed errors (auth, not-found, empty, timeout)

## Key Decisions

- **Pure functional module pattern** — no classes, exported async functions only
- **Native `fetch` + `AbortController`** — no external HTTP dependencies
- **QueryStrategy interface** — defined for future WIQL custom query support (only SavedQuery in v1)
- **Batch size 200** — matches ADO API limit per request
- **HTML→text conversion** — preserves `<pre>`/`<code>` blocks, tables, lists semantically
- **Typed error codes** — `ADO_AUTH_ERROR`, `ADO_NOT_FOUND`, `ADO_EMPTY`, `ADO_TIMEOUT`, `UNKNOWN_ERROR`

## Files

| File                             | Role                                                 |
| -------------------------------- | ---------------------------------------------------- |
| `src/main/utils/html-to-text.ts` | Pure HTML→text conversion utility                    |
| `src/main/ado/types.ts`          | ADO interfaces, QueryStrategy, constants             |
| `src/main/ado/ado-client.ts`     | Low-level HTTP client (auth, timeout, error mapping) |
| `src/main/ado/ado-service.ts`    | Orchestration: validate → query → batch → map        |
| `src/main/ipc-handlers.ts`       | Wired `ADO_FETCH_BUGS` and `ADO_TEST_CONNECTION`     |

## Code Review Fixes Applied

- Fallback error code changed from `ADO_TIMEOUT` to `UNKNOWN_ERROR` for generic HTTP errors
- Null guard on `store.get('settings')` in IPC handlers
- `encodeURIComponent` on URL path parameters (`queryId`, `projectName`)
- `isAppError` type-guard replaces duck-typing for error re-throw

## See also

- [[wiki/entities/ado-client]]
- [[wiki/entities/ado-service]]
- [[wiki/entities/ado-types]]
- [[wiki/entities/html-to-text]]
- [[wiki/concepts/ado-rest-api-pattern]]
