---
title: 'Date Format Utility'
type: entity
subtype: library
created: 2026-05-01
updated: 2026-08-20
sources: ['[[wiki/sources/ft-07-session-persistence]]']
tags: [typescript, library, date-formatting, dashboard]
lang: en
---

## Description

Pure renderer utility that formats ISO timestamps for the UI on the machine's own locale, with a fixed day/month/year + hour/minute shape. Extracting it out of `DashboardHeader` keeps date presentation consistent and independently testable.

## Location

`src/renderer/src/lib/date-utils.ts`

## Public API

```typescript
export function formatDate(isoString: string): string
export function formatDateOnly(isoString: string): string
```

## Behavior

- `formatDate()` converts the input string to a `Date` and formats it via `toLocaleString(undefined, ...)` — date and time. `formatDateOnly()` does the same through `toLocaleDateString()`, without the clock.
- Always requests `2-digit` day, month, hour, and minute parts.
- **Locale comes from the machine, the clock does not.** min-09 replaced the original hardcoded `'it-IT'` with `undefined`, so the date order follows the reader's system, while `hour12: false` stays pinned: a triage timestamp is read at a glance, and a 12-hour clock changes its meaning between users.
- Keeps the utility free of React or Electron dependencies, so it can be covered by plain unit tests.
- Consumed by [[wiki/entities/dashboard-header]] for the `fetchedAt` and `categorizedAt` session timestamps, by [[wiki/entities/bug-detail-drawer]] for the bug's own dates, and by [[wiki/entities/dashboard-page]] and [[wiki/entities/closed-bugs-page]].

## See also

- [[wiki/entities/dashboard-header]]
- [[wiki/topics/dashboard-bug-exploration]]
- [[wiki/topics/session-persistence-lifecycle]]
