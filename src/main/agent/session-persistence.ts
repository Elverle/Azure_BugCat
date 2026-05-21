import { store } from '../store'
import type { AgentSession, PersistedAgentSession } from '@shared/types'

const STORE_KEY = 'agentSessions'
const RETENTION_MS = 24 * 60 * 60 * 1000 // 24h
const MAX_PERSISTED_CHUNKS = 200

export function persistSession(session: AgentSession): void {
  try {
    const persisted: PersistedAgentSession = {
      ...session,
      chunks: session.chunks.slice(-MAX_PERSISTED_CHUNKS),
      persistedAt: new Date().toISOString()
    }

    const existing = loadRawSessions()
    const idx = existing.findIndex((s) => s.id === session.id)
    if (idx >= 0) {
      existing[idx] = persisted
    } else {
      existing.push(persisted)
    }
    store.set(STORE_KEY, existing)
  } catch (err) {
    console.error('[session-persistence] Failed to persist session:', session.id, err)
  }
}

export function loadPersistedSessions(): AgentSession[] {
  const raw = loadRawSessions()
  const cutoff = Date.now() - RETENTION_MS
  return raw
    .filter((s) => {
      const ts = s.completedAt ?? s.startedAt
      return new Date(ts).getTime() > cutoff
    })
    .map(toAgentSession)
}

export function pruneExpiredSessions(): void {
  try {
    const raw = loadRawSessions()
    const cutoff = Date.now() - RETENTION_MS
    const kept = raw.filter((s) => {
      const ts = s.completedAt ?? s.startedAt
      return new Date(ts).getTime() > cutoff
    })
    store.set(STORE_KEY, kept)
  } catch (err) {
    console.error('[session-persistence] Failed to prune expired sessions:', err)
  }
}

export function markStaleRunning(sessions: AgentSession[]): AgentSession[] {
  const now = new Date().toISOString()
  return sessions.map((s) => {
    if (s.status === 'running') {
      return { ...s, status: 'aborted' as const, completedAt: now }
    }
    return s
  })
}

function loadRawSessions(): PersistedAgentSession[] {
  return (store.get(STORE_KEY) as PersistedAgentSession[] | undefined) ?? []
}

function toAgentSession(p: PersistedAgentSession): AgentSession {
  const { persistedAt: _, ...session } = p
  return session
}
