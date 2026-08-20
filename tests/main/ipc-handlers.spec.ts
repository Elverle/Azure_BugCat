import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSettings, CategorizedBug, SessionData } from '../../src/shared/types'
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'
import { UNCATEGORIZED } from '../../src/shared/categorization'
import { SECRET_PLACEHOLDER } from '../../src/shared/secrets'
import { encryptSecret, decryptSecret } from '../../src/main/secret-storage'

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
  safeStorage
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
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((plain: string) => Buffer.from(`cipher:${plain}`)),
    decryptString: vi.fn((buf: Buffer) => buf.toString().replace(/^cipher:/, ''))
  }
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: ipcMainHandle
  },
  safeStorage
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
  orgUrl: 'https://dev.azure.com/contoso',
  projectName: 'BugCat',
  queryId: '123e4567-e89b-12d3-a456-426614174000',
  topN: 20,
  chunkSize: 15,
  llmProvider: 'openai',
  apiKey: 'sk-test',
  pat: 'pat-token',
  categories: []
}

const fetchEvent = (): { sender: { id: number; send: ReturnType<typeof vi.fn> } } => ({
  sender: { id: 1, send: vi.fn() }
})

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

  describe('SETTINGS_SET — main-process validation (review 2.4)', () => {
    it('rejects malformed settings payloads instead of persisting them', async () => {
      await expect(
        handlers.get(IPC_CHANNELS.SETTINGS_SET)?.({}, { ...baseSettings, orgUrl: 123 })
      ).rejects.toThrow(/^STORE_ERROR::/)
      expect(storeSet).not.toHaveBeenCalled()
    })

    it('rejects a non-object payload instead of persisting it', async () => {
      await expect(handlers.get(IPC_CHANNELS.SETTINGS_SET)?.({}, null)).rejects.toThrow(
        /^STORE_ERROR::/
      )
      expect(storeSet).not.toHaveBeenCalled()
    })

    // review B5: an emptied Top N/Chunk Size field now sends NaN rather than 0.
    // typeof NaN === 'number', so a bare primitive-type check would let it through —
    // only validateIntRange (via validateSettings/isSettingsValid) actually rejects it.
    it('rejects NaN numeric fields instead of persisting them', async () => {
      await expect(
        handlers.get(IPC_CHANNELS.SETTINGS_SET)?.({}, { ...baseSettings, topN: Number.NaN })
      ).rejects.toThrow(/^STORE_ERROR::/)
      expect(storeSet).not.toHaveBeenCalled()
    })

    it('persists valid settings, encrypting the secrets before they touch disk', async () => {
      await handlers.get(IPC_CHANNELS.SETTINGS_SET)?.({}, baseSettings)
      const saved = storeSet.mock.calls.find(([key]) => key === 'settings')![1] as AppSettings
      expect(saved.pat).not.toBe(baseSettings.pat)
      expect(decryptSecret(saved.pat)).toBe(baseSettings.pat)
      expect(decryptSecret(saved.apiKey)).toBe(baseSettings.apiKey)
      expect(saved).toEqual({ ...baseSettings, pat: saved.pat, apiKey: saved.apiKey })
    })
  })

  it('fetches ADO attachments through the main process using persisted settings', async () => {
    storeGet.mockReturnValueOnce(baseSettings)
    fetchAdoAttachmentDataUrl.mockResolvedValue('data:image/png;base64,AAA=')

    const result = await handlers.get(IPC_CHANNELS.ADO_FETCH_ATTACHMENT_DATA_URL)?.(
      {},
      'https://dev.azure.com/contoso/00000000-0000-0000-0000-000000000000/_apis/wit/attachments/image-id?fileName=image.png'
    )

    expect(fetchAdoAttachmentDataUrl).toHaveBeenCalledWith(
      baseSettings,
      'https://dev.azure.com/contoso/00000000-0000-0000-0000-000000000000/_apis/wit/attachments/image-id?fileName=image.png'
    )
    expect(result).toBe('data:image/png;base64,AAA=')
  })

  it('uses the override settings for the ADO test connection flow', async () => {
    testAdoConnection.mockResolvedValue({ success: true, message: 'ok' })

    const result = await handlers.get(IPC_CHANNELS.ADO_TEST_CONNECTION)?.({}, baseSettings)

    // baseSettings.pat is a real value, not the placeholder, so resolveSecrets
    // passes it through unchanged — the placeholder-resolution tests below cover
    // the case where the stored secret is what actually reaches testAdoConnection.
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

    await expect(handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.(fetchEvent())).rejects.toThrow(
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

    const result = await handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.(fetchEvent())
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
            technicalLayer: '',
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
        technicalLayer: '',
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
          technicalLayer: 'Layout',
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

      await handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.(fetchEvent())

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
          technicalLayer: 'Layout',
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

      const result = await handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.(fetchEvent())

      expect(result).toEqual([
        expect.objectContaining({
          id: 1,
          macroCategory: 'UI',
          technicalLayer: 'Layout',
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
          technicalLayer: 'Layout',
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

      const result = await handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.(fetchEvent())

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
          technicalLayer: 'Layout',
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

      await handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.(fetchEvent())

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
          technicalLayer: 'Layout',
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

      await handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)?.(fetchEvent())

      const catalogCall = storeSet.mock.calls.find((c: unknown[]) => c[0] === 'bugCatalog')
      expect(catalogCall![1][1].closedAt).toBeNull()

      const metadataCall = storeSet.mock.calls.find((c: unknown[]) => c[0] === 'catalogMetadata')
      expect(metadataCall![1]).toEqual(
        expect.objectContaining({ queryId: baseSettings.queryId })
      )
    })
  })

  describe('ADO_FETCH_BUGS — concurrency guard', () => {
    it('rejects a second concurrent bug fetch on the same webContents', async () => {
      storeGet.mockImplementation((key: string) => {
        if (key === 'settings') return baseSettings
        if (key === 'bugCatalog') return null
        return null
      })

      fetchBugsFromQuery.mockImplementation(
        () =>
          new Promise(() => {
            // Stays pending so the second invocation hits the in-flight guard.
          })
      )

      const fetchHandler = handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)
      const event = { sender: { id: 55, send: vi.fn() } }

      void fetchHandler?.(event)

      await expect(fetchHandler?.(event)).rejects.toThrow(/already in progress/i)
    })

    // FIX 8: the `finally` block only ever had its *rejection* of a second
    // concurrent call (while the first is still pending) covered — never that a
    // FAILED (not just a successful) run actually releases its in-flight token
    // afterwards, so a later, non-concurrent call is accepted rather than
    // rejected as "already in progress".
    it('releases the in-flight token after a rejecting fetch, so a later call on the same webContents is accepted', async () => {
      storeGet.mockImplementation((key: string) => {
        if (key === 'settings') return baseSettings
        if (key === 'bugCatalog') return null
        return null
      })

      fetchBugsFromQuery.mockRejectedValueOnce({
        code: 'ADO_TIMEOUT',
        message: 'Network error: socket hang up'
      })

      const fetchHandler = handlers.get(IPC_CHANNELS.ADO_FETCH_BUGS)
      const event = { sender: { id: 66, send: vi.fn() } }

      await expect(fetchHandler?.(event)).rejects.toThrow('ADO_TIMEOUT::Network error')

      fetchBugsFromQuery.mockResolvedValueOnce({ bugs: [], allQueryIds: [] })

      await expect(fetchHandler?.(event)).resolves.toEqual([])
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
      technicalLayer: categorizedAt ? 'Layout' : '',
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
          technicalLayer: 'Memory',
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
      technicalLayer: '',
      categoryReason: '',
      categorizedAt: ''
    })

    const categorized = (id: number, macroCategory: string): unknown => ({
      ...(uncategorized(id) as Record<string, unknown>),
      macroCategory,
      technicalLayer: 'Layout',
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
      technicalLayer: '',
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
          technicalLayer: 'Layout',
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
            technicalLayer: 'Layout',
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
      technicalLayer: 'Layout',
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
          technicalLayer: 'Layout',
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
          technicalLayer: 'Memory',
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
          technicalLayer: '',
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

  describe('settings secrets at the IPC boundary', () => {
    // registerIPCHandlers wraps every handler in handle(), which is always an
    // async function (see encodeIpcError above) — even a synchronous handler
    // body like SETTINGS_GET's returns a Promise here, so every call must be
    // awaited or its return value is the Promise object, not the settings.
    const invoke = (channel: string, ...args: unknown[]): Promise<unknown> =>
      Promise.resolve(handlers.get(channel)!(fetchEvent(), ...args))

    const savedSettings = (): AppSettings =>
      storeSet.mock.calls.find(([key]) => key === 'settings')![1] as AppSettings

    it('never sends a stored secret to the renderer', async () => {
      storeGet.mockReturnValue({
        ...baseSettings,
        pat: encryptSecret('pat-abc'),
        apiKey: encryptSecret('sk-abc')
      })
      const received = (await invoke(IPC_CHANNELS.SETTINGS_GET)) as AppSettings
      expect(received.pat).toBe(SECRET_PLACEHOLDER)
      expect(received.apiKey).toBe(SECRET_PLACEHOLDER)
      expect(JSON.stringify(received)).not.toContain('pat-abc')
      expect(JSON.stringify(received)).not.toContain('sk-abc')
    })

    it('reports an unconfigured secret as empty, not as stored', async () => {
      storeGet.mockReturnValue({ ...baseSettings, pat: '', apiKey: '' })
      const received = (await invoke(IPC_CHANNELS.SETTINGS_GET)) as AppSettings
      expect(received.pat).toBe('')
      expect(received.apiKey).toBe('')
    })

    it('keeps the stored secret when the renderer sends the placeholder back', async () => {
      storeGet.mockReturnValue({ ...baseSettings, pat: encryptSecret('pat-abc') })
      await invoke(IPC_CHANNELS.SETTINGS_SET, { ...baseSettings, pat: SECRET_PLACEHOLDER, topN: 42 })
      expect(decryptSecret(savedSettings().pat)).toBe('pat-abc')
      expect(savedSettings().topN).toBe(42)
    })

    it('encrypts a secret the user actually typed', async () => {
      storeGet.mockReturnValue({ ...baseSettings, pat: '' })
      await invoke(IPC_CHANNELS.SETTINGS_SET, { ...baseSettings, pat: 'pat-new' })
      expect(savedSettings().pat).not.toBe('pat-new')
      expect(decryptSecret(savedSettings().pat)).toBe('pat-new')
    })

    // Clearing a secret is a renderer-side act (Task 6): a stored secret shows
    // as the placeholder, which the user cannot meaningfully edit, so
    // "replace" empties the *input* to let them type a new value — it does not
    // send an empty string to SETTINGS_SET. An empty PAT is never a value this
    // handler is meant to persist, placeholder or not: an Azure DevOps
    // connection without one cannot work. This pins that contract so it isn't
    // mistaken for an arbitrary restriction and "fixed" later.
    it('refuses to persist an empty PAT', async () => {
      storeGet.mockReturnValue({ ...baseSettings, pat: encryptSecret('pat-abc') })
      await expect(
        invoke(IPC_CHANNELS.SETTINGS_SET, { ...baseSettings, pat: '' })
      ).rejects.toThrow(/^STORE_ERROR::.*Personal Access Token/)
      expect(storeSet).not.toHaveBeenCalled()
    })

    it('resolves the placeholder before testing the ADO connection', async () => {
      // The override is the unsaved form: it carries the placeholder, not the
      // PAT. Testing with the literal '__stored__' would report a 401 the user
      // cannot act on.
      storeGet.mockReturnValue({ ...baseSettings, pat: encryptSecret('pat-abc') })
      testAdoConnection.mockResolvedValue({ success: true, message: 'ok' })
      await invoke(IPC_CHANNELS.ADO_TEST_CONNECTION, {
        ...baseSettings,
        pat: SECRET_PLACEHOLDER
      })
      expect(testAdoConnection).toHaveBeenCalledWith(expect.objectContaining({ pat: 'pat-abc' }))
    })

    it('resolves the placeholder before testing the LLM connection', async () => {
      storeGet.mockReturnValue({ ...baseSettings, apiKey: encryptSecret('sk-abc') })
      testLLMConnection.mockResolvedValue(undefined)
      await invoke(IPC_CHANNELS.LLM_TEST_CONNECTION, {
        ...baseSettings,
        apiKey: SECRET_PLACEHOLDER
      })
      expect(testLLMConnection).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'sk-abc' }))
    })

    it('hands the decrypted PAT to the fetch, not the ciphertext', async () => {
      storeGet.mockImplementation((key: string) =>
        key === 'settings' ? { ...baseSettings, pat: encryptSecret('pat-abc') } : null
      )
      fetchBugsFromQuery.mockResolvedValue({ bugs: [], allQueryIds: [] })
      await invoke(IPC_CHANNELS.ADO_FETCH_BUGS)
      expect(fetchBugsFromQuery).toHaveBeenCalledWith(expect.objectContaining({ pat: 'pat-abc' }))
    })
  })
})
