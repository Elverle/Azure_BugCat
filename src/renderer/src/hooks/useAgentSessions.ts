import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type {
  AgentChunk,
  AgentSession,
  AgentSessionSummary,
  AgentSessionFilter,
  AgentSessionStatus,
  AgentCompletedPayload,
  AgentErrorPayload,
  AgentSessionUpdatedPayload,
  AppSettings
} from '@shared/types'

export interface UseAgentSessionsReturn {
  sessions: AgentSessionSummary[]
  allSessions: AgentSessionSummary[]
  selectedSession: AgentSession | null
  selectedSessionId: string | null
  runningCount: number
  statusFilter: AgentSessionFilter
  selectSession: (id: string | null) => void
  setStatusFilter: (filter: AgentSessionFilter) => void
  startSession: (
    bugId: number,
    primaryProjectId: string,
    secondaryProjectIds?: string[]
  ) => Promise<void>
  abortSession: (sessionId: string) => Promise<void>
  copyReport: (sessionId: string) => Promise<void>
  saveReport: (sessionId: string, bugId: number) => Promise<void>
  openBugInAdo: (bugId: number) => Promise<void>
}

export function useAgentSessions(): UseAgentSessionsReturn {
  const [allSessions, setAllSessions] = useState<AgentSessionSummary[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<AgentSession | null>(null)
  const [statusFilter, setStatusFilter] = useState<AgentSessionFilter>('all')

  const selectedSessionIdRef = useRef<string | null>(null)
  selectedSessionIdRef.current = selectedSessionId

  // Hydrate session list on mount
  useEffect(() => {
    const api = window.electronAPI as any
    api.agentListSessions?.().then((list: AgentSessionSummary[]) => {
      if (list) setAllSessions(list)
    })
  }, [])

  // Subscribe to IPC events
  useEffect(() => {
    const api = window.electronAPI as any

    const unsubChunk = api.onAgentChunk?.((data: unknown) => {
      const chunk = data as AgentChunk
      // Update chunkCount in the matching session summary
      setAllSessions((prev) =>
        prev.map((s) => (s.id === chunk.sessionId ? { ...s, chunkCount: s.chunkCount + 1 } : s))
      )
      // If this chunk belongs to the selected session, append it
      if (chunk.sessionId === selectedSessionIdRef.current) {
        setSelectedSession((prev) => {
          if (!prev || prev.id !== chunk.sessionId) return prev
          const updatedChunks = [...prev.chunks, chunk]
          if (updatedChunks.length > 500) {
            updatedChunks.shift()
          }
          return { ...prev, chunks: updatedChunks }
        })
      }
    })

    const unsubCompleted = api.onAgentCompleted?.((data: unknown) => {
      const { sessionId, report, usage } = data as AgentCompletedPayload
      setAllSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                status: 'completed' as AgentSessionStatus,
                completedAt: new Date().toISOString(),
                report,
                usage
              }
            : s
        )
      )
      if (sessionId === selectedSessionIdRef.current) {
        setSelectedSession((prev) => {
          if (!prev || prev.id !== sessionId) return prev
          return {
            ...prev,
            status: 'completed' as AgentSessionStatus,
            completedAt: new Date().toISOString(),
            report,
            usage
          }
        })
      }
    })

    const unsubError = api.onAgentError?.((data: unknown) => {
      const { sessionId, error } = data as AgentErrorPayload
      setAllSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                status: 'error' as AgentSessionStatus,
                completedAt: new Date().toISOString(),
                error
              }
            : s
        )
      )
      if (sessionId === selectedSessionIdRef.current) {
        setSelectedSession((prev) => {
          if (!prev || prev.id !== sessionId) return prev
          return {
            ...prev,
            status: 'error' as AgentSessionStatus,
            completedAt: new Date().toISOString(),
            error
          }
        })
      }
    })

    const unsubSessionUpdated = api.onAgentSessionUpdated?.((data: unknown) => {
      const { sessionId, status, completedAt } = data as AgentSessionUpdatedPayload
      setAllSessions((prev) => {
        const exists = prev.some((s) => s.id === sessionId)
        if (!exists) {
          // Session not in list yet — re-fetch full list
          api.agentListSessions?.().then((list: AgentSessionSummary[]) => {
            if (list) setAllSessions(list)
          })
          return prev
        }
        return prev.map((s) => (s.id === sessionId ? { ...s, status, completedAt } : s))
      })
      if (sessionId === selectedSessionIdRef.current) {
        setSelectedSession((prev) => {
          if (!prev || prev.id !== sessionId) return prev
          return { ...prev, status, completedAt }
        })
      }
    })

    return () => {
      unsubChunk?.()
      unsubCompleted?.()
      unsubError?.()
      unsubSessionUpdated?.()
    }
  }, [])

  // Filtered sessions
  const sessions = useMemo(() => {
    if (statusFilter === 'all') return allSessions
    return allSessions.filter((s) => s.status === statusFilter)
  }, [allSessions, statusFilter])

  // Running count
  const runningCount = useMemo(
    () => allSessions.filter((s) => s.status === 'running').length,
    [allSessions]
  )

  // Select a session and fetch full detail
  const selectSession = useCallback((id: string | null) => {
    setSelectedSessionId(id)
    if (id === null) {
      setSelectedSession(null)
      return
    }
    const api = window.electronAPI as any
    api.agentGetSession?.(id).then((full: AgentSession | null) => {
      // Guard against stale responses from slower requests
      if (selectedSessionIdRef.current === id) {
        setSelectedSession(full)
      }
    })
  }, [])

  // Start a new session
  const startSession = useCallback(
    async (bugId: number, primaryProjectId: string, secondaryProjectIds?: string[]) => {
      const api = window.electronAPI as any
      await api.agentStart({ bugId, mode: 'analyze', primaryProjectId, secondaryProjectIds })
      // Re-fetch list to include the new session
      const list = (await api.agentListSessions?.()) as AgentSessionSummary[] | undefined
      if (list) setAllSessions(list)
    },
    []
  )

  // Abort a session
  const abortSession = useCallback(async (sessionId: string) => {
    const api = window.electronAPI as any
    await api.agentAbort({ sessionId })
  }, [])

  // Copy report to clipboard
  const copyReport = useCallback(
    async (sessionId: string) => {
      const target = allSessions.find((s) => s.id === sessionId)
      if (target?.report) {
        await navigator.clipboard.writeText(target.report)
      }
    },
    [allSessions]
  )

  // Save report to file
  const saveReport = useCallback(async (sessionId: string, bugId: number) => {
    const api = window.electronAPI as any
    await api.agentSaveReport({ sessionId, defaultFilename: `bug-${bugId}-report.md` })
  }, [])

  // Open bug in Azure DevOps
  const openBugInAdo = useCallback(async (bugId: number) => {
    const api = window.electronAPI as any
    const settings = (await api.getSettings?.()) as AppSettings | undefined
    if (!settings?.orgUrl || !settings?.projectName) return
    const url = `${settings.orgUrl}/${settings.projectName}/_workitems/edit/${bugId}`
    await api.openExternal?.(url)
  }, [])

  return {
    sessions,
    allSessions,
    selectedSession,
    selectedSessionId,
    runningCount,
    statusFilter,
    selectSession,
    setStatusFilter,
    startSession,
    abortSession,
    copyReport,
    saveReport,
    openBugInAdo
  }
}
