import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import type { AppError } from '@shared/types'

const { handlers, exposedApis, ipcMainHandle, storeGet, storeSet, ipcRendererInvoke } = vi.hoisted(
  () => {
    const handlers = new Map<string, (...args: unknown[]) => Promise<unknown>>()
    const exposedApis = new Map<string, Record<string, (...args: never[]) => Promise<unknown>>>()

    return {
      handlers,
      exposedApis,
      ipcMainHandle: vi.fn((channel: string, handler: (...args: unknown[]) => Promise<unknown>) => {
        handlers.set(channel, handler)
      }),
      storeGet: vi.fn(),
      storeSet: vi.fn(),
      ipcRendererInvoke: vi.fn()
    }
  }
)

vi.mock('electron', () => ({
  ipcMain: { handle: ipcMainHandle },
  shell: { openExternal: vi.fn() },
  contextBridge: {
    exposeInMainWorld: (
      name: string,
      api: Record<string, (...args: never[]) => Promise<unknown>>
    ) => exposedApis.set(name, api)
  },
  ipcRenderer: { invoke: ipcRendererInvoke, on: vi.fn(), removeListener: vi.fn() }
}))

vi.mock('@main/store', () => ({ store: { get: storeGet, set: storeSet } }))
vi.mock('@main/ado/ado-service', () => ({
  fetchBugsFromQuery: vi.fn(),
  testAdoConnection: vi.fn()
}))
vi.mock('@main/ado/ado-client', () => ({ fetchAdoAttachmentDataUrl: vi.fn() }))
vi.mock('@main/llm', () => ({
  categorizeBugs: vi.fn(),
  testLLMConnection: vi.fn(),
  findSimilarBugs: vi.fn()
}))

import { registerIPCHandlers } from '../../src/main/ipc-handlers'
import '../../src/preload/index'

const preloadApi = exposedApis.get('electronAPI') as {
  fetchBugs: () => Promise<unknown>
  fetchAdoAttachmentDataUrl: (url: string) => Promise<unknown>
}

const STORE_FAILURE: AppError = { code: 'STORE_ERROR', message: 'Store non disponibile' }

const ATTACHMENT_URL =
  'https://dev.azure.com/gversino/BugCat/_apis/wit/attachments/id?fileName=image.png'

const invokeEvent = (): unknown => ({ sender: { id: 1, send: vi.fn() } })

/**
 * Models how Electron delivers a rejected `ipcMain.handle` to the renderer:
 * only a real `Error`'s `message` survives the serialization (custom
 * properties such as `code` never do), anything else is stringified — a plain
 * object becomes `[object Object]` — and the whole thing reaches the renderer
 * wrapped in the `Error invoking remote method '<channel>'` prefix.
 */
function serializeAcrossElectronIpc(channel: string, thrown: unknown): Error {
  const serialized = thrown instanceof Error ? `Error: ${thrown.message}` : String(thrown)
  return new Error(`Error invoking remote method '${channel}': ${serialized}`)
}

/** Runs the real main handler, pushes what it threw through the boundary model, and returns what the renderer catches. */
async function rejectionSeenByRenderer(
  channel: string,
  callFromRenderer: () => Promise<unknown>,
  ...handlerArgs: unknown[]
): Promise<unknown> {
  const mainHandler = handlers.get(channel)
  expect(mainHandler).toBeDefined()

  const thrownInMain = await mainHandler!(invokeEvent(), ...handlerArgs).then(
    () => expect.unreachable(`${channel} was expected to reject in the main process`),
    (error: unknown) => error
  )

  ipcRendererInvoke.mockRejectedValueOnce(serializeAcrossElectronIpc(channel, thrownInMain))

  return callFromRenderer().then(
    () => expect.unreachable(`${channel} was expected to reject in the renderer`),
    (error: unknown) => error
  )
}

/**
 * Channels whose handler has no reachable failure path, so they cannot be
 * driven through the wrapper: PING is a constant, and the two categorization
 * lifecycle channels only read an in-memory map.
 */
const CHANNELS_WITHOUT_FAILURE_PATH: readonly string[] = [
  IPC_CHANNELS.PING,
  IPC_CHANNELS.LLM_CATEGORIZE_CANCEL,
  IPC_CHANNELS.LLM_CATEGORIZE_STATUS
]

