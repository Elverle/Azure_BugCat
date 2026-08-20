---
title: 'Secret Storage'
type: entity
subtype: service
created: 2026-08-20
updated: 2026-08-20
sources: []
tags: [electron, safe-storage, secrets, encryption, keychain, settings]
lang: en
---

## Description

Main-process module that encrypts the two credential fields — the Azure DevOps PAT and the LLM `apiKey` — with Electron's `safeStorage`, which is itself backed by the OS keychain/DPAPI/libsecret. It is the "real protection" half of the settings store's encryption story: [[wiki/entities/electron-store]] (via `store-encryption.ts`) still encrypts the whole store at rest with a key that travels next to the data (obfuscation), while this module protects only `pat` and `apiKey` with a key the OS itself manages.

## Location

`src/main/secret-storage.ts`

## Public API

```typescript
export function isSecretEncryptionAvailable(): boolean
export function isEncryptedSecret(value: string): boolean
export function encryptSecret(value: string): string
export function decryptSecret(value: string): string
export const SECRET_FIELDS = ['pat', 'apiKey'] as const
export function encryptStoredSecrets(store: SecretStoreLike): void
```

`SECRET_FIELDS` is the exhaustive list of settings keys this module protects — nothing else in `AppSettings` is treated as a secret; `orgUrl`, `baseUrl`, `queryId`, etc. only get the whole-store obfuscation from `store-encryption.ts`.

The companion sentinel lives in a separate shared file so both main and renderer can import it without pulling in `safeStorage`:

```typescript
// src/shared/secrets.ts
export const SECRET_PLACEHOLDER = '__stored__'
export function isSecretPlaceholder(value: string | undefined): boolean
```

## Ciphertext Format

`encryptSecret()` prefixes its output with `enc:v1:` followed by the base64 encoding of `safeStorage.encryptString(value)`. The prefix is versioned because the ciphertext is persisted in the user's config file across app upgrades: a future change to the encoding needs to tell its own output apart from what a previous version wrote, and any value without the prefix is understood to be plaintext left over from before this feature existed. `isEncryptedSecret()` is a plain `startsWith(ENCRYPTED_PREFIX)` check — it does not attempt to decrypt, so it stays cheap to call on every settings read.

`encryptSecret()` and `decryptSecret()` are both no-ops on values that don't need touching: an empty string, a value already carrying the prefix, or — for encryption only — any value when `isSecretEncryptionAvailable()` is false.

## Design Decisions

### Why an idempotent startup sweep, not a versioned schema migration

`encryptStoredSecrets(store)` runs on every launch, from `app.whenReady()` in `src/main/index.ts`, right after [[wiki/entities/store-migration]]'s `migrateStore(store)` — but it is deliberately not one of that pipeline's numbered migrations. A [[wiki/entities/store-migration|schema migration]] is guarded by `schemaVersion` and runs exactly once per store, by design. `safeStorage.isEncryptionAvailable()` is not a fixed platform capability the way a data shape is: it can be `false` on one launch (a Linux session with no unlocked keyring, a locked DPAPI context) and `true` on the very next one. A versioned migration would burn its one attempt on whichever launch happened to hit the `false` case, bump `schemaVersion` to record that migration `N` succeeded, and leave the two secrets in plaintext forever — with a schema version that now falsely certifies they were handled. The sweep instead re-checks `isSecretEncryptionAvailable()` on every startup and only writes back when a field actually changed (`changed` flag), so a store that missed its chance on one launch simply catches up automatically the next time encryption becomes available, with no persisted state to get out of sync.

### Why the renderer receives a sentinel, never the secret

`SETTINGS_GET` (in [[wiki/entities/ipc-handlers]]) never sends the decrypted `pat`/`apiKey` across the IPC bridge; it sends `SECRET_PLACEHOLDER` (`'__stored__'`, from `src/shared/secrets.ts`) when a value is set, or `''` when it is not. `decryptSecret()` is called only inside the main process — by `readSettings()`, for real work against Azure DevOps and the configured LLM provider. This keeps the plaintext credential out of the renderer process entirely: it never sits in React state, never shows up in a React DevTools inspection, and can't leak through a future renderer-side logging or telemetry hook that was never audited for secrets. The renderer's job is limited to showing that a field is configured (disabled input, "stored" status text, a "Replace" button — see [[wiki/entities/ado-connection-section]] and [[wiki/entities/llm-provider-section]]) and sending the sentinel back unchanged on save, which `SETTINGS_SET` reads as "keep what you have" rather than as literal secret text. The one place a sentinel has to be resolved back into a real secret before use is the connection-test path: the Test Connection buttons send the live, unsaved form state as `settingsOverride`, and `ipc-handlers.ts`'s `resolveSecrets()` swaps any sentinel in that payload for the persisted plaintext before calling `testAdoConnection()` / `testLLMConnection()`.

### Why a failed decryption returns `''` instead of throwing

`decryptSecret()` wraps `safeStorage.decryptString()` in a `try/catch` and returns `''` on failure rather than letting the error propagate. The realistic failure cases are a keychain entry that no longer exists, or a config file copied/synced to another machine or OS user profile whose keychain cannot decrypt it. Throwing here would surface as an unhandled failure in every code path that touches that field — `SETTINGS_GET`, `readSettings()`, any ADO or LLM call — for a problem that is local to one stored value, not to the app's ability to function. Returning `''` makes the field read as unconfigured, which is functionally accurate: the app cannot use a secret it cannot decrypt. The user sees "not configured" and re-enters the credential, instead of the app failing in a way that has no visible cause and no recovery path short of manually deleting config files. The same reasoning shapes `encryptStoredSecrets()`'s per-field `try/catch`: one field failing to encrypt (a session that locks mid-operation, a dismissed Keychain prompt, a transient DPAPI failure) leaves that field as its existing plaintext and does not stop the app from starting or take the other field's encryption down with it.

## Dependencies

- Electron's `safeStorage` API — the actual encryption backend (OS keychain / DPAPI / libsecret)
- [[wiki/entities/electron-store]] — the store this module reads/writes secret fields into, through the narrow `SecretStoreLike` interface
- `src/main/index.ts` — calls `encryptStoredSecrets(store)` in `app.whenReady()`, after `migrateStore(store)` and before `registerIPCHandlers()`
- [[wiki/entities/ipc-handlers]] — `readSettings()` calls `decryptSecret()`; `SETTINGS_SET` calls `encryptSecret()`; `resolveSecrets()` and `SETTINGS_GET` use `isSecretPlaceholder()` / `SECRET_PLACEHOLDER` from `src/shared/secrets.ts`

## See also

- [[wiki/entities/electron-store]] — contrasts with the store's own weaker, whole-file encryption
- [[wiki/entities/store-migration]] — the versioned pipeline this module deliberately runs alongside, not inside
- [[wiki/entities/ipc-handlers]]
- [[wiki/entities/settings-page]]
- [[wiki/entities/ado-connection-section]]
- [[wiki/entities/llm-provider-section]]
- [[wiki/entities/use-settings-hook]]
- [[wiki/concepts/settings-persistence-flow]]
- [[wiki/concepts/ipc-security-model]]
- [[wiki/concepts/sentinel-value-label-separation]] — the same machine-value sentinel convention, applied to a different problem
- [[wiki/topics/session-persistence-lifecycle]]
