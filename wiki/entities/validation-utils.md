---
title: 'Validation Utilities'
type: entity
subtype: library
created: 2026-04-29
updated: 2026-08-20
sources: ['[[wiki/sources/ft-02-settings]]', '[[wiki/sources/ft-08-generic-provider]]']
tags: [typescript, validation, pure-functions]
lang: en
---

## Description

Pure validation functions for all settings fields. No React dependencies — can be unit tested independently. Each validator returns `string | null` (error message or null for valid).

The module lives in `shared/` rather than in the renderer because both sides use it: the renderer for form feedback as the user types, the main process as the trust boundary that decides what may be persisted.

## Location

`src/shared/validation.ts`

## Validators

| Function                                       | Field(s)                           | Rule                                                                                       |
| ---------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `validateOrgUrl(url)`                          | `orgUrl`                           | Required; must match `https://dev.azure.com/{org}` or `https://{org}.visualstudio.com`     |
| `validateRequired(value, fieldName)`           | `projectName`, `pat`               | Non-empty after trim                                                                       |
| `validateUUID(value)`                          | `queryId`                          | Required; must be valid UUID format                                                        |
| `validateIntRange(value, min, max, fieldName)` | `topN` (1–200), `chunkSize` (5–30) | Must be integer within range                                                               |
| `validateApiKey(value)`                        | `apiKey`                           | Required for all current providers                                                         |
| `validateBaseUrl(value, provider)`             | `baseUrl`                          | Required only for `generic`; must be a valid URL and use HTTPS, except localhost/127.0.0.1 |

## Aggregate Functions

| Function                     | Purpose                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| `validateSettings(settings)`      | Runs all validators, returns `Record<string, string \| null>`                                          |
| `isSettingsValid(errors)`         | Returns `true` if all error values are `null`                                                          |
| `assertValidSettings(input)`      | Narrows an `unknown` payload to `AppSettings` or throws. The main-process gate on `settings:set`       |

## Regex Patterns

```typescript
const UUID_REGEX = /^[0-9a-fA-F]{8}-...-[0-9a-fA-F]{12}$/
const ADO_ORG_URL_REGEX = /^https:\/\/(dev\.azure\.com\/[^/\s]+|[^/\s]+\.visualstudio\.com)\/?$/
```

## FT-08 Notes

- Renderer validation mirrors the main-process enforcement for generic provider URLs as a UX affordance, but the authoritative security check still lives in [[wiki/entities/generic-provider]].

## See also

- [[wiki/entities/use-settings-hook]] — consumer
- [[wiki/concepts/form-validation-pattern]]
