import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const { getPath, StoreCtor } = vi.hoisted(() => ({ getPath: vi.fn(), StoreCtor: vi.fn() }))
vi.mock('electron', () => ({ app: { getPath } }))
vi.mock('electron-store', () => ({ default: StoreCtor }))
vi.mock('node-machine-id', () => ({ machineIdSync: () => 'test-machine-id' }))

const CONFIG_FILE = 'bug-categorizer-config.json'

describe('store bootstrap', () => {
  const dirs: string[] = []
  let userDataPath: string
  let configPath: string

  const fakeStore = (): { get: ReturnType<typeof vi.fn> } => ({ get: vi.fn() })
  const backupsIn = (dir: string): string[] =>
    readdirSync(dir).filter((entry) => entry.includes('.corrupt-'))

  beforeEach(() => {
    vi.resetModules()
    StoreCtor.mockReset()
    userDataPath = mkdtempSync(join(tmpdir(), 'bugcat-store-'))
    dirs.push(userDataPath)
    configPath = join(userDataPath, CONFIG_FILE)
    getPath.mockReturnValue(userDataPath)
  })

  afterEach(() => {
    dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }))
  })

  it('opens the store with the persisted encryption key and leaves a healthy config alone', async () => {
    writeFileSync(configPath, '{}')
    const healthy = fakeStore()
    StoreCtor.mockImplementation(function () {
      return healthy
    })

    const { store } = await import('@main/store')

    expect(store).toBe(healthy)
    expect(StoreCtor).toHaveBeenCalledTimes(1)
    expect(StoreCtor.mock.calls[0][0]).toMatchObject({
      name: 'bug-categorizer-config',
      encryptionKey: 'test-machine-id'
    })
    expect(existsSync(configPath)).toBe(true)
    expect(backupsIn(userDataPath)).toHaveLength(0)
  })

  it('backs up an unreadable config and starts fresh instead of crashing at launch', async () => {
    writeFileSync(configPath, 'undecryptable-garbage')
    const fresh = fakeStore()
    StoreCtor.mockImplementationOnce(function () {
      throw new Error('Unable to decrypt the config file')
    }).mockImplementationOnce(function () {
      return fresh
    })

    const { store } = await import('@main/store')

    expect(store).toBe(fresh)
    expect(existsSync(configPath)).toBe(false)
    expect(backupsIn(userDataPath)).toHaveLength(1)
  })

  it('recovers when the failure only surfaces on the first read', async () => {
    writeFileSync(configPath, 'undecryptable-garbage')
    const fresh = fakeStore()
    StoreCtor.mockImplementationOnce(function () {
      return {
        get: () => {
          throw new Error('Unable to decrypt the config file')
        }
      }
    }).mockImplementationOnce(function () {
      return fresh
    })

    const { store } = await import('@main/store')

    expect(store).toBe(fresh)
    expect(backupsIn(userDataPath)).toHaveLength(1)
  })

  it('still starts fresh when there is no config file to back up', async () => {
    const fresh = fakeStore()
    StoreCtor.mockImplementationOnce(function () {
      throw new Error('Unable to decrypt the config file')
    }).mockImplementationOnce(function () {
      return fresh
    })

    const { store } = await import('@main/store')

    expect(store).toBe(fresh)
    expect(backupsIn(userDataPath)).toHaveLength(0)
  })
})
