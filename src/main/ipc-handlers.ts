import { ipcMain, IpcMainInvokeEvent, shell } from 'electron'
import { IPC_CHANNELS, IPCChannel } from '../shared/ipc-channels'
import { store } from './store'
import {
  AppSettings,
  BugCatalog,
  BugItem,
  CategorizedBug,
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
  const similarityControllers = new Map<number, AbortController>()

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

      // Persists one completed chunk immediately, so a run that later dies (timeout,
      // rate limit, cancel) does not throw away the chunks that already succeeded —
      // the user would otherwise pay for those tokens again on retry. Delegates the
      // actual merge to mergeCategorization (Task 3) rather than duplicating its
      // retry-eligibility ternary here — that catalog-merge.ts copy is the one with
      // test coverage.
      const persistChunk = (chunk: CategorizedBug[]): void => {
        const currentSession = store.get('session') as SessionData | null
        if (!currentSession) return

        const currentCatalog = store.get('bugCatalog') as BugCatalog | null
        const { updatedSessionBugs, updatedCatalog } = mergeCategorization(
          currentSession.bugs,
          chunk,
          currentCatalog ?? {},
          now
        )
        store.set('session', { ...currentSession, bugs: updatedSessionBugs })
        if (currentCatalog) {
          store.set('bugCatalog', updatedCatalog)
        }
      }

      abortController = new AbortController()
      categorizeControllers.set(webContentsId, abortController)

      const categorized = await categorizeBugs(
        settings,
        bugsToSend,
        (progress) => {
          persistChunk(progress.currentChunk)
          event.sender.send(IPC_CHANNELS.LLM_CATEGORIZE_PROGRESS, progress)
        },
        abortController.signal
      )

      // Bugs are already persisted chunk by chunk via persistChunk above. SESSION_CLEAR
      // can land mid-run, so the session may be gone by the time we get here — in that
      // case there is nothing to write back, just return what was categorized.
      const finalSession = store.get('session') as SessionData | null
      if (!finalSession) return categorized

      const updatedSession: SessionData = { ...finalSession, categorizedAt: now }
      store.set('session', updatedSession)
      return updatedSession.bugs
    } finally {
      if (abortController && categorizeControllers.get(webContentsId) === abortController) {
        categorizeControllers.delete(webContentsId)
      }
      // Only announce completion for an invocation that actually started a run.
      // Unlike LLM_FIND_SIMILAR, whose equivalent guards all sit before its try,
      // LLM_CATEGORIZE's pre-flight checks (missing settings, empty session, the
      // in-flight guard) and the "nothing left to categorize" early return all
      // live inside this try, so abortController is the only reliable signal
      // that a run was registered. Without this gate, a rejected concurrent
      // invocation on the same webContents would send DONE while run 1 is still
      // executing — a listener attached to run 1 would unsubscribe on that false
      // signal and never hear about run 1's real completion.
      if (abortController) {
        try {
          event.sender.send(IPC_CHANNELS.LLM_CATEGORIZE_DONE)
        } catch {
          // The renderer window may have closed mid-run. A throw from this
          // finally block would replace whatever the handler is really
          // returning or rejecting with, so the notification failure is
          // deliberately swallowed here.
        }
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
    const webContentsId = event.sender.id
    if (similarityControllers.has(webContentsId)) {
      throwAppError('UNKNOWN_ERROR', 'Similarity analysis already in progress')
    }

    const settings = store.get('settings') as AppSettings | null
    if (!settings) throwAppError('STORE_ERROR', 'Settings not configured')

    const session = store.get('session') as SessionData | null
    if (!session?.categorizedAt)
      throwAppError('STORE_ERROR', 'Categorization has not been run yet')

    const abortController = new AbortController()
    similarityControllers.set(webContentsId, abortController)

    try {
      const result = await findSimilarBugs(
        settings,
        session.bugs,
        (progress) => {
          event.sender.send(IPC_CHANNELS.LLM_FIND_SIMILAR_PROGRESS, progress)
        },
        abortController.signal
      )

      // Re-read the session now rather than reusing the object captured above:
      // a bug fetch or categorization can complete while the analysis is
      // running, and writing back the stale object would silently revert it
      // (review 2.2, lost update).
      const latestSession = store.get('session') as SessionData | null
      if (latestSession) {
        store.set('session', { ...latestSession, similarityResults: result })
      }

      // Update catalog similarity metadata against the catalog as it stands now.
      const catalog = store.get('bugCatalog') as BugCatalog | null
      if (catalog) {
        store.set('bugCatalog', updateCatalogSimilarityMetadata(catalog, result))
      }

      return result
    } finally {
      // Only remove the controller if it is still the one this run registered —
      // a late finisher must not delete a newer run's controller.
      if (similarityControllers.get(webContentsId) === abortController) {
        similarityControllers.delete(webContentsId)
      }
      try {
        event.sender.send(IPC_CHANNELS.LLM_FIND_SIMILAR_DONE)
      } catch {
        // The renderer window may have closed mid-run. A throw from this
        // finally block would replace whatever the handler is really
        // returning or rejecting with, so the notification failure is
        // deliberately swallowed here.
      }
    }
  })
  handle(IPC_CHANNELS.LLM_FIND_SIMILAR_CANCEL, async (event: IpcMainInvokeEvent) => {
    const controller = similarityControllers.get(event.sender.id)
    if (!controller) {
      return { cancelled: false }
    }

    controller.abort()
    return { cancelled: true }
  })
  handle(IPC_CHANNELS.LLM_FIND_SIMILAR_STATUS, async (event: IpcMainInvokeEvent) => {
    return { active: similarityControllers.has(event.sender.id) }
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
