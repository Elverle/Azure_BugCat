---
title: 'Date Format Utility'
type: entity
subtype: library
created: 2026-05-01
updated: 2026-05-01
sources: ['[[wiki/sources/ft-07-session-persistence]]']
tags: [typescript, library, date-formatting, dashboard]
lang: en
---

## Description

Pure renderer utility that formats ISO timestamps for the UI using the Italian locale and a fixed day/month/year + hour/minute shape. Extracting it out of `DashboardHeader` keeps date presentation consistent and independently testable.

## Location

`src/renderer/src/lib/date-utils.ts`

## Public API

```typescript
export function formatDate(isoString: string): string
```

## Behavior

- Converts the input string to a `Date` and formats it via `toLocaleString('it-IT', ...)`.
- Always requests `2-digit` day, month, hour, and minute parts.
- Keeps the utility free of React or Electron dependencies, so it can be covered by plain unit tests.
- Is currently consumed by [[wiki/entities/dashboard-header]] to render `fetchedAt` and `categorizedAt` session timestamps.

## See also

- [[wiki/entities/dashboard-header]]
- [[wiki/topics/dashboard-bug-exploration]]
- [[wiki/topics/session-persistence-lifecycle]]
