---
title: 'ADO Client'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-03-ado-fetch]]']
tags: [azure-devops, rest-api, http, main-process]
lang: en
---

## Description

Low-level HTTP client for Azure DevOps REST API. Handles authentication, URL construction, timeouts, and error mapping. Exports two async functions consumed by [[wiki/entities/ado-service]].

## Location

`src/main/ado/ado-client.ts`

## Public API

```typescript
export async function fetchWiqlQuery(config: AdoConnectionConfig): Promise<WiqlResponse>
export async function fetchWorkItemsBatch(
  config: AdoConnectionConfig,
  ids: number[]
): Promise<WorkItemRaw[]>
```

## Internal Helpers

| Function                               | Purpose                                             |
| -------------------------------------- | --------------------------------------------------- |
| `buildAuthHeader(pat)`                 | Creates `Basic` auth header (`:PAT` base64-encoded) |
| `buildBaseUrl(orgUrl, project)`        | Normalizes org URL + encodes project name           |
| `throwAppError(code, msg, details?)`   | Creates and throws typed `AppError`                 |
| `mapResponseError(status, statusText)` | Maps HTTP status to typed error code                |
| `isAppError(error)`                    | Type-guard for `AppError` (used in catch blocks)    |

## Error Mapping

| HTTP Status          | Error Code       |
| -------------------- | ---------------- |
| 401, 403             | `ADO_AUTH_ERROR` |
| 404                  | `ADO_NOT_FOUND`  |
| Other non-OK         | `UNKNOWN_ERROR`  |
| AbortError (timeout) | `ADO_TIMEOUT`    |
| Network error        | `ADO_TIMEOUT`    |

## API Endpoints Called

| Endpoint                                                                 | Method | Used by               |
| ------------------------------------------------------------------------ | ------ | --------------------- |
| `{org}/{project}/_apis/wit/wiql/{queryId}?api-version=7.0`               | GET    | `fetchWiqlQuery`      |
| `{org}/{project}/_apis/wit/workitems?ids=...&fields=...&api-version=7.0` | GET    | `fetchWorkItemsBatch` |

## Security

- URL params encoded with `encodeURIComponent`
- 30s timeout via `AbortController`
- HTTPS enforced (orgUrl must start with `https://`)

## Dependencies

- [[wiki/entities/ado-types]] — `AdoConnectionConfig`, `WiqlResponse`, `WorkItemRaw`, `ADO_FIELDS`
- `../../shared/types` — `AppError`

## See also

- [[wiki/entities/ado-service]] — orchestration layer
- [[wiki/concepts/ado-rest-api-pattern]]
