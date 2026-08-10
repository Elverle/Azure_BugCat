import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
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
    writeFileSync(join(dir, '.bugcat-key'), 'persisted-key\n')
    machineIdSync.mockReturnValue('a-different-machine-id')

    expect(getEncryptionKey(dir)).toBe('persisted-key')
    expect(machineIdSync).not.toHaveBeenCalled()
  })

  it('persists the machine id on first run so later runs reuse it', () => {
    const dir = makeDir()
    machineIdSync.mockReturnValue('machine-id')

    expect(getEncryptionKey(dir)).toBe('machine-id')
    expect(readFileSync(join(dir, '.bugcat-key'), 'utf-8').trim()).toBe('machine-id')
  })

  it('keeps returning the persisted key after the machine id becomes unavailable', () => {
    const dir = makeDir()
    machineIdSync.mockReturnValue('machine-id')
    expect(getEncryptionKey(dir)).toBe('machine-id')

    machineIdSync.mockImplementation(() => {
      throw new Error('no registry')
    })

    expect(getEncryptionKey(dir)).toBe('machine-id')
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
})
