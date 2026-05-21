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
  fetchAdoAttachmentDataUrl: (url: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.ADO_FETCH_ATTACHMENT_DATA_URL, url),

  // LLM
  categorizeBugs: () => ipcRenderer.invoke(IPC_CHANNELS.LLM_CATEGORIZE),
  cancelCategorization: () => ipcRenderer.invoke(IPC_CHANNELS.LLM_CATEGORIZE_CANCEL),
  getCategorizationStatus: () => ipcRenderer.invoke(IPC_CHANNELS.LLM_CATEGORIZE_STATUS),
  testLlmConnection: (settings: AppSettings) =>
    ipcRenderer.invoke(IPC_CHANNELS.LLM_TEST_CONNECTION, settings),
  onCategorizeProgress: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on(IPC_CHANNELS.LLM_CATEGORIZE_PROGRESS, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.LLM_CATEGORIZE_PROGRESS, handler)
  },

  // LLM - Similarity
  findSimilarBugs: () => ipcRenderer.invoke(IPC_CHANNELS.LLM_FIND_SIMILAR),
  onFindSimilarProgress: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on(IPC_CHANNELS.LLM_FIND_SIMILAR_PROGRESS, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.LLM_FIND_SIMILAR_PROGRESS, handler)
  },

  // Session
  getSession: () => ipcRenderer.invoke(IPC_CHANNELS.SESSION_GET),
  clearSession: () => ipcRenderer.invoke(IPC_CHANNELS.SESSION_CLEAR),

  // Catalog
  clearCatalog: () => ipcRenderer.invoke(IPC_CHANNELS.CATALOG_CLEAR),
  getCatalogClosed: () => ipcRenderer.invoke(IPC_CHANNELS.CATALOG_GET_CLOSED),

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, url),

  // Agent
  checkAgentBinary: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_CHECK_BINARY),
  selectDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_SELECT_DIRECTORY),

  // Projects
  getProjects: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_GET),
  setProjects: (projects: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_SET, projects),
  validateProjectPaths: (paths: string[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECTS_VALIDATE_PATHS, paths),

  // Agent Sessions
  agentSuggestProjects: (payload: { bugId: number; primaryOverride?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_SUGGEST_PROJECTS, payload),
  agentStart: (payload: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_START, payload),
  agentAbort: (payload: unknown) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_ABORT, payload),
  agentGetSession: (sessionId?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_GET_SESSION, sessionId),
  agentListSessions: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_LIST_SESSIONS),
  agentSaveReport: (payload: { sessionId: string; defaultFilename?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.AGENT_SAVE_REPORT, payload),
  onAgentChunk: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on(IPC_CHANNELS.AGENT_CHUNK, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AGENT_CHUNK, handler)
  },
  onAgentCompleted: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on(IPC_CHANNELS.AGENT_COMPLETED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AGENT_COMPLETED, handler)
  },
  onAgentError: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on(IPC_CHANNELS.AGENT_ERROR, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AGENT_ERROR, handler)
  },
  onAgentSessionUpdated: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on(IPC_CHANNELS.AGENT_SESSION_UPDATED, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AGENT_SESSION_UPDATED, handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
