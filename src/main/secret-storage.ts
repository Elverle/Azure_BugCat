import { safeStorage } from 'electron'

/**
 * Marks a value as ciphertext produced by this module. Versioned because the
 * encrypted payload is persisted in the user's config: a future change of
 * encoding needs to tell its own output from the previous one, and a value
 * without the prefix is plaintext from before this feature existed.
 */
const ENCRYPTED_PREFIX = 'enc:v1:'

/**
 * False on Linux without a keyring (no libsecret / no unlocked session), and on
 * any platform where the keychain refuses. Callers treat it as "store the way
 * the app did before": the store file itself is still encrypted at rest by
 * `store-encryption.ts`, just with a key that travels with it.
 */
export function isSecretEncryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX)
}

export function encryptSecret(value: string): string {
  if (value === '' || isEncryptedSecret(value)) return value
  if (!isSecretEncryptionAvailable()) return value
  return ENCRYPTED_PREFIX + safeStorage.encryptString(value).toString('base64')
}

export function decryptSecret(value: string): string {
  if (!isEncryptedSecret(value)) return value
  try {
    const payload = Buffer.from(value.slice(ENCRYPTED_PREFIX.length), 'base64')
    return safeStorage.decryptString(payload)
  } catch (error) {
    // The keychain entry is gone or belongs to another machine. Returning ''
    // makes the field read as unconfigured, which is exactly what it is — the
    // alternative is handing Azure DevOps a corrupt token and reporting a
    // 401 the user cannot explain.
    console.error('[SecretStorage] Stored secret could not be decrypted:', error)
    return ''
  }
}

/** The settings fields this module protects. Nothing else is a secret. */
export const SECRET_FIELDS = ['pat', 'apiKey'] as const

interface SecretStoreLike {
  get(key: string): unknown
  set(key: string, value: unknown): void
}

/**
 * Encrypts secrets a previous version of the app persisted in plaintext.
 *
 * Runs on every launch rather than as a schema migration on purpose: a
 * versioned migration fires once, and `isEncryptionAvailable()` can be false on
 * that one launch (a Linux session with no unlocked keyring) and true on the
 * next. A store that missed its only chance would stay in plaintext forever
 * with a schema version claiming otherwise. This sweep simply catches up.
 *
 * Writes only when something actually changed, so the steady state is a read.
 */
export function encryptStoredSecrets(store: SecretStoreLike): void {
  if (!isSecretEncryptionAvailable()) return

  const settings = store.get('settings')
  if (settings === null || typeof settings !== 'object') return

  const current = settings as Record<string, unknown>
  let changed = false

  for (const field of SECRET_FIELDS) {
    const value = current[field]
    if (typeof value !== 'string' || value === '' || isEncryptedSecret(value)) continue
    try {
      current[field] = encryptSecret(value)
      changed = true
    } catch (error) {
      // isSecretEncryptionAvailable() above is check-then-use: the keyring can
      // still throw here (a session that locks mid-operation, a dismissed
      // Keychain prompt, a transient DPAPI failure). One field failing must not
      // stop the app from opening or take the other field's encryption down
      // with it — the field is left as its existing plaintext, unchanged, and
      // the sweep tries again on the next launch.
      console.error(`[SecretStorage] Could not encrypt stored "${field}", leaving it as-is:`, error)
    }
  }

  if (changed) store.set('settings', current)
}
