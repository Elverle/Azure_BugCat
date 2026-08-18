import { randomBytes } from 'crypto'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import { machineIdSync } from 'node-machine-id'

/**
 * A persisted key shorter than this cannot be one this module ever wrote (a
 * machine id or a 64-hex random fallback are both well over this): treating it
 * as valid anyway would hand `conf` a falsy or near-empty `encryptionKey`.
 * `conf` treats that as "no encryption" (node_modules/conf/dist/source/index.js,
 * the encryptionKey ? ... : readFileSync(..., 'utf8') branch), so an empty file
 * would silently downgrade the whole store to plaintext instead of failing loudly.
 */
const MIN_PERSISTED_KEY_LENGTH = 16

/**
 * The encryption key is derived once and then persisted: machine-id availability
 * can change between runs (antivirus, VM, registry policies) and a key change
 * makes the already encrypted store unreadable forever.
 *
 * `.bugcat-key` sits next to `bug-categorizer-config.json` in `userData`, so key
 * and ciphertext travel together in any backup or roamed profile — unlike the
 * previous machine-id derivation, a copy of this file is enough to decrypt the
 * store elsewhere. That makes this at-rest encryption obfuscation rather than
 * real protection; `safeStorage.encryptString` (backed by the OS keychain/DPAPI)
 * would be the real answer and is deferred to a later phase. `{ mode: 0o600 }`
 * below is a no-op on Windows (no POSIX permission bits) — it only restricts
 * access on macOS/Linux.
 */
export function getEncryptionKey(userDataPath: string): string {
  const keyPath = join(userDataPath, '.bugcat-key')
  if (existsSync(keyPath)) {
    const persisted = readFileSync(keyPath, 'utf-8').trim()
    if (persisted.length >= MIN_PERSISTED_KEY_LENGTH) {
      return persisted
    }
    // Too short to be a key this module ever wrote (0-byte from a crash mid-write,
    // a full disk, or an AV/backup tool truncating it) — fall through and
    // regenerate rather than handing `conf` a falsy/weak encryptionKey.
  }

  let key: string
  try {
    key = machineIdSync(true)
  } catch {
    key = randomBytes(32).toString('hex')
  }
  writeKeyAtomically(keyPath, key)
  return key
}

/**
 * `writeFileSync` alone is not atomic: a crash, a full disk, or an AV/backup
 * tool mid-write can leave a truncated or empty file behind — which is exactly
 * the failure mode `MIN_PERSISTED_KEY_LENGTH` above exists to catch on read.
 * Writing to a temp sibling first and renaming it into place means a reader
 * only ever observes a complete key or the previous one, never a partial write.
 */
function writeKeyAtomically(keyPath: string, key: string): void {
  const tmpPath = `${keyPath}.tmp`
  writeFileSync(tmpPath, key, { mode: 0o600 })
  renameSync(tmpPath, keyPath)
}
