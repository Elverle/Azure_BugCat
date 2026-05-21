// @vitest-environment jsdom
import { renderHook, act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAgentSessions } from '@renderer/hooks/useAgentSessions'
import type { AgentSessionSummary } from '@shared/types'

const eventCallbacks: Record<string, ((data: unknown) => void)[]> = {}

function makeSummary(overrides: Partial<AgentSessionSummary> = {}): AgentSessionSummary {
  return {
    id: 'session-1',
    bugId: 100,
    mode: 'analyze',
    primaryProjectId: 'proj-1',
    agentProvider: 'claude-sdk',
    status: 'running',
    startedAt: '2026-01-15T10:00:00Z',
    chunkCount: 0,
    ...overrides
  }
}

const mockElectronAPI = {
  agentListSessions: vi.fn().mockResolvedValue([]),
  agentStart: vi.fn().mockResolvedValue({ sessionId: 'new-session', agentProvider: 'claude-sdk' }),
  agentAbort: vi.fn().mockResolvedValue({ aborted: true }),
  agentGetSession: vi.fn().mockResolvedValue(null),
  agentSaveReport: vi.fn().mockResolvedValue(undefined),
  getSettings: vi
    .fn()
    .mockResolvedValue({ orgUrl: 'https://dev.azure.com/org', projectName: 'Proj' }),
  openExternal: vi.fn().mockResolvedValue(undefined),
  onAgentChunk: vi.fn((cb: (data: unknown) => void) => {
    if (!eventCallbacks['chunk']) eventCallbacks['chunk'] = []
    eventCallbacks['chunk'].push(cb)
    return () => {
      eventCallbacks['chunk'] = eventCallbacks['chunk'].filter((fn) => fn !== cb)
    }
  }),
  onAgentCompleted: vi.fn((cb: (data: unknown) => void) => {
    if (!eventCallbacks['completed']) eventCallbacks['completed'] = []
    eventCallbacks['completed'].push(cb)
    return () => {
      eventCallbacks['completed'] = eventCallbacks['completed'].filter((fn) => fn !== cb)
    }
  }),
  onAgentError: vi.fn((cb: (data: unknown) => void) => {
    if (!eventCallbacks['error']) eventCallbacks['error'] = []
    eventCallbacks['error'].push(cb)
    return () => {
      eventCallbacks['error'] = eventCallbacks['error'].filter((fn) => fn !== cb)
    }
  }),
  onAgentSessionUpdated: vi.fn((cb: (data: unknown) => void) => {
    if (!eventCallbacks['sessionUpdated']) eventCallbacks['sessionUpdated'] = []
    eventCallbacks['sessionUpdated'].push(cb)
    return () => {
      eventCallbacks['sessionUpdated'] = eventCallbacks['sessionUpdated'].filter((fn) => fn !== cb)
    }
  })
}

beforeEach(() => {
  Object.keys(eventCallbacks).forEach((k) => {
    eventCallbacks[k] = []
  })
  vi.clearAllMocks()
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: mockElectronAPI
  })
})

describe('useAgentSessions', () => {
  it('calls agentListSessions on mount', async () => {
    const sessions = [makeSummary({ id: 's1' }), makeSummary({ id: 's2', status: 'completed' })]
    mockElectronAPI.agentListSessions.mockResolvedValue(sessions)

    const { result } = renderHook(() => useAgentSessions())

    await waitFor(() => {
      expect(result.current.allSessions).toHaveLength(2)
    })
    expect(mockElectronAPI.agentListSessions).toHaveBeenCalledTimes(1)
  })

  it('filtering by running returns only running sessions', async () => {
    const sessions = [
      makeSummary({ id: 's1', status: 'running' }),
      makeSummary({ id: 's2', status: 'completed' }),
      makeSummary({ id: 's3', status: 'running' })
    ]
    mockElectronAPI.agentListSessions.mockResolvedValue(sessions)

    const { result } = renderHook(() => useAgentSessions())

    await waitFor(() => {
      expect(result.current.allSessions).toHaveLength(3)
    })

    act(() => {
      result.current.setStatusFilter('running')
    })

    expect(result.current.sessions).toHaveLength(2)
    expect(result.current.sessions.every((s) => s.status === 'running')).toBe(true)
  })

  it('chunk for session B updates only session B chunkCount', async () => {
    const sessions = [
      makeSummary({ id: 'A', chunkCount: 5 }),
      makeSummary({ id: 'B', chunkCount: 3 })
    ]
    mockElectronAPI.agentListSessions.mockResolvedValue(sessions)

    const { result } = renderHook(() => useAgentSessions())

    await waitFor(() => {
      expect(result.current.allSessions).toHaveLength(2)
    })

    act(() => {
      eventCallbacks['chunk']?.forEach((cb) =>
        cb({ sessionId: 'B', type: 'text', content: 'data', timestamp: '2026-01-15T10:01:00Z' })
      )
    })

    const sessionA = result.current.allSessions.find((s) => s.id === 'A')
    const sessionB = result.current.allSessions.find((s) => s.id === 'B')
    expect(sessionA?.chunkCount).toBe(5)
    expect(sessionB?.chunkCount).toBe(4)
  })

  it('startSession calls agentStart with correct payload', async () => {
    mockElectronAPI.agentListSessions.mockResolvedValue([])

    const { result } = renderHook(() => useAgentSessions())

    await waitFor(() => {
      expect(mockElectronAPI.agentListSessions).toHaveBeenCalled()
    })

    await act(async () => {
      await result.current.startSession(42, 'primary-proj', ['secondary-1'])
    })

    expect(mockElectronAPI.agentStart).toHaveBeenCalledWith({
      bugId: 42,
      mode: 'analyze',
      primaryProjectId: 'primary-proj',
      secondaryProjectIds: ['secondary-1']
    })
  })

  it('abortSession calls agentAbort with correct payload', async () => {
    mockElectronAPI.agentListSessions.mockResolvedValue([makeSummary({ id: 'target-session' })])

    const { result } = renderHook(() => useAgentSessions())

    await waitFor(() => {
      expect(result.current.allSessions).toHaveLength(1)
    })

    await act(async () => {
      await result.current.abortSession('target-session')
    })

    expect(mockElectronAPI.agentAbort).toHaveBeenCalledWith({ sessionId: 'target-session' })
  })
})
