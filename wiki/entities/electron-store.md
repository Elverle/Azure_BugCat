---
title: 'Electron Store (encrypted)'
type: entity
subtype: service
created: 2026-04-29
updated: 2026-08-20
sources:
  [
    '[[wiki/sources/ft-01-scaffold]]',
    '[[wiki/sources/ft-07-session-persistence]]',
    '[[wiki/sources/ft-08-generic-provider]]',
    '[[wiki/sources/ft-12-incremental-session-cache]]'
  ]
tags: [electron-store, encryption, persistence, migration, catalog, secrets]
lang: en
---

## Description

Persistent configuration store backed by `electron-store` v11 with encryption. Stores app settings, the renderer-facing open session snapshot, and the historical `bugCatalog`, while schema upgrades are managed explicitly through [[wiki/entities/store-migration]].

## Location

`src/main/store.ts`

## Encryption Strategy

1. **Primary**: `node-machine-id` generates a hardware-bound key via `machineIdSync(true)`.
2. **Fallback**: If machine ID is unavailable, generates a 32-byte random key and persists it to `{userData}/.bugcat-key` with `mode: 0o600` (owner-only read/write).

The encryption key is resolved once at module load time. Because `.bugcat-key` sits next to the store file itself, this at-rest encryption is obfuscation rather than real protection — a copy of both files is enough to decrypt the store elsewhere. FT-14 does not change this layer, but it does narrow what it actually protects: the two credential fields, `settings.pat` and `settings.apiKey`, are encrypted separately with a real, OS-managed key before this layer ever sees them — see below.

## Secret Fields (FT-14)

`settings.pat` and `settings.apiKey` carry a second, independent layer of encryption on top of the whole-store encryption above: [[wiki/entities/secret-storage]] encrypts them individually with Electron's `safeStorage` (OS keychain/DPAPI/libsecret) before they are written through `store.set('settings', ...)`. A ciphertext value is prefixed `enc:v1:`. `app.whenReady()` also runs an idempotent startup sweep, `encryptStoredSecrets(store)`, that upgrades any plaintext secret a previous app version left behind — see [[wiki/entities/secret-storage]] for why this is a sweep and not a versioned migration. `settings:get` never returns the decrypted value to the renderer; see [[wiki/concepts/settings-persistence-flow]].

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
  session: null,
  bugCatalog: null
}
```

## Schema Versioning

- `schemaVersion` is **not** declared in the defaults object.
- This omission is intentional: FT-07 relies on `store.has('schemaVersion')` to distinguish legacy stores from stores that already have an explicit schema version.
- Startup migration runs in `app.whenReady()` before IPC handlers are registered.
- Current schema is tracked by [[wiki/entities/store-migration]] via `CURRENT_SCHEMA_VERSION = 3`.

## FT-08 Notes

- Generic-provider fields such as `baseUrl` and `llmModel` are optional settings keys; they are not seeded in store defaults but are persisted once the renderer saves them.

## FT-12 Notes

- `session` remains the lightweight snapshot of currently open bugs plus optional categorization and similarity results.
- `bugCatalog` persists every bug ever seen, including lifecycle timestamps, input signatures, and similarity-history metadata.
- The renderer still loads only `session` by default, which keeps dashboard hydration bounded even if the catalog grows over time.

## Store File

Name: `bug-categorizer-config.json` (encrypted on disk), located in Electron's `userData` directory.

## Dependencies

- `electron-store` ^11.0.2
- `node-machine-id` ^1.1.12
- Node.js `crypto.randomBytes`

## See also

- [[wiki/entities/store-migration]]
- [[wiki/entities/secret-storage]] — the real protection for `pat`/`apiKey`, on top of this layer
- [[wiki/entities/ipc-handlers]] — reads/writes via IPC
- [[wiki/concepts/ipc-security-model]]
- [[wiki/concepts/settings-persistence-flow]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/topics/electron-architecture]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