/** Every other registered channel, with arguments that make it fail. */
const FAILABLE_CHANNELS: ReadonlyArray<{
  channel: string
  args: unknown[]
  expectedWireMessage: string
}> = [
  {
    channel: IPC_CHANNELS.SETTINGS_GET,
    args: [],
    expectedWireMessage: 'STORE_ERROR::Store non disponibile'
  },
  {
    channel: IPC_CHANNELS.SETTINGS_SET,
    args: [{}],
    expectedWireMessage: 'STORE_ERROR::Store non disponibile'
  },
  {
    channel: IPC_CHANNELS.SESSION_GET,
    args: [],
    expectedWireMessage: 'STORE_ERROR::Store non disponibile'
  },
  {
    channel: IPC_CHANNELS.SESSION_CLEAR,
    args: [],
    expectedWireMessage: 'STORE_ERROR::Store non disponibile'
  },
  {
    channel: IPC_CHANNELS.CATALOG_CLEAR,
    args: [],
    expectedWireMessage: 'STORE_ERROR::Store non disponibile'
  },
  {
    channel: IPC_CHANNELS.CATALOG_GET_CLOSED,
    args: [],
    expectedWireMessage: 'STORE_ERROR::Store non disponibile'
  },
  {
    channel: IPC_CHANNELS.ADO_FETCH_BUGS,
    args: [],
    expectedWireMessage: 'STORE_ERROR::Store non disponibile'
  },
  {
    channel: IPC_CHANNELS.ADO_TEST_CONNECTION,
    args: [],
    expectedWireMessage: 'STORE_ERROR::Store non disponibile'
  },
  {
    channel: IPC_CHANNELS.ADO_FETCH_ATTACHMENT_DATA_URL,
    args: [ATTACHMENT_URL],
    expectedWireMessage: 'STORE_ERROR::Store non disponibile'
  },
  {
    channel: IPC_CHANNELS.LLM_CATEGORIZE,
    args: [],
    expectedWireMessage: 'STORE_ERROR::Store non disponibile'
  },
  {
    channel: IPC_CHANNELS.LLM_TEST_CONNECTION,
    args: [],
    expectedWireMessage: 'STORE_ERROR::Store non disponibile'
  },
  {
    channel: IPC_CHANNELS.LLM_FIND_SIMILAR,
    args: [],
    expectedWireMessage: 'STORE_ERROR::Store non disponibile'
  },
  {
    channel: IPC_CHANNELS.OPEN_EXTERNAL,
    args: [42],
    expectedWireMessage: 'UNKNOWN_ERROR::URL must be a string'
  }
]

describe('IPC error contract', () => {
  beforeEach(() => {
    handlers.clear()
    ipcMainHandle.mockClear()
    ipcRendererInvoke.mockReset()
    storeGet.mockReset()
    storeSet.mockReset()
    registerIPCHandlers()
  })

  describe('main process', () => {
    beforeEach(() => {
      storeGet.mockImplementation(() => {
        throw STORE_FAILURE
      })
      storeSet.mockImplementation(() => {
        throw STORE_FAILURE
      })
    })

    it.each(FAILABLE_CHANNELS)(
      'rejects $channel with a real Error carrying the code in its message',
      async ({ channel, args, expectedWireMessage }) => {
        const thrown = await handlers.get(channel)!(invokeEvent(), ...args).then(
          () => expect.unreachable(`${channel} was expected to reject`),
          (error: unknown) => error
        )

        expect(thrown).toBeInstanceOf(Error)
        expect((thrown as Error).message).toBe(expectedWireMessage)
      }
    )

    it('routes every registered channel through the error wrapper', () => {
      const covered = [
        ...FAILABLE_CHANNELS.map((entry) => entry.channel),
        ...CHANNELS_WITHOUT_FAILURE_PATH
      ].sort()

      expect([...handlers.keys()].sort()).toEqual(covered)
    })
  })

  describe('across the boundary', () => {
    it('delivers the error code of a non-categorize channel to the renderer', async () => {
      storeGet.mockReturnValue(null)

      const received = await rejectionSeenByRenderer(IPC_CHANNELS.ADO_FETCH_BUGS, () =>
        preloadApi.fetchBugs()
      )

      expect(received).toEqual({ code: 'STORE_ERROR', message: 'Settings not configured' })
    })

    it('delivers the error code of the attachment channel to the renderer', async () => {
      const received = await rejectionSeenByRenderer(
        IPC_CHANNELS.ADO_FETCH_ATTACHMENT_DATA_URL,
        () => preloadApi.fetchAdoAttachmentDataUrl(''),
        ''
      )

      expect(received).toEqual({ code: 'ADO_NOT_FOUND', message: 'Missing attachment URL' })
    })
  })
})
