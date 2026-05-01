import { ipcMain, IpcMainInvokeEvent, shell } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { store } from './store'
import { AppSettings, BugItem, SessionData, TestConnectionResult } from '../shared/types'
import { fetchBugsFromQuery, testAdoConnection } from './ado/ado-service'
import { categorizeBugs, testLLMConnection } from './llm'

export function registerIPCHandlers(): void {
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

  // LLM
  ipcMain.handle(IPC_CHANNELS.LLM_CATEGORIZE, async (event: IpcMainInvokeEvent) => {
    const settings = store.get('settings') as AppSettings | null
    if (!settings) throw { code: 'STORE_ERROR', message: 'Settings non configurate' }

    const session = store.get('session') as SessionData | null
    if (!session?.bugs?.length) throw { code: 'STORE_ERROR', message: 'Nessun bug in sessione' }

    const bugs: BugItem[] = session.bugs

    const categorized = await categorizeBugs(settings, bugs, (progress) => {
      event.sender.send(IPC_CHANNELS.LLM_CATEGORIZE_PROGRESS, progress)
    })

    const updatedSession: SessionData = {
      bugs: categorized,
      fetchedAt: session.fetchedAt,
      categorizedAt: new Date().toISOString()
    }
    store.set('session', updatedSession)

    return categorized
  })
  ipcMain.handle(
    IPC_CHANNELS.LLM_TEST_CONNECTION,
    async (_event, settingsOverride?: AppSettings) => {
      const settings = settingsOverride ?? (store.get('settings') as AppSettings | null) ?? null
      if (!settings)
        return { success: false, message: 'Settings non configurate' } as TestConnectionResult

      if (settings.llmProvider === 'github-copilot') {
        if (settings.copilotAuthStatus === 'unauthenticated') {
          return {
            success: false,
            message: 'Autenticazione GitHub Copilot richiesta'
          } as TestConnectionResult
        }
      } else if (!settings.apiKey?.trim()) {
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
