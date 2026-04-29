---
title: 'Form Validation Pattern'
type: concept
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-02-settings]]']
tags: [validation, react, pattern, pure-functions]
lang: en
---

## Definition

The app uses a two-layer validation pattern that separates pure validation logic from React state management:

1. **Pure validation functions** (`src/renderer/src/lib/validation.ts`) — no React, no side effects, easily unit-testable
2. **React hook** (`useSettings`) — calls validators reactively, manages `errors`, `touched`, and `canSave` state

## How It Works in This Project

### Layer 1: Pure Validators

Each field has a dedicated validator that returns `string | null`:

```typescript
validateOrgUrl(url: string): string | null
validateRequired(value: string, fieldName: string): string | null
validateUUID(value: string): string | null
validateIntRange(value: number, min: number, max: number, fieldName: string): string | null
validateApiKey(value: string | undefined, provider: LLMProviderType): string | null
```

An aggregate function runs all validators at once:

```typescript
validateSettings(settings: AppSettings): Record<string, string | null>
isSettingsValid(errors: Record<string, string | null>): boolean
```

### Layer 2: React State (useSettings hook)

- **Real-time validation:** `useEffect` re-runs `validateSettings()` on every `settings` state change
- **Touched tracking:** Errors only display for fields the user has interacted with
- **Save-time validation:** `save()` marks all fields touched and re-validates before submitting
- **`canSave` guard:** Computed as `isDirty && isSettingsValid(errors) && !saving`

### Data Flow

```
User types → updateField() → setSettings(next) → useEffect → validateSettings()
                                                                    ↓
                                                              setErrors(result)
                                                                    ↓
                                                   Component reads errors[field]
                                                   Shows error only if touched[field]
```

## Trade-offs

- **Pro:** Validators are pure — trivial to unit test without React rendering
- **Pro:** Touched tracking prevents error flash on initial load
- **Pro:** `canSave` derived from validation + dirty state — button logic is declarative
- **Con:** `JSON.stringify` comparison for dirty tracking — acceptable for small settings object, would not scale to large forms

## See also

- [[wiki/entities/validation-utils]]
- [[wiki/entities/use-settings-hook]]
- [[wiki/entities/settings-page]]
