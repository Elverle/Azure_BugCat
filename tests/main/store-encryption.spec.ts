import { afterEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const { machineIdSync } = vi.hoisted(() => ({ machineIdSync: vi.fn() }))
vi.mock('node-machine-id', () => ({ machineIdSync }))

import { getEncryptionKey } from '@main/store-encryption'

describe('getEncryptionKey', () => {
  const dirs: string[] = []

  const makeDir = (): string => {
    const dir = mkdtempSync(join(tmpdir(), 'bugcat-key-'))
    dirs.push(dir)
    return dir
  }

  afterEach(() => {
    dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }))
    machineIdSync.mockReset()
  })

  it('returns a previously persisted key even when the machine id is available', () => {
    const dir = makeDir()
    // 24 chars — well above MIN_PERSISTED_KEY_LENGTH (16), since FIX 3 now
    // refuses to trust anything shorter as a real persisted key.
    writeFileSync(join(dir, '.bugcat-key'), 'persisted-key-1234567890\n')
    machineIdSync.mockReturnValue('a-different-machine-id-1234567890')

    expect(getEncryptionKey(dir)).toBe('persisted-key-1234567890')
    expect(machineIdSync).not.toHaveBeenCalled()
  })

  it('persists the machine id on first run so later runs reuse it', () => {
    const dir = makeDir()
    machineIdSync.mockReturnValue('machine-id-1234567890')

    expect(getEncryptionKey(dir)).toBe('machine-id-1234567890')
    expect(readFileSync(join(dir, '.bugcat-key'), 'utf-8').trim()).toBe('machine-id-1234567890')
  })

  it('keeps returning the persisted key after the machine id becomes unavailable', () => {
    const dir = makeDir()
    machineIdSync.mockReturnValue('machine-id-1234567890')
    expect(getEncryptionKey(dir)).toBe('machine-id-1234567890')

    machineIdSync.mockImplementation(() => {
      throw new Error('no registry')
    })

    expect(getEncryptionKey(dir)).toBe('machine-id-1234567890')
  })

  it('falls back to a random persisted key when the machine id is unavailable', () => {
    const dir = makeDir()
    machineIdSync.mockImplementation(() => {
      throw new Error('no registry')
    })

    const key = getEncryptionKey(dir)

    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(getEncryptionKey(dir)).toBe(key)
  })

  // FIX 3: `conf` treats a falsy `encryptionKey` as "no encryption" — a 0-byte
  // (or whitespace-only) `.bugcat-key`, left behind by a crash mid-write, a full
  // disk, or an AV/backup tool truncating it, must not be trusted as-is: doing
  // so silently downgrades the whole store to plaintext from then on.
  it('regenerates the key instead of trusting a zero-byte persisted file', () => {
    const dir = makeDir()
    writeFileSync(join(dir, '.bugcat-key'), '')
    machineIdSync.mockImplementation(() => {
      throw new Error('no registry')
    })

    const key = getEncryptionKey(dir)

    expect(key).not.toBe('')
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(readFileSync(join(dir, '.bugcat-key'), 'utf-8').trim()).toBe(key)
    expect(getEncryptionKey(dir)).toBe(key)
  })

  it('regenerates the key instead of trusting a whitespace-only persisted file', () => {
    const dir = makeDir()
    writeFileSync(join(dir, '.bugcat-key'), '   \n\t  ')
    machineIdSync.mockImplementation(() => {
      throw new Error('no registry')
    })

    const key = getEncryptionKey(dir)

    expect(key).not.toBe('')
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(getEncryptionKey(dir)).toBe(key)
  })

  it('writes the key atomically via a temp-file rename, leaving no .tmp sibling behind', () => {
    const dir = makeDir()
    machineIdSync.mockReturnValue('machine-id')

    getEncryptionKey(dir)

    expect(existsSync(join(dir, '.bugcat-key.tmp'))).toBe(false)
    expect(existsSync(join(dir, '.bugcat-key'))).toBe(true)
  })
})
