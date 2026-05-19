import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  AgentChunk,
  AgentSession,
  AgentSessionStatus,
  AgentCompletedPayload,
  AgentErrorPayload,
  AgentProviderType
} from '@shared/types'

interface UseAgentSessionReturn {
  session: AgentSession | null
  startSession: (bugId: number, primaryProjectId: string) => Promise<void>
  abortSession: () => Promise<void>
  clearSession: () => void
}

export function useAgentSession(): UseAgentSessionReturn {
  const [session, setSession] = useState<AgentSession | null>(null)
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

    return () => {
      unsubChunk?.()
      unsubCompleted?.()
      unsubError?.()
    }
  }, [])

  const startSession = useCallback(async (bugId: number, primaryProjectId: string) => {
    const api = window.electronAPI as any
    try {
      const result = await api.agentStart({ bugId, mode: 'analyze', primaryProjectId })
      const { sessionId, agentProvider } = result as { sessionId: string; agentProvider: string }
      sessionIdRef.current = sessionId

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
  }, [])

  return { session, startSession, abortSession, clearSession }
}
