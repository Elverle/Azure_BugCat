import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSettings } from '@shared/types'
import { IPC_CHANNELS } from '@shared/ipc-channels'

const { handlers, ipcMainHandle, storeGet, storeSet, fetchBugsFromQuery, testAdoConnection } =
  vi.hoisted(() => ({
    handlers: new Map<string, (...args: unknown[]) => unknown>(),
    ipcMainHandle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler)
    }),
    storeGet: vi.fn(),
    storeSet: vi.fn(),
    fetchBugsFromQuery: vi.fn(),
    testAdoConnection: vi.fn()
  }))

vi.mock('electron', () => ({
  ipcMain: {
    handle: ipcMainHandle
  }
}))

vi.mock('@main/store', () => ({
  store: {
    get: storeGet,
    set: storeSet
  }
}))

vi.mock('@main/ado/ado-service', () => ({
  fetchBugsFromQuery,
  testAdoConnection
}))

import { registerIPCHandlers } from '@main/ipc-handlers'

const baseSettings: AppSettings = {
  orgUrl: 'https://dev.azure.com/alpitour',
  projectName: 'BugCat',
  queryId: '123e4567-e89b-12d3-a456-426614174000',
  topN: 20,
  chunkSize: 15,
  llmProvider: 'openai',
  apiKey: 'sk-test',
  pat: 'pat-token',
  categories: [],
  copilotAuthStatus: 'unknown'
}

describe('registerIPCHandlers', () => {
  beforeEach(() => {
    handlers.clear()
    ipcMainHandle.mockClear()
    storeGet.mockReset()
    storeSet.mockReset()
    fetchBugsFromQuery.mockReset()
    testAdoConnection.mockReset()
    registerIPCHandlers()
  })

  it('registers the expected IPC channels', () => {
    expect(ipcMainHandle).toHaveBeenCalledWith(IPC_CHANNELS.PING, expect.any(Function))
    expect(ipcMainHandle).toHaveBeenCalledWith(IPC_CHANNELS.SETTINGS_GET, expect.any(Function))
    expect(ipcMainHandle).toHaveBeenCalledWith(
      IPC_CHANNELS.ADO_TEST_CONNECTION,
      expect.any(Function)
    )
    expect(ipcMainHandle).toHaveBeenCalledWith(
      IPC_CHANNELS.LLM_TEST_CONNECTION,
      expect.any(Function)
    )
  })

  it('uses the override settings for the ADO test connection flow', async () => {
    testAdoConnection.mockResolvedValue({ success: true, message: 'ok' })

    const result = await handlers.get(IPC_CHANNELS.ADO_TEST_CONNECTION)?.({}, baseSettings)

    expect(storeGet).not.toHaveBeenCalled()
    expect(testAdoConnection).toHaveBeenCalledWith(baseSettings)
    expect(result).toEqual({ success: true, message: 'ok' })
  })

  it('returns provider-specific validation feedback for LLM test connection overrides', async () => {
    const resultWithoutKey = await handlers.get(IPC_CHANNELS.LLM_TEST_CONNECTION)?.(
      {},
      {
        ...baseSettings,
        apiKey: ''
      }
    )
    const resultCopilot = await handlers.get(IPC_CHANNELS.LLM_TEST_CONNECTION)?.(
      {},
      {
        ...baseSettings,
        llmProvider: 'github-copilot',
        apiKey: '',
        copilotAuthStatus: 'unauthenticated'
      }
    )

    expect(resultWithoutKey).toEqual({ success: false, message: 'API Key mancante' })
    expect(resultCopilot).toEqual({
      success: false,
      message: 'Autenticazione GitHub Copilot richiesta'
    })
  })

  it('reads persisted settings for bug fetching and throws if they are missing', async () => {
    storeGet.mockReturnValueOnce(null)

    await expect(handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.()).rejects.toMatchObject({
      code: 'STORE_ERROR',
      message: 'Settings non configurate'
    })

    storeGet.mockReturnValueOnce(baseSettings)
    fetchBugsFromQuery.mockResolvedValue([{ id: 1 }])

    const result = await handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.()
    expect(fetchBugsFromQuery).toHaveBeenCalledWith(baseSettings)
    expect(storeSet).toHaveBeenCalledWith(
      'session',
      expect.objectContaining({
        fetchedAt: expect.any(String),
        bugs: [
          expect.objectContaining({
            id: 1,
            macroCategory: '',
            subCategory: '',
            categoryReason: '',
            categorizedAt: ''
          })
        ]
      })
    )
    expect(result).toEqual([
      expect.objectContaining({
        id: 1,
        macroCategory: '',
        subCategory: '',
        categoryReason: '',
        categorizedAt: ''
      })
    ])
  })

  it('SESSION_CLEAR sets session to null', async () => {
    await handlers.get(IPC_CHANNELS.SESSION_CLEAR)?.()

    expect(storeSet).toHaveBeenCalledWith('session', null)
  })

  it('SESSION_GET returns stored session', async () => {
    const mockSession = {
      fetchedAt: '2026-05-01T00:00:00.000Z',
      bugs: [{ id: 42, macroCategory: 'UI', subCategory: 'Layout', categoryReason: 'test', categorizedAt: '2026-05-01T00:00:00.000Z' }]
    }
    storeGet.mockReturnValueOnce(mockSession)

    const result = await handlers.get(IPC_CHANNELS.SESSION_GET)?.()

    expect(storeGet).toHaveBeenCalledWith('session')
    expect(result).toEqual(mockSession)
  })
})
