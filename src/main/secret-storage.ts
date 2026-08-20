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
