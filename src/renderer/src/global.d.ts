import type { AppSettings } from '@shared/types'

declare global {
  interface Window {
    electronAPI: {
      ping: () => Promise<unknown>
      getSettings: () => Promise<unknown>
      setSettings: (settings: unknown) => Promise<unknown>
      fetchBugs: () => Promise<unknown>
      testAdoConnection: (settings: AppSettings) => Promise<unknown>
      fetchAdoAttachmentDataUrl: (url: string) => Promise<string>
      categorizeBugs: () => Promise<unknown>
      cancelCategorization: () => Promise<unknown>
      getCategorizationStatus: () => Promise<{ active: boolean }>
      testLlmConnection: (settings: AppSettings) => Promise<unknown>
      onCategorizeProgress: (callback: (data: unknown) => void) => () => void
      findSimilarBugs: () => Promise<unknown>
      onFindSimilarProgress: (callback: (data: unknown) => void) => () => void
      getSession: () => Promise<unknown>
      clearSession: () => Promise<unknown>
      clearCatalog: () => Promise<unknown>
      getCatalogClosed: () => Promise<unknown>
      openExternal: (url: string) => Promise<unknown>
      agentStart: (payload: unknown) => Promise<unknown>
      agentListSessions: () => Promise<unknown>
      onAgentSessionUpdated?: (callback: (data: unknown) => void) => () => void
    }
  }
}

export {}
