import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, IPCChannel } from '../shared/ipc-channels'
import { decodeIpcError } from '@shared/app-error'
import type { AppSettings } from '../shared/types'

/**
 * The single place where the IPC wire format is turned back into an AppError:
 * every channel goes through here, so the renderer only ever sees typed
 * `{ code, message }` rejections and never has to parse a message itself.
 */
async function invoke<T = unknown>(channel: IPCChannel, ...args: unknown[]): Promise<T> {
  try {
    return (await ipcRenderer.invoke(channel, ...args)) as T
  } catch (error: unknown) {
    throw decodeIpcError(error)
  }
}

const electronAPI = {
  // Ping (test IPC)
  ping: () => invoke(IPC_CHANNELS.PING),

  // Settings
  getSettings: () => invoke(IPC_CHANNELS.SETTINGS_GET),
  setSettings: (settings: unknown) => invoke(IPC_CHANNELS.SETTINGS_SET, settings),

  // Azure DevOps
  fetchBugs: () => invoke(IPC_CHANNELS.ADO_FETCH_BUGS),
  testAdoConnection: (settings: AppSettings) => invoke(IPC_CHANNELS.ADO_TEST_CONNECTION, settings),
  fetchAdoAttachmentDataUrl: (url: string) =>
    invoke(IPC_CHANNELS.ADO_FETCH_ATTACHMENT_DATA_URL, url),

  // LLM
  categorizeBugs: () => invoke(IPC_CHANNELS.LLM_CATEGORIZE),
  cancelCategorization: () => invoke(IPC_CHANNELS.LLM_CATEGORIZE_CANCEL),
  getCategorizationStatus: () => invoke(IPC_CHANNELS.LLM_CATEGORIZE_STATUS),
  testLlmConnection: (settings: AppSettings) => invoke(IPC_CHANNELS.LLM_TEST_CONNECTION, settings),
  onCategorizeProgress: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on(IPC_CHANNELS.LLM_CATEGORIZE_PROGRESS, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.LLM_CATEGORIZE_PROGRESS, handler)
  },

  // LLM - Similarity
  findSimilarBugs: () => invoke(IPC_CHANNELS.LLM_FIND_SIMILAR),
  cancelFindSimilar: () => invoke(IPC_CHANNELS.LLM_FIND_SIMILAR_CANCEL),
  getFindSimilarStatus: () => invoke(IPC_CHANNELS.LLM_FIND_SIMILAR_STATUS),
  onFindSimilarProgress: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on(IPC_CHANNELS.LLM_FIND_SIMILAR_PROGRESS, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.LLM_FIND_SIMILAR_PROGRESS, handler)
  },
  onFindSimilarDone: (callback: () => void) => {
    const handler = (): void => callback()
    ipcRenderer.on(IPC_CHANNELS.LLM_FIND_SIMILAR_DONE, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.LLM_FIND_SIMILAR_DONE, handler)
  },

  // Session
  getSession: () => invoke(IPC_CHANNELS.SESSION_GET),
  clearSession: () => invoke(IPC_CHANNELS.SESSION_CLEAR),

  // Catalog
  clearCatalog: () => invoke(IPC_CHANNELS.CATALOG_CLEAR),
  getCatalogClosed: () => invoke(IPC_CHANNELS.CATALOG_GET_CLOSED),

  // Shell
  openExternal: (url: string) => invoke(IPC_CHANNELS.OPEN_EXTERNAL, url)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
