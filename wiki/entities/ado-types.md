---
title: 'ADO Types & Constants'
type: entity
subtype: model
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-03-ado-fetch]]']
tags: [azure-devops, typescript, types]
lang: en
---

## Description

TypeScript interfaces and constants for the Azure DevOps integration layer.

## Location

`src/main/ado/types.ts`

## Interfaces

| Interface             | Purpose                                                      |
| --------------------- | ------------------------------------------------------------ |
| `AdoConnectionConfig` | Connection params: orgUrl, projectName, queryId, pat, topN   |
| `QueryStrategy`       | Abstraction for getting work item IDs (future extensibility) |
| `WiqlResponse`        | ADO WIQL query response shape                                |
| `WorkItemResponse`    | ADO batch work item response shape                           |
| `WorkItemRaw`         | Single work item with `id` + `fields` record                 |

## Constants

| Constant         | Value                     | Purpose                             |
| ---------------- | ------------------------- | ----------------------------------- |
| `ADO_FIELDS`     | 10-element readonly tuple | Fields requested from ADO API       |
| `ADO_BATCH_SIZE` | `200`                     | Max IDs per work item batch request |

## ADO Fields Requested

```typescript
;('System.Id',
  'System.Title',
  'System.State',
  'System.AssignedTo',
  'System.AreaPath',
  'System.Description',
  'Microsoft.VSTS.Common.Priority',
  'System.CreatedDate',
  'System.ChangedDate',
  'System.Tags')
```

## See also

- [[wiki/entities/ado-client]] — uses these types
- [[wiki/entities/ado-service]] — uses these types
- [[wiki/concepts/ado-rest-api-pattern]]
