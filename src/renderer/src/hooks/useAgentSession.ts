import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  AgentChunk,
  AgentSession,
  AgentSessionStatus,
  AgentCompletedPayload,
  AgentErrorPayload,
  AgentMcpStatusPayload,
  AgentProviderType,
  McpStatus
} from '@shared/types'

interface UseAgentSessionReturn {
  session: AgentSession | null
  mcpStatus: McpStatus | null
  startSession: (bugId: number, primaryProjectId: string) => Promise<void>
  abortSession: () => Promise<void>
  clearSession: () => void
}

export function useAgentSession(): UseAgentSessionReturn {
  const [session, setSession] = useState<AgentSession | null>(null)
  const [mcpStatus, setMcpStatus] = useState<McpStatus | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  // Reconnect to existing session on mount
  useEffect(() => {
    const api = window.electronAPI as any
    api.agentGetSession?.().then((existing: AgentSession | null) => {
      if (existing) {
        sessionIdRef.current = existing.id
        setSession(existing)
      }
    })
  }, [])

  // Subscribe to IPC events
  useEffect(() => {
    const api = window.electronAPI as any

    const unsubChunk = api.onAgentChunk?.((data: unknown) => {
      const chunk = data as AgentChunk
      if (chunk.sessionId !== sessionIdRef.current) return
      setSession((prev) => {
        if (!prev || prev.status !== 'running') return prev
        return { ...prev, chunks: [...prev.chunks, chunk] }
      })
    })

    const unsubCompleted = api.onAgentCompleted?.((data: unknown) => {
      const { sessionId, report } = data as AgentCompletedPayload
      if (sessionId !== sessionIdRef.current) return
      setSession((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          status: 'completed' as AgentSessionStatus,
          completedAt: new Date().toISOString(),
          report
        }
      })
    })

    const unsubError = api.onAgentError?.((data: unknown) => {
      const { sessionId, error } = data as AgentErrorPayload
      if (sessionId !== sessionIdRef.current) return
      setSession((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          status: 'error' as AgentSessionStatus,
          completedAt: new Date().toISOString(),
          error
        }
      })
    })

    const unsubMcpStatus = api.onAgentMcpStatus?.((data: unknown) => {
      const { sessionId, mcpStatus: status } = data as AgentMcpStatusPayload
      if (sessionId !== sessionIdRef.current) return
      setMcpStatus(status)
    })

    return () => {
      unsubChunk?.()
      unsubCompleted?.()
      unsubError?.()
      unsubMcpStatus?.()
    }
  }, [])

  const startSession = useCallback(async (bugId: number, primaryProjectId: string) => {
    const api = window.electronAPI as any
    try {
      const result = await api.agentStart({ bugId, mode: 'analyze', primaryProjectId })
      const {
        sessionId,
        agentProvider,
        mcpStatus: initialMcpStatus
      } = result as {
        sessionId: string
        agentProvider: string
        mcpStatus?: McpStatus
      }
      sessionIdRef.current = sessionId

      // Set MCP status immediately from invoke result (avoids race with IPC event)
      if (initialMcpStatus) {
        setMcpStatus(initialMcpStatus)
      }

      setSession({
        id: sessionId,
        bugId,
        mode: 'analyze',
        primaryProjectId,
        agentProvider: agentProvider as AgentProviderType,
        status: 'running',
        startedAt: new Date().toISOString(),
        chunks: []
      })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Errore avvio sessione agente'
      // Try to extract the original error code from the IPC error
      const errorCode =
        (err as any)?.code ??
        (errorMessage.includes('già in corso') ? 'AGENT_SESSION_ACTIVE' : 'AGENT_NOT_CONFIGURED')
      setSession({
        id: 'error-' + Date.now(),
        bugId,
        mode: 'analyze',
        primaryProjectId,
        agentProvider: 'none',
        status: 'error',
        startedAt: new Date().toISOString(),
        chunks: [],
        error: { code: errorCode, message: errorMessage }
      })
    }
  }, [])

  const abortSession = useCallback(async () => {
    if (!sessionIdRef.current) return
    const api = window.electronAPI as any
    await api.agentAbort({ sessionId: sessionIdRef.current })
    setSession((prev) => {
      if (!prev || prev.status !== 'running') return prev
      return { ...prev, status: 'aborted', completedAt: new Date().toISOString() }
    })
  }, [])

  const clearSession = useCallback(() => {
    sessionIdRef.current = null
    setSession(null)
    setMcpStatus(null)
  }, [])

  return { session, mcpStatus, startSession, abortSession, clearSession }
}
