import { ipcMain, IpcMainInvokeEvent, shell } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { store } from './store'
import { AppError, AppSettings, BugItem, SessionData, TestConnectionResult } from '../shared/types'
import { fetchBugsFromQuery, testAdoConnection } from './ado/ado-service'
import { fetchAdoAttachmentDataUrl } from './ado/ado-client'
import { categorizeBugs, testLLMConnection, findSimilarBugs } from './llm'

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

  // Azure DevOps
  ipcMain.handle(IPC_CHANNELS.ADO_FETCH_BUGS, async () => {
    const settings = store.get('settings') as AppSettings | null
    if (!settings) throw { code: 'STORE_ERROR', message: 'Settings non configurate' }

    try {
      const fetchedBugs = await fetchBugsFromQuery(settings)
      const updatedSession: SessionData = {
        bugs: fetchedBugs.map((bug) => ({
          ...bug,
          macroCategory: '',
          subCategory: '',
          categoryReason: '',
          categorizedAt: ''
        })),
        fetchedAt: new Date().toISOString()
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

      const bugs: BugItem[] = session.bugs

      if (categorizeControllers.has(webContentsId)) {
        throw { code: 'UNKNOWN_ERROR', message: 'Categorizzazione gia in corso' }
      }

      abortController = new AbortController()
      categorizeControllers.set(webContentsId, abortController)

      const categorized = await categorizeBugs(
        settings,
        bugs,
        (progress) => {
          event.sender.send(IPC_CHANNELS.LLM_CATEGORIZE_PROGRESS, progress)
        },
        abortController.signal
      )

      const updatedSession: SessionData = {
        bugs: categorized,
        fetchedAt: session.fetchedAt,
        categorizedAt: new Date().toISOString()
      }
      store.set('session', updatedSession)

      return categorized
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
