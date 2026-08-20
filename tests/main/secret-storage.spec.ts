import { describe, it, expect, vi, beforeEach } from 'vitest'

const { safeStorage } = vi.hoisted(() => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((plain: string) => Buffer.from(`cipher:${plain}`)),
    decryptString: vi.fn((buf: Buffer) => buf.toString().replace(/^cipher:/, ''))
  }
}))

vi.mock('electron', () => ({ safeStorage }))

import {
  encryptSecret,
  decryptSecret,
  isEncryptedSecret,
  isSecretEncryptionAvailable,
  encryptStoredSecrets
} from '../../src/main/secret-storage'

describe('secret-storage', () => {
  beforeEach(() => {
    safeStorage.isEncryptionAvailable.mockReturnValue(true)
    safeStorage.encryptString.mockClear()
    safeStorage.decryptString.mockClear()
  })

  it('round-trips a secret through the OS keychain', () => {
    const encrypted = encryptSecret('pat-abc123')
    expect(encrypted).not.toContain('pat-abc123')
    expect(isEncryptedSecret(encrypted)).toBe(true)
    expect(decryptSecret(encrypted)).toBe('pat-abc123')
  })

  it('leaves an empty value alone', () => {
    // An unconfigured field is not a secret: encrypting '' would turn "nothing
    // stored" into a ciphertext the UI would then report as configured.
    expect(encryptSecret('')).toBe('')
    expect(safeStorage.encryptString).not.toHaveBeenCalled()
  })

  it('is idempotent: encrypting an already encrypted value is a no-op', () => {
    // The startup sweep of task 4 runs on every launch. Without this, every
    // launch would wrap the previous ciphertext in another layer.
    const once = encryptSecret('pat-abc123')
    expect(encryptSecret(once)).toBe(once)
    expect(safeStorage.encryptString).toHaveBeenCalledTimes(1)
  })

  it('returns a plaintext value untouched when asked to decrypt it', () => {
    // A store written before this feature, or written on a machine with no
    // keyring, holds plaintext. Reading it must keep working.
    expect(decryptSecret('pat-abc123')).toBe('pat-abc123')
    expect(safeStorage.decryptString).not.toHaveBeenCalled()
  })

  it('falls back to plaintext when the OS has no keyring', () => {
    // Linux without libsecret. Refusing to save would be worse than saving the
    // way the app already did before this feature.
    safeStorage.isEncryptionAvailable.mockReturnValue(false)
    expect(isSecretEncryptionAvailable()).toBe(false)
    expect(encryptSecret('pat-abc123')).toBe('pat-abc123')
  })

  it('yields an empty secret when the ciphertext cannot be decrypted', () => {
    // The keychain entry was revoked, or the config was copied to another
    // machine. The honest outcome is "not configured, type it again", never a
    // crash at launch and never a garbage value sent to Azure DevOps.
    safeStorage.decryptString.mockImplementation(() => {
      throw new Error('decryption failed')
    })
    expect(decryptSecret(encryptSecret('pat-abc123'))).toBe('')
  })
})

describe('encryptStoredSecrets', () => {
  function fakeStore(settings: unknown) {
    const data: Record<string, unknown> = { settings }
    return {
      get: (key: string) => data[key],
      set: (key: string, value: unknown) => {
        data[key] = value
      },
      read: () => data.settings as Record<string, unknown>
    }
  }

  beforeEach(() => {
    safeStorage.isEncryptionAvailable.mockReturnValue(true)
    safeStorage.encryptString.mockClear()
  })

  it('encrypts the plaintext secrets a previous version left behind', () => {
    const store = fakeStore({ orgUrl: 'https://dev.azure.com/contoso', pat: 'pat-abc', apiKey: 'sk-abc' })
    encryptStoredSecrets(store)
    const saved = store.read()
    expect(isEncryptedSecret(saved.pat as string)).toBe(true)
    expect(isEncryptedSecret(saved.apiKey as string)).toBe(true)
    expect(saved.orgUrl).toBe('https://dev.azure.com/contoso')
  })

  it('does not rewrite the store when everything is already encrypted', () => {
    // This runs on every launch: a write per launch would churn the config file
    // and, on a crash mid-write, is the one moment the store can be lost.
    const store = fakeStore({ pat: encryptSecret('pat-abc'), apiKey: '' })
    const spy = vi.spyOn(store, 'set')
    encryptStoredSecrets(store)
    expect(spy).not.toHaveBeenCalled()
  })

  it('leaves the store alone when the OS has no keyring', () => {
    safeStorage.isEncryptionAvailable.mockReturnValue(false)
    const store = fakeStore({ pat: 'pat-abc', apiKey: '' })
    const spy = vi.spyOn(store, 'set')
    encryptStoredSecrets(store)
    expect(spy).not.toHaveBeenCalled()
    expect(store.read().pat).toBe('pat-abc')
  })

  it('survives a store with no settings at all', () => {
    const store = fakeStore(null)
    expect(() => encryptStoredSecrets(store)).not.toThrow()
  })

  it('keeps a field plaintext and moves on when the keychain throws mid-sweep', () => {
    // isSecretEncryptionAvailable() at the top is check-then-use: the keyring
    // can still fail on the actual encrypt call (a session that locks, a
    // dismissed permission prompt). One field's failure must not take the
    // sweep down, and must not stop the other field from being encrypted.
    safeStorage.encryptString.mockImplementationOnce(() => {
      throw new Error('keychain locked')
    })
    const store = fakeStore({ pat: 'pat-abc', apiKey: 'sk-abc' })
    expect(() => encryptStoredSecrets(store)).not.toThrow()
    const saved = store.read()
    expect(saved.pat).toBe('pat-abc')
    expect(isEncryptedSecret(saved.apiKey as string)).toBe(true)
  })
})
