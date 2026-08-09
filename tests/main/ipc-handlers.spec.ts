import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSettings, CategorizedBug, SessionData } from '../../src/shared/types'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import { UNCATEGORIZED } from '../../src/shared/categorization'

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
  findSimilarBugs
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
  findSimilarBugs: vi.fn()
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

vi.mock('@main/ado/ado-client', () => ({
  fetchAdoAttachmentDataUrl
}))

vi.mock('@main/llm', () => ({
  categorizeBugs,
  testLLMConnection,
  findSimilarBugs
}))

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
  categories: []
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

    expect(resultWithoutKey).toEqual({ success: false, message: 'API key is missing' })
  })

  it('reads persisted settings for bug fetching and throws if they are missing', async () => {
    storeGet.mockReturnValueOnce(null)

    await expect(handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.()).rejects.toThrow(
      'STORE_ERROR::Settings not configured'
    )

    storeGet.mockImplementation((key: string) => {
      if (key === 'settings') return baseSettings
      if (key === 'bugCatalog') return null
      return null
    })
    fetchBugsFromQuery.mockResolvedValue({
      bugs: [
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
      ],
      allQueryIds: [1]
    })

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
              reject({ code: 'OPERATION_CANCELLED', message: 'Operation cancelled' })
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
    await expect(categorizePromise).rejects.toThrow('OPERATION_CANCELLED::Operation cancelled')
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

    await expect(categorizeHandler?.(event)).rejects.toThrow(
      'UNKNOWN_ERROR::Categorization already in progress'
    )
    // The rejected invocation never started a run (run 1 is still pending on
    // the same webContents), so it must not announce completion — a renderer
    // listening for run 1's DONE event would otherwise unsubscribe on this
    // false signal and never hear about run 1's real completion (review M5
    // fix round 1).
    expect(event.sender.send).not.toHaveBeenCalledWith(IPC_CHANNELS.LLM_CATEGORIZE_DONE)
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
      fetchBugsFromQuery.mockResolvedValue({ bugs: [makeBug(1), makeBug(2)], allQueryIds: [1, 2] })

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
        if (key === 'catalogMetadata')
          return { lastClearedAt: null, queryId: baseSettings.queryId }
        return null
      })
      fetchBugsFromQuery.mockResolvedValue({ bugs: [bug1], allQueryIds: [1] })

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
        if (key === 'catalogMetadata')
          return { lastClearedAt: null, queryId: baseSettings.queryId }
        return null
      })
      fetchBugsFromQuery.mockResolvedValue({ bugs: [], allQueryIds: [] }) // Bug 1 not in this fetch, and not beyond topN either

      const result = await handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.()

      expect(result).toEqual([]) // No session bugs
      const catalogCall = storeSet.mock.calls.find((c: unknown[]) => c[0] === 'bugCatalog')
      expect(catalogCall![1][1].closedAt).toEqual(expect.any(String))
    })

    it('does not close a pre-existing catalog on the first fetch after upgrade, when catalogMetadata has no stored queryId', async () => {
      // Simulates a catalog persisted before this feature shipped: bugCatalog has
      // data, but catalogMetadata carries no queryId at all (undefined, not merely
      // a different value). A missing queryId must be treated as a mismatch — the
      // same safe default as an actual query change — rather than as an implicit
      // match that would silently close the whole existing catalog.
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
        if (key === 'catalogMetadata') return { lastClearedAt: null } // no queryId field
        return null
      })
      fetchBugsFromQuery.mockResolvedValue({ bugs: [], allQueryIds: [] }) // Bug 1 absent from this fetch too

      await handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.()

      const catalogCall = storeSet.mock.calls.find((c: unknown[]) => c[0] === 'bugCatalog')
      expect(catalogCall![1][1].closedAt).toBeNull()

      const metadataCall = storeSet.mock.calls.find((c: unknown[]) => c[0] === 'catalogMetadata')
      expect(metadataCall![1]).toEqual(
        expect.objectContaining({ queryId: baseSettings.queryId })
      )
    })

    it('does not close anything when catalogMetadata.queryId differs from settings.queryId, but updates the stored queryId', async () => {
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
        if (key === 'catalogMetadata') return { lastClearedAt: null, queryId: 'a-different-query' }
        return null
      })
      // The full WIQL result set for the new query does not include bug 1 at all —
      // under a naive implementation this would close it, but the query changed,
      // so this fetch must not derive any closures from it.
      fetchBugsFromQuery.mockResolvedValue({ bugs: [], allQueryIds: [999] })

      await handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.()

      const catalogCall = storeSet.mock.calls.find((c: unknown[]) => c[0] === 'bugCatalog')
      expect(catalogCall![1][1].closedAt).toBeNull()

      const metadataCall = storeSet.mock.calls.find((c: unknown[]) => c[0] === 'catalogMetadata')
      expect(metadataCall![1]).toEqual(
        expect.objectContaining({ queryId: baseSettings.queryId })
      )
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
      // No run was ever registered for this invocation, so it must not send
      // DONE — the caller's own promise resolving is already the complete
      // signal here (review M5 fix round 1).
      expect(event.sender.send).not.toHaveBeenCalledWith(IPC_CHANNELS.LLM_CATEGORIZE_DONE)
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

  describe('LLM_CATEGORIZE — incremental persistence per chunk (review 2.1)', () => {
    const NOW = '2026-06-01T00:00:00.000Z'

    const uncategorized = (id: number): unknown => ({
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
      macroCategory: '',
      subCategory: '',
      categoryReason: '',
      categorizedAt: ''
    })

    const categorized = (id: number, macroCategory: string): unknown => ({
      ...(uncategorized(id) as Record<string, unknown>),
      macroCategory,
      subCategory: 'Layout',
      categoryReason: 'Looks like a UI bug',
      categorizedAt: '2026-06-01T00:00:01.000Z'
    })

    const catalogEntry = (id: number): unknown => ({
      ...(uncategorized(id) as Record<string, unknown>),
      firstSeenAt: '2024-05-01T00:00:00Z',
      lastSeenAt: '2024-05-01T00:00:00Z',
      closedAt: null,
      inputSignature: `sig-${id}`,
      everInSimilarityGroup: false,
      lastSimilarityGroupAt: null
    })

    const fakeEvent = (): { sender: { id: number; send: ReturnType<typeof vi.fn> } } => ({
      sender: { id: 1, send: vi.fn() }
    })

    it('persists completed chunks even when a later chunk fails with a blocking error', async () => {
      const fakeStore: Record<string, unknown> = {
        settings: baseSettings,
        session: { bugs: [uncategorized(1), uncategorized(2)], fetchedAt: NOW },
        bugCatalog: { 1: catalogEntry(1), 2: catalogEntry(2) }
      }
      storeGet.mockImplementation((key: string) => fakeStore[key])
      storeSet.mockImplementation((key: string, value: unknown) => {
        fakeStore[key] = value
      })

      categorizeBugs.mockImplementation(
        async (
          _s: unknown,
          _bugs: unknown,
          onProgress: (progress: {
            total: number
            completed: number
            currentChunk: unknown[]
          }) => void
        ) => {
          onProgress({ total: 2, completed: 1, currentChunk: [categorized(1, 'UI')] })
          throw { code: 'LLM_TIMEOUT', message: 'Request to OpenAI timed out' }
        }
      )

      await expect(handlers.get(IPC_CHANNELS.LLM_CATEGORIZE)?.(fakeEvent())).rejects.toThrow(
        /LLM_TIMEOUT/
      )

      const session = fakeStore.session as {
        bugs: Array<{ id: number; macroCategory: string; categorizedAt: string }>
      }
      expect(session.bugs.find((b) => b.id === 1)?.macroCategory).toBe('UI')
      expect(session.bugs.find((b) => b.id === 1)?.categorizedAt).not.toBe('')
      expect(session.bugs.find((b) => b.id === 2)?.categorizedAt).toBe('')
    })

    it('persists a chunk containing a failed categorization sentinel and keeps that bug retry-eligible', async () => {
      // A sentinel-carrying chunk is the normal shape of a non-blocking chunk
      // failure in production (llm-service.ts marks the chunk UNCATEGORIZED and
      // still calls onProgress with it), not an exotic edge case — persistChunk
      // must not treat it like a real categorization.
      const fakeStore: Record<string, unknown> = {
        settings: baseSettings,
        session: { bugs: [uncategorized(1), uncategorized(2)], fetchedAt: NOW },
        bugCatalog: { 1: catalogEntry(1), 2: catalogEntry(2) }
      }
      storeGet.mockImplementation((key: string) => fakeStore[key])
      storeSet.mockImplementation((key: string, value: unknown) => {
        fakeStore[key] = value
      })

      categorizeBugs.mockImplementation(
        async (
          _s: unknown,
          _bugs: unknown,
          onProgress: (progress: {
            total: number
            completed: number
            currentChunk: unknown[]
          }) => void
        ) => {
          onProgress({
            total: 2,
            completed: 1,
            currentChunk: [categorized(1, UNCATEGORIZED)]
          })
          throw { code: 'LLM_TIMEOUT', message: 'Request to OpenAI timed out' }
        }
      )

      await expect(handlers.get(IPC_CHANNELS.LLM_CATEGORIZE)?.(fakeEvent())).rejects.toThrow(
        /LLM_TIMEOUT/
      )

      const session = fakeStore.session as {
        bugs: Array<{ id: number; macroCategory: string; categorizedAt: string }>
      }
      const bug1 = session.bugs.find((b) => b.id === 1)
      expect(bug1?.macroCategory).toBe(UNCATEGORIZED)
      expect(bug1?.categorizedAt).toBe('')

      const catalog = fakeStore.bugCatalog as Record<
        number,
        { macroCategory: string; categorizedAt: string }
      >
      expect(catalog[1].macroCategory).toBe(UNCATEGORIZED)
      expect(catalog[1].categorizedAt).toBe('')
    })
  })

  describe('LLM_CATEGORIZE — done event, post-reload resync (review M5)', () => {
    const NOW = '2026-06-01T00:00:00.000Z'

    const uncategorizedBug = (id: number): unknown => ({
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
      macroCategory: '',
      subCategory: '',
      categoryReason: '',
      categorizedAt: ''
    })

    it('sends LLM_CATEGORIZE_DONE once the run settles, so a reloaded renderer can resync', async () => {
      storeGet.mockImplementation((key: string) => {
        if (key === 'settings') return baseSettings
        if (key === 'session') return { bugs: [uncategorizedBug(1)], fetchedAt: NOW }
        return null
      })
      categorizeBugs.mockResolvedValue([
        {
          ...(uncategorizedBug(1) as Record<string, unknown>),
          macroCategory: 'UI',
          subCategory: 'Layout',
          categoryReason: 'reason',
          categorizedAt: NOW
        }
      ])

      const send = vi.fn()
      const event = { sender: { id: 10, send } }

      await handlers.get(IPC_CHANNELS.LLM_CATEGORIZE)?.(event)

      expect(send).toHaveBeenCalledWith(IPC_CHANNELS.LLM_CATEGORIZE_DONE)
    })

    it('does not let a send failure on a destroyed webContents replace the real outcome (review addendum §2)', async () => {
      storeGet.mockImplementation((key: string) => {
        if (key === 'settings') return baseSettings
        if (key === 'session') return { bugs: [uncategorizedBug(1)], fetchedAt: NOW }
        return null
      })
      categorizeBugs.mockRejectedValue({
        code: 'LLM_TIMEOUT',
        message: 'Request to OpenAI timed out'
      })

      // Simulates the window having closed mid-run: send() throws synchronously,
      // as Electron does for a destroyed webContents.
      const send = vi.fn(() => {
        throw new Error('Object has been destroyed')
      })
      const event = { sender: { id: 11, send } }

      // Without the guard, the throw from send() inside the finally block would
      // replace this rejection with an unrelated UNKNOWN_ERROR.
      await expect(handlers.get(IPC_CHANNELS.LLM_CATEGORIZE)?.(event)).rejects.toThrow(
        'LLM_TIMEOUT::Request to OpenAI timed out'
      )
      expect(send).toHaveBeenCalledWith(IPC_CHANNELS.LLM_CATEGORIZE_DONE)
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

  describe('LLM_FIND_SIMILAR — safe write, guard, cancel/status/done (review 2.2)', () => {
    const NOW = '2026-06-01T00:00:00.000Z'

    const categorized = (id: number, macroCategory: string): CategorizedBug => ({
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
      macroCategory,
      subCategory: 'Layout',
      categoryReason: 'Looks like a UI bug',
      categorizedAt: '2026-06-01T00:00:01.000Z'
    })

    const fakeEvent = (): { sender: { id: number; send: ReturnType<typeof vi.fn> } } => ({
      sender: { id: 1, send: vi.fn() }
    })

    it('does not clobber a session refreshed during a similarity run (lost update)', async () => {
      const staleBugs = [categorized(1, 'A')]
      const freshBugs = [categorized(1, 'A'), categorized(2, 'B')]
      const fakeStore: Record<string, unknown> = {
        settings: baseSettings,
        session: { bugs: staleBugs, fetchedAt: NOW, categorizedAt: NOW }
      }
      storeGet.mockImplementation((key: string) => fakeStore[key])
      storeSet.mockImplementation((key: string, value: unknown) => {
        fakeStore[key] = value
      })

      findSimilarBugs.mockImplementation(async () => {
        // Simulates a bug fetch completing in the background while the analysis runs.
        fakeStore.session = { bugs: freshBugs, fetchedAt: 'LATER', categorizedAt: NOW }
        return { categories: [], analyzedAt: 'LATER' }
      })

      await handlers.get(IPC_CHANNELS.LLM_FIND_SIMILAR)?.(fakeEvent())

      const session = fakeStore.session as SessionData
      expect(session.bugs).toHaveLength(2) // the fetch was NOT reverted
      expect(session.similarityResults?.analyzedAt).toBe('LATER')
    })

    it('rejects a second concurrent similarity run', async () => {
      storeGet.mockImplementation((key: string) => {
        if (key === 'settings') return baseSettings
        if (key === 'session') {
          return { bugs: [categorized(1, 'A'), categorized(2, 'A')], fetchedAt: NOW, categorizedAt: NOW }
        }
        return null
      })

      findSimilarBugs.mockImplementation(
        () =>
          new Promise(() => {
            // Stays pending so the second invocation hits the in-flight guard.
          })
      )

      const event = fakeEvent()
      void handlers.get(IPC_CHANNELS.LLM_FIND_SIMILAR)?.(event)

      await expect(handlers.get(IPC_CHANNELS.LLM_FIND_SIMILAR)?.(event)).rejects.toThrow(
        /already in progress/i
      )
    })

    it('exposes similarity status and cancels an active run', async () => {
      storeGet.mockImplementation((key: string) => {
        if (key === 'settings') return baseSettings
        if (key === 'session') {
          return { bugs: [categorized(1, 'A'), categorized(2, 'A')], fetchedAt: NOW, categorizedAt: NOW }
        }
        return null
      })

      let capturedSignal: AbortSignal | undefined
      findSimilarBugs.mockImplementation(
        (_settings, _bugs, _onProgress, signal?: AbortSignal) =>
          new Promise((_, reject) => {
            capturedSignal = signal
            signal?.addEventListener(
              'abort',
              () => reject({ code: 'OPERATION_CANCELLED', message: 'Operation cancelled' }),
              { once: true }
            )
          })
      )

      const event = fakeEvent()
      const statusHandler = handlers.get(IPC_CHANNELS.LLM_FIND_SIMILAR_STATUS)
      const cancelHandler = handlers.get(IPC_CHANNELS.LLM_FIND_SIMILAR_CANCEL)

      const runPromise = handlers.get(IPC_CHANNELS.LLM_FIND_SIMILAR)?.(event)

      await expect(statusHandler?.(event)).resolves.toEqual({ active: true })

      await expect(cancelHandler?.(event)).resolves.toEqual({ cancelled: true })
      expect(capturedSignal?.aborted).toBe(true)

      await expect(runPromise).rejects.toThrow('OPERATION_CANCELLED')
      await expect(statusHandler?.(event)).resolves.toEqual({ active: false })
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
})
