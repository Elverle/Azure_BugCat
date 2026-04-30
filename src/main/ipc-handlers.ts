import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { store } from './store'
import { AppSettings } from '../shared/types'
import { fetchBugsFromQuery, testAdoConnection } from './ado/ado-service'

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
    return fetchBugsFromQuery(settings)
  })
  ipcMain.handle(IPC_CHANNELS.ADO_TEST_CONNECTION, async () => {
    const settings = store.get('settings') as AppSettings | null
    if (!settings) return { success: false, message: 'Settings non configurate' }
    return testAdoConnection(settings)
  })

  // LLM placeholders — will be implemented in FT-04
  ipcMain.handle(IPC_CHANNELS.LLM_CATEGORIZE, () => {
    throw new Error('Not implemented — FT-04')
  })
  ipcMain.handle(IPC_CHANNELS.LLM_TEST_CONNECTION, () => {
    return { success: false, message: 'LLM connection test not yet implemented (FT-04)' }
  })
}
