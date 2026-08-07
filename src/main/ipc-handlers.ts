import { ipcMain, IpcMainInvokeEvent, shell } from 'electron'
import { IPC_CHANNELS, IPCChannel } from '../shared/ipc-channels'
import { store } from './store'
import {
  AppSettings,
  BugCatalog,
  BugItem,
  CatalogMetadata,
  ClosedCatalogSnapshot,
  SessionData,
  TestConnectionResult
} from '../shared/types'
import { encodeIpcError, throwAppError } from '@shared/app-error'
import { fetchBugsFromQuery, testAdoConnection } from './ado/ado-service'
import { fetchAdoAttachmentDataUrl } from './ado/ado-client'
import { categorizeBugs, testLLMConnection, findSimilarBugs } from './llm'
import {
  mergeFetchIntoCatalog,
  mergeCategorization,
  updateCatalogSimilarityMetadata
} from './utils/catalog-merge'
import { isFailedCategorization } from '../shared/categorization'

/**
 * Registers an IPC handler whose rejections always reach the renderer in the
 * wire format understood by the preload (`CODE::message`). Every channel goes
 * through here: registering one directly on `ipcMain` would silently drop its
 * error code on the way out.
 */
function handle<Args extends unknown[]>(
  channel: IPCChannel,
  handler: (event: IpcMainInvokeEvent, ...args: Args) => unknown
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...(args as Args))
    } catch (error: unknown) {
      throw encodeIpcError(error)
    }
  })
}

