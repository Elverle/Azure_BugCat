---
title: 'Validation Utilities'
type: entity
subtype: library
created: 2026-04-29
updated: 2026-05-17
sources:
	[
		'[[wiki/sources/ft-02-settings]]',
		'[[wiki/sources/ft-08-generic-provider]]',
		'[[wiki/sources/ft-14a-agent-configuration-project-registry]]'
	]
tags: [typescript, validation, pure-functions, settings, projects]
lang: en
---

## Description

Pure validation functions for Settings fields. No React dependencies, no IPC side effects, and every validator returns `string | null` so the hook can aggregate errors consistently. FT-14A extends the module with project-entry, architecture-context, concurrency, and conditional agent/BYOK validation.

## Location

`src/renderer/src/lib/validation.ts`

## Validators

| Function                                       | Field(s)                                     | Rule                                                                                       |
| ---------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `validateOrgUrl(url)`                          | `orgUrl`                                     | Required; must match `https://dev.azure.com/{org}` or `https://{org}.visualstudio.com`     |
| `validateRequired(value, fieldName)`           | `projectName`, `pat`, conditional agent keys | Non-empty after trim                                                                       |
| `validateUUID(value)`                          | `queryId`                                    | Required; must be valid UUID format                                                        |
| `validateIntRange(value, min, max, fieldName)` | `topN`, `chunkSize`, `maxConcurrentSessions` | Must be integer within range                                                               |
| `validateApiKey(value, provider)`              | `apiKey`                                     | Required for all current providers                                                         |
| `validateBaseUrl(value, provider)`             | `baseUrl`                                    | Required only for `generic`; must be a valid URL and use HTTPS, except localhost/127.0.0.1 |
| `validateMaxLength(value, max, fieldName)`     | `architectureContext`, project metadata      | Enforces field-specific max lengths                                                        |
| `validateProjectEntry(project)`                | `ProjectEntry` fields                        | Validates required name/path plus max-length constraints                                   |
| `validateArchitectureContext(value)`           | `architectureContext`                        | Maximum 1000 characters                                                                    |
| `validateMaxConcurrentSessions(value)`         | `maxConcurrentSessions`                      | Integer range `1..5`                                                                       |

## Aggregate Functions

| Function                     | Purpose                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| `validateSettings(settings)` | Runs all validators and emits flat keys, including `project-{i}-{field}` |
| `isSettingsValid(errors)`    | Returns `true` if all error values are `null`                            |

## Regex Patterns

```typescript
const UUID_REGEX = /^[0-9a-fA-F]{8}-...-[0-9a-fA-F]{12}$/
const ADO_ORG_URL_REGEX = /^https:\/\/(dev\.azure\.com\/[^/\s]+|[^/\s]+\.visualstudio\.com)\/?$/
```

## FT-08 Notes

- Renderer validation mirrors the main-process enforcement for generic provider URLs as a UX affordance, but the authoritative security check still lives in [[wiki/entities/generic-provider]].

## FT-14A Notes

- `validateSettings()` now treats auto-derived `claude-sdk` / `codex-sdk` differently from manual SDK selection, so `agentApiKey` is only required for manual non-Copilot agent providers.
- `copilotByokApiKey` becomes required only when `agentProvider === 'copilot-sdk'` and `copilotByokEnabled === true`.
- Project-entry errors are flattened into the same record as top-level Settings errors, which keeps the `useSettings` API unchanged.

## See also

- [[wiki/entities/use-settings-hook]] — consumer
- [[wiki/concepts/form-validation-pattern]]
- [[wiki/concepts/dynamic-collection-touched-state]]
