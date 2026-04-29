import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { store } from './store'

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

  // ADO and LLM placeholders — will be implemented in FT-03 and FT-04
  ipcMain.handle(IPC_CHANNELS.ADO_FETCH_BUGS, () => {
    throw new Error('Not implemented — FT-03')
  })
  ipcMain.handle(IPC_CHANNELS.ADO_TEST_CONNECTION, () => {
    throw new Error('Not implemented — FT-03')
  })
  ipcMain.handle(IPC_CHANNELS.LLM_CATEGORIZE, () => {
    throw new Error('Not implemented — FT-04')
  })
  ipcMain.handle(IPC_CHANNELS.LLM_TEST_CONNECTION, () => {
    throw new Error('Not implemented — FT-04')
  })
}
