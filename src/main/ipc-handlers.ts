import { ipcMain, IpcMainInvokeEvent, shell } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { store } from './store'
import {
  AppError,
  AppSettings,
  BugCatalog,
  BugItem,
  CatalogMetadata,
  ClosedCatalogSnapshot,
  SessionData,
  TestConnectionResult
} from '../shared/types'
import { fetchBugsFromQuery, testAdoConnection } from './ado/ado-service'
import { fetchAdoAttachmentDataUrl } from './ado/ado-client'
import { categorizeBugs, testLLMConnection, findSimilarBugs } from './llm'
import {
  mergeFetchIntoCatalog,
  mergeCategorization,
  updateCatalogSimilarityMetadata
} from './utils/catalog-merge'

function isAppError(error: unknown): error is AppError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    typeof (error as AppError).message === 'string'
  )
}

function toRendererError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  if (isAppError(error)) {
    return Object.assign(new Error(error.message), {
      code: error.code,
      details: error.details
    })
  }

  if (error !== null && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message)
    const rendererError = new Error(message)

    if ('code' in error) {
      return Object.assign(rendererError, {
        code: (error as { code?: unknown }).code
      })
    }

    return rendererError
  }

  return new Error(typeof error === 'string' && error.trim() ? error : 'Errore sconosciuto')
}

export function registerIPCHandlers(): void {
  const categorizeControllers = new Map<number, AbortController>()

  // Ping
  ipcMain.handle(IPC_CHANNELS.PING, () => 'pong')

  // Settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return store.get('settings')
  })
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event, settings: unknown) => {
    store.set('settings', settings)
  })

  // Session
  ipcMain.handle(IPC_CHANNELS.SESSION_GET, () => {
    return store.get('session')
  })
  ipcMain.handle(IPC_CHANNELS.SESSION_CLEAR, () => {
    store.set('session', null)
  })

  // Catalog
  ipcMain.handle(IPC_CHANNELS.CATALOG_CLEAR, () => {
    store.set('bugCatalog', null)
    store.set('catalogMetadata', { lastClearedAt: new Date().toISOString() })
  })

  ipcMain.handle(IPC_CHANNELS.CATALOG_GET_CLOSED, () => {
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
  ipcMain.handle(IPC_CHANNELS.ADO_FETCH_BUGS, async () => {
    const settings = store.get('settings') as AppSettings | null
    if (!settings) throw { code: 'STORE_ERROR', message: 'Settings non configurate' }

    try {
      const fetchedBugs = await fetchBugsFromQuery(settings)
      const now = new Date().toISOString()
      const catalog = store.get('bugCatalog') as BugCatalog | null
      const { updatedCatalog, sessionBugs, newBugCount } = mergeFetchIntoCatalog(
        fetchedBugs,
        catalog,
        now
      )

      store.set('bugCatalog', updatedCatalog)

      const updatedSession: SessionData = {
        bugs: sessionBugs,
        fetchedAt: now,
        lastFetchNewCount: newBugCount
      }
      store.set('session', updatedSession)

      return updatedSession.bugs
    } catch (error: unknown) {
      throw error
    }
  })
  ipcMain.handle(
    IPC_CHANNELS.ADO_TEST_CONNECTION,
    async (_event, settingsOverride?: AppSettings) => {
      const settings = settingsOverride ?? (store.get('settings') as AppSettings | null) ?? null
      if (!settings) return { success: false, message: 'Settings non configurate' }
      return testAdoConnection(settings)
    }
  )
  ipcMain.handle(IPC_CHANNELS.ADO_FETCH_ATTACHMENT_DATA_URL, async (_event, url: unknown) => {
    if (typeof url !== 'string' || !url.trim()) {
      throw { code: 'ADO_NOT_FOUND', message: 'URL attachment mancante' }
    }

    const settings = store.get('settings') as AppSettings | null
    if (!settings) throw { code: 'STORE_ERROR', message: 'Settings non configurate' }

    return fetchAdoAttachmentDataUrl(settings, url)
  })

  // LLM
  ipcMain.handle(IPC_CHANNELS.LLM_CATEGORIZE, async (event: IpcMainInvokeEvent) => {
    const webContentsId = event.sender.id
    let abortController: AbortController | null = null

    try {
      const settings = store.get('settings') as AppSettings | null
      if (!settings) throw { code: 'STORE_ERROR', message: 'Settings non configurate' }

      const session = store.get('session') as SessionData | null
      if (!session?.bugs?.length) throw { code: 'STORE_ERROR', message: 'Nessun bug in sessione' }

      if (categorizeControllers.has(webContentsId)) {
        throw { code: 'UNKNOWN_ERROR', message: 'Categorizzazione gia in corso' }
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
            categorizedAt: now
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
    } catch (error: unknown) {
      throw toRendererError(error)
    } finally {
      if (abortController && categorizeControllers.get(webContentsId) === abortController) {
        categorizeControllers.delete(webContentsId)
      }
    }
  })
  ipcMain.handle(IPC_CHANNELS.LLM_CATEGORIZE_CANCEL, async (event: IpcMainInvokeEvent) => {
    const controller = categorizeControllers.get(event.sender.id)
    if (!controller) {
      return { cancelled: false }
    }

    controller.abort()
    return { cancelled: true }
  })
  ipcMain.handle(IPC_CHANNELS.LLM_CATEGORIZE_STATUS, async (event: IpcMainInvokeEvent) => {
    return { active: categorizeControllers.has(event.sender.id) }
  })
  ipcMain.handle(
    IPC_CHANNELS.LLM_TEST_CONNECTION,
    async (_event, settingsOverride?: AppSettings) => {
      const settings = settingsOverride ?? (store.get('settings') as AppSettings | null) ?? null
      if (!settings)
        return { success: false, message: 'Settings non configurate' } as TestConnectionResult

      if (!settings.apiKey?.trim()) {
        return { success: false, message: 'API Key mancante' } as TestConnectionResult
      }

      try {
        await testLLMConnection(settings)
        return { success: true, message: 'Connessione LLM riuscita' } as TestConnectionResult
      } catch (error: unknown) {
        const message =
          error !== null && typeof error === 'object' && 'message' in error
            ? (error as { message: string }).message
            : 'Errore sconosciuto'
        return { success: false, message } as TestConnectionResult
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.LLM_FIND_SIMILAR, async (event: IpcMainInvokeEvent) => {
    const settings = store.get('settings') as AppSettings | null
    if (!settings) throw { code: 'STORE_ERROR', message: 'Settings non configurate' }

    const session = store.get('session') as SessionData | null
    if (!session?.categorizedAt)
      throw { code: 'STORE_ERROR', message: 'Categorizzazione non eseguita' }

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
  ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL, async (_event, url: unknown) => {
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
