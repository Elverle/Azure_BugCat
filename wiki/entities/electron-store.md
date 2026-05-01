---
title: 'Electron Store (encrypted)'
type: entity
subtype: service
created: 2026-04-29
updated: 2026-05-01
sources: ['[[wiki/sources/ft-01-scaffold]]', '[[wiki/sources/ft-07-session-persistence]]']
tags: [electron-store, encryption, persistence, migration]
lang: en
---

## Description

Persistent configuration store backed by `electron-store` v11 with encryption. Stores app settings (ADO connection, LLM config, categories) and session data (cached bug lists), while schema upgrades are managed explicitly through [[wiki/entities/store-migration]].

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
    categories: []
  },
  session: null
}
```

## Schema Versioning

- `schemaVersion` is **not** declared in the defaults object.
- This omission is intentional: FT-07 relies on `store.has('schemaVersion')` to distinguish legacy stores from stores that already have an explicit schema version.
- Startup migration runs in `app.whenReady()` before IPC handlers are registered.
- Current schema is tracked by [[wiki/entities/store-migration]] via `CURRENT_SCHEMA_VERSION = 1`.

## Store File

Name: `bug-categorizer-config.json` (encrypted on disk), located in Electron's `userData` directory.

## Dependencies

- `electron-store` ^11.0.2
- `node-machine-id` ^1.1.12
- Node.js `crypto.randomBytes`

## See also

- [[wiki/entities/store-migration]]
- [[wiki/entities/ipc-handlers]] — reads/writes via IPC
- [[wiki/concepts/ipc-security-model]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/topics/electron-architecture]]
- [[wiki/topics/session-persistence-lifecycle]]
