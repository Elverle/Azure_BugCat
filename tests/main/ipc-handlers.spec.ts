import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSettings } from '../../src/shared/types'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'

const {
  handlers,
  ipcMainHandle,
  storeGet,
  storeSet,
  fetchBugsFromQuery,
  testAdoConnection,
  fetchAdoAttachmentDataUrl,
  categorizeBugs,
  testLLMConnection,
  findSimilarBugs,
  execFileMock,
  showOpenDialog,
  getFocusedWindow,
  existsSyncMock,
  statSyncMock,
  sessionManagerStartMock,
  sessionManagerAbortMock,
  createRunnerMock,
  buildAnalyzePromptMock
} = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  ipcMainHandle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
    handlers.set(channel, handler)
  }),
  storeGet: vi.fn(),
  storeSet: vi.fn(),
  fetchBugsFromQuery: vi.fn(),
  testAdoConnection: vi.fn(),
  fetchAdoAttachmentDataUrl: vi.fn(),
  categorizeBugs: vi.fn(),
  testLLMConnection: vi.fn(),
  findSimilarBugs: vi.fn(),
  execFileMock: vi.fn(),
  showOpenDialog: vi.fn(),
  getFocusedWindow: vi.fn(),
  existsSyncMock: vi.fn(),
  statSyncMock: vi.fn(),
  sessionManagerStartMock: vi.fn().mockReturnValue('test-session-id'),
  sessionManagerAbortMock: vi.fn().mockReturnValue(true),
  createRunnerMock: vi.fn().mockReturnValue({ run: vi.fn() }),
  buildAnalyzePromptMock: vi.fn().mockReturnValue('mock analysis prompt')
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: ipcMainHandle
  },
  dialog: {
    showOpenDialog: showOpenDialog
  },
  BrowserWindow: {
    getFocusedWindow: getFocusedWindow
  }
}))

vi.mock('child_process', () => ({
  execFile: execFileMock
}))

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  statSync: statSyncMock
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

vi.mock('@main/ado/ado-client', () => ({
  fetchAdoAttachmentDataUrl
}))

vi.mock('@main/llm', () => ({
  categorizeBugs,
  testLLMConnection,
  findSimilarBugs
}))

// Mock agent module to prevent SDK resolution errors and enable agent handler tests
vi.mock('@main/agent', () => {
  class MockSessionManager {
    start = sessionManagerStartMock
    abort = sessionManagerAbortMock
    getSession = vi.fn()
    isRunning = vi.fn().mockReturnValue(false)
    clear = vi.fn()
  }
  class AgentNotConfiguredError extends Error {
    constructor(msg = 'Not configured') {
      super(msg)
      this.name = 'AgentNotConfiguredError'
    }
  }
  return {
    SessionManager: MockSessionManager,
    createRunner: createRunnerMock,
    buildAnalyzePrompt: buildAnalyzePromptMock,
    AgentNotConfiguredError
  }
})

import { registerIPCHandlers } from '../../src/main/ipc-handlers'

const baseSettings: AppSettings = {
  orgUrl: 'https://dev.azure.com/gversino',
  projectName: 'BugCat',
  queryId: '123e4567-e89b-12d3-a456-426614174000',
  topN: 20,
  chunkSize: 15,
  llmProvider: 'openai',
  apiKey: 'sk-test',
  pat: 'pat-token',
  categories: [],
  agentProvider: 'none',
  projects: [],
  architectureContext: '',
  maxConcurrentSessions: 1
}

