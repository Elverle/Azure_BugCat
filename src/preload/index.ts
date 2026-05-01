import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type { AppSettings } from '../shared/types'

const electronAPI = {
  // Ping (test IPC)
  ping: () => ipcRenderer.invoke(IPC_CHANNELS.PING),

  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  setSettings: (settings: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, settings),

  // Azure DevOps
  fetchBugs: () => ipcRenderer.invoke(IPC_CHANNELS.ADO_FETCH_BUGS),
  testAdoConnection: (settings: AppSettings) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADO_TEST_CONNECTION, settings),

  // LLM
  categorizeBugs: () => ipcRenderer.invoke(IPC_CHANNELS.LLM_CATEGORIZE),
  testLlmConnection: (settings: AppSettings) =>
    ipcRenderer.invoke(IPC_CHANNELS.LLM_TEST_CONNECTION, settings),
  onCategorizeProgress: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on(IPC_CHANNELS.LLM_CATEGORIZE_PROGRESS, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.LLM_CATEGORIZE_PROGRESS, handler)
  },

  // Session
  getSession: () => ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET),
  clearSession: () => ipcRenderer.invoke(IPC_CHANNELS.SESSION_CLEAR),

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, url)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
