---
title: 'Validation Utilities'
type: entity
subtype: library
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-02-settings]]']
tags: [typescript, validation, pure-functions]
lang: en
---

## Description

Pure validation functions for all settings fields. No React dependencies — can be unit tested independently. Each validator returns `string | null` (error message or null for valid).

## Location

`src/renderer/src/lib/validation.ts`

## Validators

| Function | Field(s) | Rule |
|---|---|---|
| `validateOrgUrl(url)` | `orgUrl` | Required; must match `https://dev.azure.com/{org}` or `https://{org}.visualstudio.com` |
| `validateRequired(value, fieldName)` | `projectName`, `pat` | Non-empty after trim |
| `validateUUID(value)` | `queryId` | Required; must be valid UUID format |
| `validateIntRange(value, min, max, fieldName)` | `topN` (1–200), `chunkSize` (5–30) | Must be integer within range |
| `validateApiKey(value, provider)` | `apiKey` | Required unless provider is `github-copilot` |

## Aggregate Functions

| Function | Purpose |
|---|---|
| `validateSettings(settings)` | Runs all validators, returns `Record<string, string \| null>` |
| `isSettingsValid(errors)` | Returns `true` if all error values are `null` |

## Regex Patterns

```typescript
const UUID_REGEX = /^[0-9a-fA-F]{8}-...-[0-9a-fA-F]{12}$/
const ADO_ORG_URL_REGEX = /^https:\/\/(dev\.azure\.com\/[^/\s]+|[^/\s]+\.visualstudio\.com)\/?$/
```

## See also

- [[wiki/entities/use-settings-hook]] — consumer
- [[wiki/concepts/form-validation-pattern]]
