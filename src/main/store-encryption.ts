import { randomBytes } from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { machineIdSync } from 'node-machine-id'

/**
 * The encryption key is derived once and then persisted: machine-id availability
 * can change between runs (antivirus, VM, registry policies) and a key change
 * makes the already encrypted store unreadable forever.
 */
export function getEncryptionKey(userDataPath: string): string {
  const keyPath = join(userDataPath, '.bugcat-key')
  if (existsSync(keyPath)) {
    return readFileSync(keyPath, 'utf-8').trim()
  }

  let key: string
  try {
    key = machineIdSync(true)
  } catch {
    key = randomBytes(32).toString('hex')
  }
  writeFileSync(keyPath, key, { mode: 0o600 })
  return key
}
