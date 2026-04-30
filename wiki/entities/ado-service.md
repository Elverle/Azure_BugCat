---
title: 'ADO Service'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-03-ado-fetch]]']
tags: [azure-devops, orchestration, main-process]
lang: en
---

## Description

Orchestration module for fetching bugs from Azure DevOps. Validates settings, queries WIQL, batches work item fetches, and maps raw ADO fields to the app's `BugItem` model. Consumed directly by IPC handlers.

## Location

`src/main/ado/ado-service.ts`

## Public API

```typescript
export async function fetchBugsFromQuery(settings: AppSettings): Promise<BugItem[]>
export async function testAdoConnection(settings: AppSettings): Promise<TestConnectionResult>
```

## Flow: `fetchBugsFromQuery`

1. **Validate** — `buildConfig(settings)` checks required fields, throws typed errors
2. **Query** — `fetchWiqlQuery(config)` gets work item IDs from saved query
3. **Guard** — throws `ADO_EMPTY` if no results
4. **Limit** — applies `topN` slice if > 0
5. **Batch** — splits IDs into chunks of `ADO_BATCH_SIZE` (200)
6. **Fetch** — sequential batch fetches via `fetchWorkItemsBatch`
7. **Map** — `mapWorkItemToBug` converts each `WorkItemRaw` → `BugItem`

## Field Mapping

| ADO Field                        | BugItem Property | Transform                             |
| -------------------------------- | ---------------- | ------------------------------------- |
| `System.Id`                      | `id`             | Fallback to `item.id`                 |
| `System.Title`                   | `title`          | —                                     |
| `System.State`                   | `state`          | —                                     |
| `System.AssignedTo`              | `assignee`       | Extract `displayName`, null if absent |
| `System.AreaPath`                | `areaPath`       | —                                     |
| `System.Description`             | `description`    | `htmlToText()` conversion             |
| `Microsoft.VSTS.Common.Priority` | `priority`       | Default 0                             |
| `System.CreatedDate`             | `createdDate`    | —                                     |
| `System.ChangedDate`             | `updatedDate`    | —                                     |
| `System.Tags`                    | `tags`           | Split by `'; '`, filter empty         |

## Flow: `testAdoConnection`

1. Calls `buildConfig` + `fetchWiqlQuery`
2. Returns `{ success: true, message }` with bug count on success
3. Catches any error, returns `{ success: false, message }` — never throws

## Dependencies

- [[wiki/entities/ado-client]] — HTTP functions
- [[wiki/entities/ado-types]] — `AdoConnectionConfig`, `ADO_BATCH_SIZE`
- [[wiki/entities/html-to-text]] — description conversion
- [[wiki/entities/shared-types]] — `AppSettings`, `BugItem`, `AppError`, `TestConnectionResult`

## See also

- [[wiki/entities/ipc-handlers]] — registers the IPC endpoints
- [[wiki/concepts/ado-rest-api-pattern]]