export function registerIPCHandlers(): void {
  const categorizeControllers = new Map<number, AbortController>()

  // Ping
  handle(IPC_CHANNELS.PING, () => 'pong')

  // Settings
  handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return store.get('settings')
  })
  handle(IPC_CHANNELS.SETTINGS_SET, (_event, settings: unknown) => {
    store.set('settings', settings)
  })

  // Session
  handle(IPC_CHANNELS.SESSION_GET, () => {
    return store.get('session')
  })
  handle(IPC_CHANNELS.SESSION_CLEAR, () => {
    store.set('session', null)
  })

  // Catalog
  handle(IPC_CHANNELS.CATALOG_CLEAR, () => {
    store.set('bugCatalog', null)
    const catalogMetadata = store.get('catalogMetadata') as CatalogMetadata | null
    store.set('catalogMetadata', {
      lastClearedAt: new Date().toISOString(),
      queryId: catalogMetadata?.queryId ?? null
    })
  })

  handle(IPC_CHANNELS.CATALOG_GET_CLOSED, () => {
    const catalog = store.get('bugCatalog') as BugCatalog | null
    const catalogMetadata = store.get('catalogMetadata') as CatalogMetadata | null
    const snapshot: ClosedCatalogSnapshot = {
      closedBugs: [],
      fetchedAt: null,
      lastClearedAt: catalogMetadata?.lastClearedAt ?? null
    }

    if (!catalog) return snapshot

    const session = store.get('session') as SessionData | null
    const closedBugs = Object.values(catalog).filter((b) => b.closedAt !== null)
    return {
      closedBugs,
      fetchedAt: session?.fetchedAt ?? null,
      lastClearedAt: snapshot.lastClearedAt
    }
  })

  // Azure DevOps
  handle(IPC_CHANNELS.ADO_FETCH_BUGS, async () => {
    const settings = store.get('settings') as AppSettings | null
    if (!settings) throwAppError('STORE_ERROR', 'Settings not configured')

    const { bugs: fetchedBugs, allQueryIds } = await fetchBugsFromQuery(settings)
    const now = new Date().toISOString()
    const catalog = store.get('bugCatalog') as BugCatalog | null
    const catalogMetadata =
      (store.get('catalogMetadata') as CatalogMetadata | null) ?? { lastClearedAt: null }
    // A missing stored queryId (first-ever fetch, or a catalog persisted before this
    // field existed) is treated as a mismatch: the safe default is to skip closure
    // detection for this one fetch rather than risk closing a catalog whose scope
    // was never actually verified against the current query.
    const sameQuery = catalogMetadata.queryId === settings.queryId
    const { updatedCatalog, sessionBugs, newBugCount } = mergeFetchIntoCatalog(
      fetchedBugs,
      catalog,
      now,
      sameQuery ? new Set(allQueryIds) : null
    )

    store.set('bugCatalog', updatedCatalog)
    store.set('catalogMetadata', { ...catalogMetadata, queryId: settings.queryId })

    const updatedSession: SessionData = {
      bugs: sessionBugs,
      fetchedAt: now,
      lastFetchNewCount: newBugCount
    }
    store.set('session', updatedSession)

    return updatedSession.bugs
  })
  handle(IPC_CHANNELS.ADO_TEST_CONNECTION, async (_event, settingsOverride?: AppSettings) => {
    const settings = settingsOverride ?? (store.get('settings') as AppSettings | null) ?? null
    if (!settings) return { success: false, message: 'Settings not configured' }
    return testAdoConnection(settings)
  })
  handle(IPC_CHANNELS.ADO_FETCH_ATTACHMENT_DATA_URL, async (_event, url: unknown) => {
    if (typeof url !== 'string' || !url.trim()) {
      throwAppError('ADO_NOT_FOUND', 'Missing attachment URL')
    }

    const settings = store.get('settings') as AppSettings | null
    if (!settings) throwAppError('STORE_ERROR', 'Settings not configured')

    return fetchAdoAttachmentDataUrl(settings, url)
  })

  // LLM
  handle(IPC_CHANNELS.LLM_CATEGORIZE, async (event: IpcMainInvokeEvent) => {
    const webContentsId = event.sender.id
    let abortController: AbortController | null = null

    try {
      const settings = store.get('settings') as AppSettings | null
      if (!settings) throwAppError('STORE_ERROR', 'Settings not configured')

      const session = store.get('session') as SessionData | null
      if (!session?.bugs?.length) throwAppError('STORE_ERROR', 'No bugs in the current session')

      if (categorizeControllers.has(webContentsId)) {
        throwAppError('UNKNOWN_ERROR', 'Categorization already in progress')
      }

      const bugsToSend: BugItem[] = session.bugs.filter((b) => !b.categorizedAt)
      const now = new Date().toISOString()

      if (bugsToSend.length === 0) {
        // All bugs already categorized — preserve existing categorizedAt to avoid false stale
        if (!session.categorizedAt) {
          const updatedSession: SessionData = {
            ...session,
            categorizedAt: now
          }
          store.set('session', updatedSession)
        }
        return session.bugs
      }

      abortController = new AbortController()
      categorizeControllers.set(webContentsId, abortController)

      const categorized = await categorizeBugs(
        settings,
        bugsToSend,
        (progress) => {
          event.sender.send(IPC_CHANNELS.LLM_CATEGORIZE_PROGRESS, progress)
        },
        abortController.signal
      )

      // Merge LLM results back into full session bug list
      const llmMap = new Map(categorized.map((b) => [b.id, b]))
      const updatedSessionBugs = session.bugs.map((bug) => {
        const llmResult = llmMap.get(bug.id)
        if (llmResult) {
          return {
            ...bug,
            macroCategory: llmResult.macroCategory,
            subCategory: llmResult.subCategory,
            categoryReason: llmResult.categoryReason,
            categorizedAt: isFailedCategorization(llmResult.macroCategory) ? '' : now
          }
        }
        return bug
      })

      const catalog = store.get('bugCatalog') as BugCatalog | null
      if (catalog) {
        const { updatedCatalog } = mergeCategorization(session.bugs, categorized, catalog, now)
        store.set('bugCatalog', updatedCatalog)
      }

      const updatedSession: SessionData = {
        bugs: updatedSessionBugs,
        fetchedAt: session.fetchedAt,
        categorizedAt: now
      }
      store.set('session', updatedSession)
      return updatedSessionBugs
    } finally {
      if (abortController && categorizeControllers.get(webContentsId) === abortController) {
        categorizeControllers.delete(webContentsId)
      }
    }
  })
  handle(IPC_CHANNELS.LLM_CATEGORIZE_CANCEL, async (event: IpcMainInvokeEvent) => {
    const controller = categorizeControllers.get(event.sender.id)
    if (!controller) {
      return { cancelled: false }
    }

    controller.abort()
    return { cancelled: true }
  })
  handle(IPC_CHANNELS.LLM_CATEGORIZE_STATUS, async (event: IpcMainInvokeEvent) => {
    return { active: categorizeControllers.has(event.sender.id) }
  })
  handle(IPC_CHANNELS.LLM_TEST_CONNECTION, async (_event, settingsOverride?: AppSettings) => {
    const settings = settingsOverride ?? (store.get('settings') as AppSettings | null) ?? null
    if (!settings)
      return { success: false, message: 'Settings not configured' } as TestConnectionResult

    if (!settings.apiKey?.trim()) {
      return { success: false, message: 'API key is missing' } as TestConnectionResult
    }

    try {
      await testLLMConnection(settings)
      return { success: true, message: 'LLM connection successful' } as TestConnectionResult
    } catch (error: unknown) {
      const message =
        error !== null && typeof error === 'object' && 'message' in error
          ? (error as { message: string }).message
          : 'Unknown error'
      return { success: false, message } as TestConnectionResult
    }
  })

  handle(IPC_CHANNELS.LLM_FIND_SIMILAR, async (event: IpcMainInvokeEvent) => {
    const settings = store.get('settings') as AppSettings | null
    if (!settings) throwAppError('STORE_ERROR', 'Settings not configured')

    const session = store.get('session') as SessionData | null
    if (!session?.categorizedAt)
      throwAppError('STORE_ERROR', 'Categorization has not been run yet')

    const result = await findSimilarBugs(settings, session.bugs, (progress) => {
      event.sender.send(IPC_CHANNELS.LLM_FIND_SIMILAR_PROGRESS, progress)
    })

    // Persist results in session
    const updatedSession: SessionData = { ...session, similarityResults: result }
    store.set('session', updatedSession)

    // Update catalog similarity metadata
    const catalog = store.get('bugCatalog') as BugCatalog | null
    if (catalog) {
      const updatedCatalog = updateCatalogSimilarityMetadata(catalog, result)
      store.set('bugCatalog', updatedCatalog)
    }

    return result
  })

  // Shell
  handle(IPC_CHANNELS.OPEN_EXTERNAL, async (_event, url: unknown) => {
    if (typeof url !== 'string') {
      throw new Error('URL must be a string')
    }
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new Error(`Invalid URL: ${url}`)
    }
    if (parsed.protocol !== 'https:') {
      throw new Error('Only https:// URLs are allowed')
    }
    await shell.openExternal(url)
  })
}
