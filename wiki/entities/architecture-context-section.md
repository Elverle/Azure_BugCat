---
title: 'Architecture Context Section'
type: entity
subtype: component
created: 2026-05-17
updated: 2026-05-17
sources: ['[[wiki/sources/ft-14a-agent-configuration-project-registry]]']
tags: [react, component, settings, architecture, concurrency]
lang: en
---

## Description

Settings card that captures free-form architectural guidance for future agent runs together with a numeric cap on parallel agent sessions.

## Location

`src/renderer/src/components/settings/ArchitectureContextSection.tsx`

## Props

```typescript
interface ArchitectureContextSectionProps {
  settings: AppSettings
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  onFieldChange: (field: keyof AppSettings, value: unknown) => void
}
```

## Behavior

- Renders `architectureContext` as a textarea with a live `0 / 1000` style character counter.
- Colors the counter red when the local character count exceeds 1000.
- Renders `maxConcurrentSessions` as a numeric input bounded in the UI to `1..5`.
- Passes parsed numeric values through to validation rather than clamping them silently, so invalid values like `0` still produce an explicit inline error.
- Shows both field errors only after the respective field is marked touched.

## Dependencies

- [[wiki/entities/use-settings-hook]]
- [[wiki/entities/validation-utils]]
- [[wiki/entities/input-component]]
- [[wiki/entities/label-component]]
- [[wiki/entities/textarea-component]]

## See also

- [[wiki/entities/settings-page]]
- [[wiki/topics/agent-session-configuration-foundation]]