describe('registerIPCHandlers', () => {
  beforeEach(() => {
    handlers.clear()
    ipcMainHandle.mockClear()
    storeGet.mockReset()
    storeSet.mockReset()
    fetchBugsFromQuery.mockReset()
    testAdoConnection.mockReset()
    fetchAdoAttachmentDataUrl.mockReset()
    categorizeBugs.mockReset()
    testLLMConnection.mockReset()
    findSimilarBugs.mockReset()
    execFileMock.mockReset()
    showOpenDialog.mockReset()
    getFocusedWindow.mockReset()
    sessionManagerStartMock.mockReset().mockReturnValue('test-session-id')
    sessionManagerAbortMock.mockReset().mockReturnValue(true)
    createRunnerMock.mockReset().mockReturnValue({ run: vi.fn() })
    buildAnalyzePromptMock.mockReset().mockReturnValue('mock analysis prompt')
    registerIPCHandlers()
  })

  it('registers the expected IPC channels', () => {
    expect(ipcMainHandle).toHaveBeenCalledWith(IPC_CHANNELS.PING, expect.any(Function))
    expect(ipcMainHandle).toHaveBeenCalledWith(IPC_CHANNELS.SETTINGS_GET, expect.any(Function))
    expect(ipcMainHandle).toHaveBeenCalledWith(IPC_CHANNELS.LLM_CATEGORIZE, expect.any(Function))
    expect(ipcMainHandle).toHaveBeenCalledWith(
      IPC_CHANNELS.LLM_CATEGORIZE_CANCEL,
      expect.any(Function)
    )
    expect(ipcMainHandle).toHaveBeenCalledWith(
      IPC_CHANNELS.LLM_CATEGORIZE_STATUS,
      expect.any(Function)
    )
    expect(ipcMainHandle).toHaveBeenCalledWith(
      IPC_CHANNELS.ADO_TEST_CONNECTION,
      expect.any(Function)
    )
    expect(ipcMainHandle).toHaveBeenCalledWith(
      IPC_CHANNELS.ADO_FETCH_ATTACHMENT_DATA_URL,
      expect.any(Function)
    )
    expect(ipcMainHandle).toHaveBeenCalledWith(
      IPC_CHANNELS.LLM_TEST_CONNECTION,
      expect.any(Function)
    )
    expect(ipcMainHandle).toHaveBeenCalledWith(IPC_CHANNELS.CATALOG_CLEAR, expect.any(Function))
    expect(ipcMainHandle).toHaveBeenCalledWith(
      IPC_CHANNELS.CATALOG_GET_CLOSED,
      expect.any(Function)
    )
  })

  it('fetches ADO attachments through the main process using persisted settings', async () => {
    storeGet.mockReturnValueOnce(baseSettings)
    fetchAdoAttachmentDataUrl.mockResolvedValue('data:image/png;base64,AAA=')

    const result = await handlers.get(IPC_CHANNELS.ADO_FETCH_ATTACHMENT_DATA_URL)?.(
      {},
      'https://dev.azure.com/gversino/834b6bb6-7aa6-4920-95f9-940c95460830/_apis/wit/attachments/image-id?fileName=image.png'
    )

    expect(fetchAdoAttachmentDataUrl).toHaveBeenCalledWith(
      baseSettings,
      'https://dev.azure.com/gversino/834b6bb6-7aa6-4920-95f9-940c95460830/_apis/wit/attachments/image-id?fileName=image.png'
    )
    expect(result).toBe('data:image/png;base64,AAA=')
  })

  it('uses the override settings for the ADO test connection flow', async () => {
    testAdoConnection.mockResolvedValue({ success: true, message: 'ok' })

    const result = await handlers.get(IPC_CHANNELS.ADO_TEST_CONNECTION)?.({}, baseSettings)

    expect(storeGet).not.toHaveBeenCalled()
    expect(testAdoConnection).toHaveBeenCalledWith(baseSettings)
    expect(result).toEqual({ success: true, message: 'ok' })
  })

  it('returns validation feedback for LLM test connection without API key', async () => {
    const resultWithoutKey = await handlers.get(IPC_CHANNELS.LLM_TEST_CONNECTION)?.(
      {},
      {
        ...baseSettings,
        apiKey: ''
      }
    )

    expect(resultWithoutKey).toEqual({ success: false, message: 'API Key mancante' })
  })

  it('reads persisted settings for bug fetching and throws if they are missing', async () => {
    storeGet.mockReturnValueOnce(null)

    await expect(handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.()).rejects.toMatchObject({
      code: 'STORE_ERROR',
      message: 'Settings non configurate'
    })

    storeGet.mockImplementation((key: string) => {
      if (key === 'settings') return baseSettings
      if (key === 'bugCatalog') return null
      return null
    })
    fetchBugsFromQuery.mockResolvedValue([
      {
        id: 1,
        title: 'Bug 1',
        state: 'Active',
        assignee: null,
        areaPath: 'Project\\Area',
        description: 'Description',
        priority: 2,
        createdDate: '2024-01-01T00:00:00Z',
        updatedDate: '2024-01-01T00:00:00Z',
        tags: []
      }
    ])

    const result = await handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.()
    expect(fetchBugsFromQuery).toHaveBeenCalledWith(baseSettings)
    expect(storeSet).toHaveBeenCalledWith('bugCatalog', expect.any(Object))
    expect(storeSet).toHaveBeenCalledWith(
      'session',
      expect.objectContaining({
        fetchedAt: expect.any(String),
        lastFetchNewCount: 1,
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
      bugs: [
        {
          id: 42,
          macroCategory: 'UI',
          subCategory: 'Layout',
          categoryReason: 'test',
          categorizedAt: '2026-05-01T00:00:00.000Z'
        }
      ]
    }
    storeGet.mockReturnValueOnce(mockSession)

    const result = await handlers.get(IPC_CHANNELS.SESSION_GET)?.()

    expect(storeGet).toHaveBeenCalledWith('session')
    expect(result).toEqual(mockSession)
  })

  it('cancels an active categorization without persisting partial results', async () => {
    storeGet.mockReturnValueOnce(baseSettings).mockReturnValueOnce({
      fetchedAt: '2026-05-01T00:00:00.000Z',
      bugs: [{ id: 1 }]
    })

    categorizeBugs.mockImplementation(
      (_settings, _bugs, _onProgress, signal?: AbortSignal) =>
        new Promise((_, reject) => {
          signal?.addEventListener(
            'abort',
            () => {
              reject({ code: 'OPERATION_CANCELLED', message: 'Categorizzazione annullata' })
            },
            { once: true }
          )
        })
    )

    const categorizeHandler = handlers.get(IPC_CHANNELS.LLM_CATEGORIZE)
    const cancelHandler = handlers.get(IPC_CHANNELS.LLM_CATEGORIZE_CANCEL)
    const event = { sender: { id: 99, send: vi.fn() } }

    const categorizePromise = categorizeHandler?.(event)

    await expect(cancelHandler?.({ sender: { id: 99 } })).resolves.toEqual({ cancelled: true })
    await expect(categorizePromise).rejects.toMatchObject({ code: 'OPERATION_CANCELLED' })
    expect(storeSet).not.toHaveBeenCalledWith('session', expect.objectContaining({ bugs: [] }))
    expect(storeSet).not.toHaveBeenCalled()
  })

  it('surfaces a readable error when categorization is requested twice concurrently', async () => {
    storeGet.mockImplementation((key: string) => {
      if (key === 'settings') {
        return baseSettings
      }

      if (key === 'session') {
        return {
          fetchedAt: '2026-05-01T00:00:00.000Z',
          bugs: [{ id: 1 }]
        }
      }

      return null
    })

    categorizeBugs.mockImplementation(
      () =>
        new Promise(() => {
          // Keep the first categorization pending so the second request hits the in-flight guard.
        })
    )

    const categorizeHandler = handlers.get(IPC_CHANNELS.LLM_CATEGORIZE)
    const event = { sender: { id: 77, send: vi.fn() } }

    void categorizeHandler?.(event)

    await expect(categorizeHandler?.(event)).rejects.toMatchObject({
      code: 'UNKNOWN_ERROR',
      message: 'Categorizzazione gia in corso'
    })
  })

  describe('ADO_FETCH_BUGS — incremental merge', () => {
    const makeBug = (id: number, title = 'Bug', description = 'desc') => ({
      id,
      title,
      state: 'Active',
      assignee: null,
      areaPath: 'Project\\Area',
      description,
      priority: 2,
      createdDate: '2024-01-01T00:00:00Z',
      updatedDate: '2024-01-01T00:00:00Z',
      tags: []
    })

    it('first fetch with no catalog creates catalog and session', async () => {
      storeGet.mockImplementation((key: string) => {
        if (key === 'settings') return baseSettings
        if (key === 'bugCatalog') return null
        return null
      })
      fetchBugsFromQuery.mockResolvedValue([makeBug(1), makeBug(2)])

      await handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.()

      expect(storeSet).toHaveBeenCalledWith(
        'bugCatalog',
        expect.objectContaining({
          1: expect.objectContaining({ id: 1, firstSeenAt: expect.any(String), closedAt: null }),
          2: expect.objectContaining({ id: 2, firstSeenAt: expect.any(String), closedAt: null })
        })
      )
      expect(storeSet).toHaveBeenCalledWith(
        'session',
        expect.objectContaining({
          lastFetchNewCount: 2,
          bugs: expect.arrayContaining([
            expect.objectContaining({ id: 1, macroCategory: '' }),
            expect.objectContaining({ id: 2, macroCategory: '' })
          ])
        })
      )
    })

    it('reuses categorization for unchanged bugs in second fetch', async () => {
      const bug1 = makeBug(1)
      // Compute the real signature by importing it
      const { computeInputSignature } = await import('@main/utils/catalog-merge')
      const sig = computeInputSignature(bug1)

      const existingCatalog = {
        1: {
          ...bug1,
          macroCategory: 'UI',
          subCategory: 'Layout',
          categoryReason: 'test reason',
          categorizedAt: '2024-06-01T00:00:00Z',
          firstSeenAt: '2024-05-01T00:00:00Z',
          lastSeenAt: '2024-05-15T00:00:00Z',
          closedAt: null,
          inputSignature: sig,
          everInSimilarityGroup: false,
          lastSimilarityGroupAt: null
        }
      }

      storeGet.mockImplementation((key: string) => {
        if (key === 'settings') return baseSettings
        if (key === 'bugCatalog') return existingCatalog
        return null
      })
      fetchBugsFromQuery.mockResolvedValue([bug1])

      const result = await handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.()

      expect(result).toEqual([
        expect.objectContaining({
          id: 1,
          macroCategory: 'UI',
          subCategory: 'Layout',
          categoryReason: 'test reason',
          categorizedAt: '2024-06-01T00:00:00Z'
        })
      ])
      expect(storeSet).toHaveBeenCalledWith(
        'session',
        expect.objectContaining({ lastFetchNewCount: 0 })
      )
    })

    it('marks absent bugs as closed in catalog', async () => {
      const { computeInputSignature } = await import('@main/utils/catalog-merge')
      const bug1 = makeBug(1)
      const sig = computeInputSignature(bug1)

      const existingCatalog = {
        1: {
          ...bug1,
          macroCategory: 'UI',
          subCategory: 'Layout',
          categoryReason: 'reason',
          categorizedAt: '2024-06-01T00:00:00Z',
          firstSeenAt: '2024-05-01T00:00:00Z',
          lastSeenAt: '2024-05-15T00:00:00Z',
          closedAt: null,
          inputSignature: sig,
          everInSimilarityGroup: false,
          lastSimilarityGroupAt: null
        }
      }

      storeGet.mockImplementation((key: string) => {
        if (key === 'settings') return baseSettings
        if (key === 'bugCatalog') return existingCatalog
        return null
      })
      fetchBugsFromQuery.mockResolvedValue([]) // Bug 1 not in this fetch

      const result = await handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.()

      expect(result).toEqual([]) // No session bugs
      const catalogCall = storeSet.mock.calls.find((c: unknown[]) => c[0] === 'bugCatalog')
      expect(catalogCall![1][1].closedAt).toEqual(expect.any(String))
    })
  })

  describe('LLM_CATEGORIZE — selective categorization', () => {
    const makeCategorizedBug = (id: number, categorizedAt = '') => ({
      id,
      title: `Bug ${id}`,
      state: 'Active',
      assignee: null,
      areaPath: 'Project\\Area',
      description: `Description ${id}`,
      priority: 2,
      createdDate: '2024-01-01T00:00:00Z',
      updatedDate: '2024-01-01T00:00:00Z',
      tags: [],
      macroCategory: categorizedAt ? 'UI' : '',
      subCategory: categorizedAt ? 'Layout' : '',
      categoryReason: categorizedAt ? 'reason' : '',
      categorizedAt
    })

    it('skips LLM call when all bugs are already categorized and sets categorizedAt if missing', async () => {
      storeGet.mockImplementation((key: string) => {
        if (key === 'settings') return baseSettings
        if (key === 'session')
          return {
            bugs: [
              makeCategorizedBug(1, '2024-06-01T00:00:00Z'),
              makeCategorizedBug(2, '2024-06-01T00:00:00Z')
            ],
            fetchedAt: '2024-06-01T00:00:00Z'
          }
        return null
      })

      const event = { sender: { id: 1, send: vi.fn() } }
      const result = await handlers.get(IPC_CHANNELS.LLM_CATEGORIZE)?.(event)

      expect(categorizeBugs).not.toHaveBeenCalled()
      expect(result).toHaveLength(2)
      expect(storeSet).toHaveBeenCalledWith(
        'session',
        expect.objectContaining({
          categorizedAt: expect.any(String)
        })
      )
    })

    it('does not update categorizedAt when all bugs already categorized and timestamp exists', async () => {
      storeGet.mockImplementation((key: string) => {
        if (key === 'settings') return baseSettings
        if (key === 'session')
          return {
            bugs: [
              makeCategorizedBug(1, '2024-06-01T00:00:00Z'),
              makeCategorizedBug(2, '2024-06-01T00:00:00Z')
            ],
            fetchedAt: '2024-06-01T00:00:00Z',
            categorizedAt: '2024-06-01T00:00:00Z'
          }
        return null
      })

      const event = { sender: { id: 1, send: vi.fn() } }
      await handlers.get(IPC_CHANNELS.LLM_CATEGORIZE)?.(event)

      expect(categorizeBugs).not.toHaveBeenCalled()
      expect(storeSet).not.toHaveBeenCalled()
    })

    it('sends only uncategorized bugs to LLM', async () => {
      const { computeInputSignature } = await import('@main/utils/catalog-merge')
      const bug1 = makeCategorizedBug(1, '2024-06-01T00:00:00Z')
      const bug2 = makeCategorizedBug(2) // Not categorized

      const catalog = {
        1: {
          ...bug1,
          firstSeenAt: '2024-05-01',
          lastSeenAt: '2024-06-01',
          closedAt: null,
          inputSignature: computeInputSignature(bug1),
          everInSimilarityGroup: false,
          lastSimilarityGroupAt: null
        },
        2: {
          ...bug2,
          firstSeenAt: '2024-06-01',
          lastSeenAt: '2024-06-01',
          closedAt: null,
          inputSignature: computeInputSignature(bug2),
          everInSimilarityGroup: false,
          lastSimilarityGroupAt: null
        }
      }

      storeGet.mockImplementation((key: string) => {
        if (key === 'settings') return baseSettings
        if (key === 'session') return { bugs: [bug1, bug2], fetchedAt: '2024-06-01T00:00:00Z' }
        if (key === 'bugCatalog') return catalog
        return null
      })

      categorizeBugs.mockResolvedValue([
        {
          ...bug2,
          macroCategory: 'Performance',
          subCategory: 'Memory',
          categoryReason: 'reason',
          categorizedAt: '2024-06-02T00:00:00Z'
        }
      ])

      const event = { sender: { id: 2, send: vi.fn() } }
      await handlers.get(IPC_CHANNELS.LLM_CATEGORIZE)?.(event)

      // Only bug 2 (uncategorized) should be sent to LLM
      expect(categorizeBugs).toHaveBeenCalledWith(
        baseSettings,
        [expect.objectContaining({ id: 2 })],
        expect.any(Function),
        expect.any(Object)
      )
      // Bug 1 should NOT have been sent
      const sentBugs = categorizeBugs.mock.calls[0][1]
      expect(sentBugs).toHaveLength(1)
      expect(sentBugs[0].id).toBe(2)
    })
  })

  describe('LLM_FIND_SIMILAR — catalog metadata update', () => {
    it('updates catalog similarity metadata after finding similar bugs', async () => {
      const session = {
        bugs: [
          {
            id: 1,
            macroCategory: 'UI',
            subCategory: 'Layout',
            categoryReason: 'r',
            categorizedAt: '2024-06-01'
          }
        ],
        fetchedAt: '2024-06-01T00:00:00Z',
        categorizedAt: '2024-06-01T00:00:00Z'
      }

      const catalog = {
        1: {
          ...session.bugs[0],
          title: 'Bug 1',
          state: 'Active',
          assignee: null,
          areaPath: 'A',
          description: 'd',
          priority: 1,
          createdDate: '2024-01-01',
          updatedDate: '2024-01-01',
          tags: [],
          firstSeenAt: '2024-05-01',
          lastSeenAt: '2024-06-01',
          closedAt: null,
          inputSignature: 'abc',
          everInSimilarityGroup: false,
          lastSimilarityGroupAt: null
        }
      }

      const similarityResult = {
        categories: [
          {
            macroCategory: 'UI',
            groups: [{ similarityScore: 0.9, reason: 'similar', bugIds: [1] }]
          }
        ],
        analyzedAt: '2024-06-15T00:00:00Z'
      }

      storeGet.mockImplementation((key: string) => {
        if (key === 'settings') return baseSettings
        if (key === 'session') return session
        if (key === 'bugCatalog') return catalog
        return null
      })
      findSimilarBugs.mockResolvedValue(similarityResult)

      const event = { sender: { id: 3, send: vi.fn() } }
      await handlers.get(IPC_CHANNELS.LLM_FIND_SIMILAR)?.(event)

      const catalogCall = storeSet.mock.calls.find((c: unknown[]) => c[0] === 'bugCatalog')
      expect(catalogCall).toBeDefined()
      expect(catalogCall![1][1].everInSimilarityGroup).toBe(true)
      expect(catalogCall![1][1].lastSimilarityGroupAt).toBe('2024-06-15T00:00:00Z')
    })
  })

  describe('CATALOG_CLEAR', () => {
    it('sets bugCatalog to null without touching session', async () => {
      await handlers.get(IPC_CHANNELS.CATALOG_CLEAR)?.()

      expect(storeSet).toHaveBeenCalledWith('bugCatalog', null)
      expect(storeSet).toHaveBeenCalledWith(
        'catalogMetadata',
        expect.objectContaining({ lastClearedAt: expect.any(String) })
      )
      expect(storeSet).not.toHaveBeenCalledWith('session', expect.anything())
    })
  })

  describe('CATALOG_GET_CLOSED', () => {
    it('returns empty when catalog is null', async () => {
      storeGet.mockImplementation((key: string) => {
        if (key === 'bugCatalog') return null
        if (key === 'catalogMetadata') return { lastClearedAt: '2024-06-01T00:00:00Z' }
        return null
      })

      const result = await handlers.get(IPC_CHANNELS.CATALOG_GET_CLOSED)?.()

      expect(result).toEqual({
        closedBugs: [],
        fetchedAt: null,
        lastClearedAt: '2024-06-01T00:00:00Z'
      })
    })

    it('returns only closed bugs from catalog', async () => {
      const catalog = {
        1: {
          id: 1,
          title: 'Open Bug',
          state: 'Active',
          assignee: null,
          areaPath: 'A',
          description: 'd',
          priority: 1,
          createdDate: '2024-01-01',
          updatedDate: '2024-01-01',
          tags: [],
          macroCategory: 'UI',
          subCategory: 'Layout',
          categoryReason: 'r',
          categorizedAt: '2024-06-01',
          firstSeenAt: '2024-05-01',
          lastSeenAt: '2024-06-01',
          closedAt: null,
          inputSignature: 'sig1',
          everInSimilarityGroup: false,
          lastSimilarityGroupAt: null
        },
        2: {
          id: 2,
          title: 'Closed Bug',
          state: 'Closed',
          assignee: null,
          areaPath: 'A',
          description: 'd',
          priority: 2,
          createdDate: '2024-01-01',
          updatedDate: '2024-01-01',
          tags: [],
          macroCategory: 'Performance',
          subCategory: 'Memory',
          categoryReason: 'r',
          categorizedAt: '2024-06-01',
          firstSeenAt: '2024-05-01',
          lastSeenAt: '2024-06-01',
          closedAt: '2024-07-01T00:00:00Z',
          inputSignature: 'sig2',
          everInSimilarityGroup: true,
          lastSimilarityGroupAt: '2024-06-15'
        }
      }

      storeGet.mockImplementation((key: string) => {
        if (key === 'bugCatalog') return catalog
        if (key === 'session') return { fetchedAt: '2024-07-01T00:00:00Z', bugs: [] }
        if (key === 'catalogMetadata') return { lastClearedAt: '2024-06-01T00:00:00Z' }
        return null
      })

      const result = (await handlers.get(IPC_CHANNELS.CATALOG_GET_CLOSED)?.()) as {
        closedBugs: { id: number }[]
        fetchedAt: string | null
        lastClearedAt: string | null
      }

      expect(result.closedBugs).toHaveLength(1)
      expect(result.closedBugs[0].id).toBe(2)
      expect(result.fetchedAt).toBe('2024-07-01T00:00:00Z')
      expect(result.lastClearedAt).toBe('2024-06-01T00:00:00Z')
    })

    it('returns null fetchedAt when session is null', async () => {
      const catalog = {
        1: {
          id: 1,
          title: 'Closed',
          state: 'Closed',
          assignee: null,
          areaPath: 'A',
          description: 'd',
          priority: 1,
          createdDate: '2024-01-01',
          updatedDate: '2024-01-01',
          tags: [],
          macroCategory: '',
          subCategory: '',
          categoryReason: '',
          categorizedAt: '',
          firstSeenAt: '2024-05-01',
          lastSeenAt: '2024-06-01',
          closedAt: '2024-07-01T00:00:00Z',
          inputSignature: 'sig',
          everInSimilarityGroup: false,
          lastSimilarityGroupAt: null
        }
      }

      storeGet.mockImplementation((key: string) => {
        if (key === 'bugCatalog') return catalog
        if (key === 'session') return null
        if (key === 'catalogMetadata') return { lastClearedAt: null }
        return null
      })

      const result = (await handlers.get(IPC_CHANNELS.CATALOG_GET_CLOSED)?.()) as {
        closedBugs: { id: number }[]
        fetchedAt: string | null
        lastClearedAt: string | null
      }

      expect(result.closedBugs).toHaveLength(1)
      expect(result.fetchedAt).toBeNull()
      expect(result.lastClearedAt).toBeNull()
    })
  })

  describe('AGENT_CHECK_BINARY', () => {
    it('returns installed with version when execFile succeeds', async () => {
      execFileMock.mockImplementation(
        (_cmd: string, _args: string[], _opts: unknown, cb: Function) => {
          cb(null, '1.2.3\n', '')
        }
      )

      const result = await handlers.get(IPC_CHANNELS.AGENT_CHECK_BINARY)?.()

      expect(result).toEqual({ installed: true, version: '1.2.3' })
    })

    it('returns not installed with error when execFile fails', async () => {
      execFileMock.mockImplementation(
        (_cmd: string, _args: string[], _opts: unknown, cb: Function) => {
          cb(new Error('command not found'), '', '')
        }
      )

      const result = await handlers.get(IPC_CHANNELS.AGENT_CHECK_BINARY)?.()

      expect(result).toEqual({ installed: false, error: 'command not found' })
    })
  })

  describe('AGENT_SELECT_DIRECTORY', () => {
    it('returns selected path when dialog is confirmed', async () => {
      getFocusedWindow.mockReturnValue({})
      showOpenDialog.mockResolvedValue({ filePaths: ['/home/user/project'] })

      const result = await handlers.get(IPC_CHANNELS.AGENT_SELECT_DIRECTORY)?.()

      expect(result).toBe('/home/user/project')
    })

    it('returns null when dialog is cancelled', async () => {
      getFocusedWindow.mockReturnValue({})
      showOpenDialog.mockResolvedValue({ filePaths: [] })

      const result = await handlers.get(IPC_CHANNELS.AGENT_SELECT_DIRECTORY)?.()

      expect(result).toBeNull()
    })
  })

  describe('PROJECTS_GET and PROJECTS_SET', () => {
    it('returns projects array from settings', async () => {
      const projects = [
        {
          id: 'p1',
          name: 'Backend',
          path: '/app/backend',
          type: 'backend',
          description: '',
          keywords: []
        }
      ]
      storeGet.mockReturnValueOnce({ ...baseSettings, projects })

      const result = await handlers.get(IPC_CHANNELS.PROJECTS_GET)?.()

      expect(result).toEqual(projects)
    })

    it('returns empty array when settings has no projects', async () => {
      storeGet.mockReturnValueOnce({ ...baseSettings, projects: undefined })

      const result = await handlers.get(IPC_CHANNELS.PROJECTS_GET)?.()

      expect(result).toEqual([])
    })

    it('updates settings.projects in store', async () => {
      const existingSettings = { ...baseSettings }
      storeGet.mockReturnValueOnce(existingSettings)
      const newProjects = [
        {
          id: 'p1',
          name: 'Frontend',
          path: '/app/frontend',
          type: 'frontend',
          description: 'UI',
          keywords: ['react']
        }
      ]

      await handlers.get(IPC_CHANNELS.PROJECTS_SET)?.({}, newProjects)

      expect(storeSet).toHaveBeenCalledWith(
        'settings',
        expect.objectContaining({ projects: newProjects })
      )
    })
  })

  describe('PROJECTS_VALIDATE_PATHS', () => {
    it('returns null for valid directory paths', async () => {
      existsSyncMock.mockReturnValue(true)
      statSyncMock.mockReturnValue({ isDirectory: () => true })

      const result = await handlers.get(IPC_CHANNELS.PROJECTS_VALIDATE_PATHS)?.({}, ['/valid/path'])

      expect(result).toEqual({ '/valid/path': null })
    })

    it('returns error for non-existent paths', async () => {
      existsSyncMock.mockReturnValue(false)

      const result = await handlers.get(IPC_CHANNELS.PROJECTS_VALIDATE_PATHS)?.({}, [
        '/missing/path'
      ])

      expect(result).toEqual({ '/missing/path': 'Path does not exist' })
    })

    it('returns error for paths that are not directories', async () => {
      existsSyncMock.mockReturnValue(true)
      statSyncMock.mockReturnValue({ isDirectory: () => false })

      const result = await handlers.get(IPC_CHANNELS.PROJECTS_VALIDATE_PATHS)?.({}, [
        '/some/file.txt'
      ])

      expect(result).toEqual({ '/some/file.txt': 'Path is not a directory' })
    })

    it('returns error for empty paths', async () => {
      const result = await handlers.get(IPC_CHANNELS.PROJECTS_VALIDATE_PATHS)?.({}, ['', '  '])

      expect(result).toEqual({ '': 'Path is required', '  ': 'Path is required' })
    })
  })

  describe('AGENT_START', () => {
    const agentSettings: AppSettings = {
      ...baseSettings,
      llmProvider: 'openrouter',
      agentProvider: 'claude-sdk',
      agentApiKey: 'agent-key-test',
      projects: [
        {
          id: 'proj-1',
          name: 'TestProject',
          path: '/test/path',
          type: 'backend',
          description: '',
          keywords: []
        }
      ]
    }

    const sessionBugs = [
      {
        id: 42,
        title: 'Test Bug',
        description: 'desc',
        state: 'Active',
        macroCategory: '',
        subCategory: '',
        categoryReason: '',
        categorizedAt: ''
      }
    ]

    it('starts an agent session and returns sessionId with agentProvider', async () => {
      storeGet.mockImplementation((key: string) => {
        if (key === 'settings') return agentSettings
        if (key === 'session') return { bugs: sessionBugs }
        return null
      })
      sessionManagerStartMock.mockReturnValue('new-session-id')

      const handler = handlers.get(IPC_CHANNELS.AGENT_START)
      const result = await handler!(
        { sender: { send: vi.fn() } },
        {
          bugId: 42,
          mode: 'analyze',
          primaryProjectId: 'proj-1'
        }
      )

      expect(result).toEqual({ sessionId: 'new-session-id', agentProvider: 'claude-sdk' })
      expect(sessionManagerStartMock).toHaveBeenCalled()
    })

    it('throws when bug is not found in session', async () => {
      storeGet.mockImplementation((key: string) => {
        if (key === 'settings') return agentSettings
        if (key === 'session') return { bugs: [] }
        return null
      })

      const handler = handlers.get(IPC_CHANNELS.AGENT_START)
      await expect(
        handler!(
          { sender: { send: vi.fn() } },
          {
            bugId: 999,
            mode: 'analyze',
            primaryProjectId: 'proj-1'
          }
        )
      ).rejects.toMatchObject({ code: 'STORE_ERROR' })
    })

    it('throws when agent API key is missing', async () => {
      storeGet.mockImplementation((key: string) => {
        if (key === 'settings')
          return {
            ...agentSettings,
            agentApiKey: '',
            apiKey: '',
            agentProvider: 'codex-sdk',
            llmProvider: 'openrouter'
          }
        if (key === 'session') return { bugs: sessionBugs }
        return null
      })

      const handler = handlers.get(IPC_CHANNELS.AGENT_START)
      await expect(
        handler!(
          { sender: { send: vi.fn() } },
          {
            bugId: 42,
            mode: 'analyze',
            primaryProjectId: 'proj-1'
          }
        )
      ).rejects.toMatchObject({ code: 'AGENT_NOT_CONFIGURED' })
    })
  })

  describe('AGENT_ABORT', () => {
    it('aborts a running session', async () => {
      sessionManagerAbortMock.mockReturnValue(true)

      const handler = handlers.get(IPC_CHANNELS.AGENT_ABORT)
      const result = await handler!({}, { sessionId: 'some-session-id' })

      expect(result).toEqual({ aborted: true })
      expect(sessionManagerAbortMock).toHaveBeenCalledWith('some-session-id')
    })

    it('throws when session is not found', async () => {
      sessionManagerAbortMock.mockReturnValue(false)

      const handler = handlers.get(IPC_CHANNELS.AGENT_ABORT)
      await expect(handler!({}, { sessionId: 'nonexistent' })).rejects.toMatchObject({
        code: 'AGENT_SESSION_NOT_FOUND'
      })
    })
  })
})
