import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { AgentSession } from '@shared/types'

vi.mock('../../src/main/store', () => ({
  store: {
    get: vi.fn(),
    set: vi.fn()
  }
}))

import { store } from '../../src/main/store'
import {
  persistSession,
  loadPersistedSessions,
  pruneExpiredSessions,
  markStaleRunning
} from '@main/agent/session-persistence'

const mockStore = store as unknown as {
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
}

function makeSession(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 'session-1',
    bugId: 100,
    mode: 'analyze',
    primaryProjectId: 'proj-1',
    agentProvider: 'claude-sdk',
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    chunks: [],
    ...overrides
  }
}

describe('session-persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('persistSession', () => {
    it('writes session to store', () => {
      mockStore.get.mockReturnValue([])

      const session = makeSession()
      persistSession(session)

      expect(mockStore.set).toHaveBeenCalledWith(
        'agentSessions',
        expect.arrayContaining([
          expect.objectContaining({ id: 'session-1', bugId: 100, persistedAt: expect.any(String) })
        ])
      )
    })

    it('upserts by id — second persist for same id replaces entry', () => {
      const existingSession = {
        ...makeSession({ report: 'old report' }),
        persistedAt: '2026-01-01T10:00:00Z'
      }
      mockStore.get.mockReturnValue([existingSession])

      persistSession(makeSession({ report: 'new report' }))

      const setCall = mockStore.set.mock.calls[0]
      const persisted = setCall[1]
      expect(persisted).toHaveLength(1)
      expect(persisted[0].report).toBe('new report')
    })

    it('trims chunks to 200', () => {
      mockStore.get.mockReturnValue([])

      const chunks = Array.from({ length: 450 }, (_, i) => ({
        sessionId: 'session-1',
        type: 'text' as const,
        content: `chunk-${i}`,
        timestamp: new Date().toISOString()
      }))

      persistSession(makeSession({ chunks }))

      const setCall = mockStore.set.mock.calls[0]
      const persisted = setCall[1]
      expect(persisted[0].chunks).toHaveLength(200)
      // Should keep the last 200 chunks
      expect(persisted[0].chunks[199].content).toBe('chunk-449')
    })
  })

  describe('loadPersistedSessions', () => {
    it('filters by 24h — old sessions excluded', () => {
      const recentSession = {
        ...makeSession({ id: 'recent' }),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        persistedAt: new Date().toISOString()
      }
      const oldSession = {
        ...makeSession({ id: 'old' }),
        startedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        persistedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
      }
      mockStore.get.mockReturnValue([recentSession, oldSession])

      const result = loadPersistedSessions()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('recent')
    })
  })

  describe('pruneExpiredSessions', () => {
    it('removes old entries from store', () => {
      const recentSession = {
        ...makeSession({ id: 'recent' }),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        persistedAt: new Date().toISOString()
      }
      const oldSession = {
        ...makeSession({ id: 'old' }),
        startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        persistedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      }
      mockStore.get.mockReturnValue([recentSession, oldSession])

      pruneExpiredSessions()

      const setCall = mockStore.set.mock.calls[0]
      const kept = setCall[1]
      expect(kept).toHaveLength(1)
      expect(kept[0].id).toBe('recent')
    })
  })

  describe('markStaleRunning', () => {
    it('marks running sessions as aborted', () => {
      const sessions: AgentSession[] = [
        makeSession({ id: 's1', status: 'running', completedAt: undefined }),
        makeSession({ id: 's2', status: 'completed' }),
        makeSession({ id: 's3', status: 'running', completedAt: undefined })
      ]

      const result = markStaleRunning(sessions)

      expect(result[0].status).toBe('aborted')
      expect(result[0].completedAt).toBeDefined()
      expect(result[1].status).toBe('completed')
      expect(result[2].status).toBe('aborted')
      expect(result[2].completedAt).toBeDefined()
    })
  })
})
