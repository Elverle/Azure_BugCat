---
title: 'Electron Store (encrypted)'
type: entity
subtype: service
created: 2026-04-29
updated: 2026-05-21
sources:
  [
    '[[wiki/sources/ft-01-scaffold]]',
    '[[wiki/sources/ft-07-session-persistence]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-12-incremental-session-cache]]',
    '[[wiki/sources/ft-14e-multi-session-agent-workspace]]'
  ]
tags: [electron-store, encryption, persistence, migration, catalog, agent]
lang: en
---

## Description

Persistent configuration store backed by `electron-store` v11 with encryption. Stores app settings, the renderer-facing open session snapshot, the historical `bugCatalog`, and the retained FT-14E `agentSessions` recovery set, while schema upgrades are managed explicitly through [[wiki/entities/store-migration]].

## Location

`src/main/store.ts`

## Encryption Strategy

1. **Primary**: `node-machine-id` generates a hardware-bound key via `machineIdSync(true)`.
2. **Fallback**: If machine ID is unavailable, generates a 32-byte random key and persists it to `{userData}/.bugcat-key` with `mode: 0o600` (owner-only read/write).

The encryption key is resolved once at module load time.

## Store Schema (defaults)

```typescript
{
  settings: {
    orgUrl: '',
    projectName: '',
    queryId: '',
    topN: 20,
    chunkSize: 15,
    llmProvider: 'openai',
    apiKey: '',
    pat: '',
    categories: [],
    agentProvider: 'none',
    agentApiKey: '',
    agentModel: '',
    copilotByokEnabled: false,
    copilotByokProvider: undefined,
    copilotByokApiKey: '',
    copilotByokBaseUrl: '',
    projects: [],
    architectureContext: '',
    maxConcurrentSessions: 5
  },
  session: null,
  bugCatalog: null,
  catalogMetadata: { lastClearedAt: null },
  agentSessions: []
}
```

## Schema Versioning

- `schemaVersion` is **not** declared in the defaults object.
- This omission is intentional: FT-07 relies on `store.has('schemaVersion')` to distinguish legacy stores from stores that already have an explicit schema version.
- Startup migration runs in `app.whenReady()` before IPC handlers are registered.
- Current schema is tracked by [[wiki/entities/store-migration]] via `CURRENT_SCHEMA_VERSION = 5`.

## FT-08 Notes

- Generic-provider fields such as `baseUrl` and `llmModel` are optional settings keys; they are not seeded in store defaults but are persisted once the renderer saves them.

## FT-12 Notes

- `session` remains the lightweight snapshot of currently open bugs plus optional categorization and similarity results.
- `bugCatalog` persists every bug ever seen, including lifecycle timestamps, input signatures, and similarity-history metadata.
- The renderer still loads only `session` by default, which keeps dashboard hydration bounded even if the catalog grows over time.

## FT-14E Notes

- `agentSessions` is intentionally separate from the open bug `session` snapshot; it stores retained agent-analysis history, not the current ADO bug collection.
- The store keeps recent agent sessions only for recovery and operator inspection. Retention, chunk trimming, and stale-running conversion are implemented in [[wiki/entities/agent-session-persistence]], not inside the generic store wrapper.

## Store File

Name: `bug-categorizer-config.json` (encrypted on disk), located in Electron's `userData` directory.

## Dependencies

- `electron-store` ^11.0.2
- `node-machine-id` ^1.1.12
- Node.js `crypto.randomBytes`

## See also

- [[wiki/entities/store-migration]]
- [[wiki/entities/ipc-handlers]] — reads/writes via IPC
- [[wiki/entities/agent-session-persistence]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/topics/electron-architecture]]
- [[wiki/topics/agent-session-workspace]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
