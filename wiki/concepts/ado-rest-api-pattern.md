---
title: 'ADO REST API Consumption Pattern'
type: concept
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-03-ado-fetch]]']
tags: [azure-devops, rest-api, architecture, error-handling]
lang: en
---

## Overview

Pattern for consuming the Azure DevOps REST API from the Electron main process. Designed as a layered architecture: **types → client → service → IPC**.

## Architecture Layers

```
IPC Handler (ipc-handlers.ts)
    ↓ calls
ADO Service (ado-service.ts)         ← orchestration, validation, mapping
    ↓ calls
ADO Client (ado-client.ts)           ← HTTP, auth, error translation
    ↓ uses
ADO Types (types.ts)                 ← interfaces, constants
```

## Authentication

- **Basic Auth** with Personal Access Token (PAT)
- Header format: `Basic base64(':' + PAT)`
- PAT stored encrypted in electron-store (via [[wiki/entities/electron-store]])

## Batching Strategy

ADO API limits work item detail requests to 200 IDs. The service:

1. Gets all IDs from WIQL query (potentially thousands)
2. Applies `topN` limit if configured
3. Splits remaining IDs into batches of 200
4. Fetches batches **sequentially** (avoids rate limiting)

## Error Handling

Typed `AppError` objects with standardized codes:

| Code             | Trigger                                    | User-facing meaning    |
| ---------------- | ------------------------------------------ | ---------------------- |
| `ADO_AUTH_ERROR` | 401/403, missing PAT, invalid URL          | Credentials invalid    |
| `ADO_NOT_FOUND`  | 404, missing queryId                       | Resource doesn't exist |
| `ADO_EMPTY`      | Query returns 0 work items                 | No bugs match query    |
| `ADO_TIMEOUT`    | AbortController fires (30s), network error | Connection issue       |
| `UNKNOWN_ERROR`  | Any other HTTP error                       | Unexpected failure     |

Errors are structured objects (not Error instances) — serializable across IPC boundary.

## Timeout Strategy

- `AbortController` with 30s timeout per request
- `clearTimeout` in `finally` block to avoid memory leaks
- Abort mapped to `ADO_TIMEOUT` error code

## URL Construction

- Org URL normalized (trailing slash removed)
- Project name and query ID passed through `encodeURIComponent`
- API version pinned to `7.0`

## QueryStrategy Interface

Defined for extensibility but only `SavedQuery` (WIQL GET by ID) is implemented in v1. Future support for custom WIQL POST queries can be added via this interface.

## See also

- [[wiki/entities/ado-client]]
- [[wiki/entities/ado-service]]
- [[wiki/entities/ado-types]]
- [[wiki/concepts/ipc-security-model]] — how IPC boundary works
- [[wiki/concepts/settings-persistence-flow]] — where PAT is stored
