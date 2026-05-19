// @vitest-environment jsdom
import { renderHook, act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAgentSession } from '@renderer/hooks/useAgentSession'

// Track event callbacks registered via on* methods
const eventCallbacks: Record<string, ((data: unknown) => void)[]> = {}

const mockElectronAPI = {
  agentStart: vi.fn().mockResolvedValue({ sessionId: 'session-1', agentProvider: 'claude-sdk' }),
  agentAbort: vi.fn().mockResolvedValue({ aborted: true }),
  agentGetSession: vi.fn().mockResolvedValue(null),
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

describe('useAgentSession', () => {
  it('session starts as null', () => {
    const { result } = renderHook(() => useAgentSession())
    expect(result.current.session).toBeNull()
  })

  it('startSession calls agentStart and sets session to running', async () => {
    const { result } = renderHook(() => useAgentSession())

    await act(async () => {
      await result.current.startSession(123, 'proj-1')
    })

    expect(mockElectronAPI.agentStart).toHaveBeenCalledWith({
      bugId: 123,
      mode: 'analyze',
      primaryProjectId: 'proj-1'
    })
    expect(result.current.session).not.toBeNull()
    expect(result.current.session?.status).toBe('running')
    expect(result.current.session?.bugId).toBe(123)
    expect(result.current.session?.id).toBe('session-1')
  })

  it('receiving a chunk via onAgentChunk appends to chunks', async () => {
    const { result } = renderHook(() => useAgentSession())

    await act(async () => {
      await result.current.startSession(123, 'proj-1')
    })

    act(() => {
      eventCallbacks['chunk']?.forEach((cb) =>
        cb({
          sessionId: 'session-1',
          type: 'text',
          content: 'analyzing...',
          timestamp: '2026-01-01T10:00:00Z'
        })
      )
    })

    expect(result.current.session?.chunks).toHaveLength(1)
    expect(result.current.session?.chunks[0].content).toBe('analyzing...')
  })

  it('receiving onAgentCompleted sets status to completed with report', async () => {
    const { result } = renderHook(() => useAgentSession())

    await act(async () => {
      await result.current.startSession(123, 'proj-1')
    })

    act(() => {
      eventCallbacks['completed']?.forEach((cb) =>
        cb({ sessionId: 'session-1', report: 'Bug found in auth module' })
      )
    })

    expect(result.current.session?.status).toBe('completed')
    expect(result.current.session?.report).toBe('Bug found in auth module')
  })

  it('receiving onAgentError sets status to error', async () => {
    const { result } = renderHook(() => useAgentSession())

    await act(async () => {
      await result.current.startSession(123, 'proj-1')
    })

    act(() => {
      eventCallbacks['error']?.forEach((cb) =>
        cb({
          sessionId: 'session-1',
          error: { code: 'UNKNOWN_ERROR', message: 'Something went wrong' }
        })
      )
    })

    expect(result.current.session?.status).toBe('error')
    expect(result.current.session?.error?.message).toBe('Something went wrong')
  })

  it('abortSession calls agentAbort and sets status to aborted', async () => {
    const { result } = renderHook(() => useAgentSession())

    await act(async () => {
      await result.current.startSession(123, 'proj-1')
    })

    await act(async () => {
      await result.current.abortSession()
    })

    expect(mockElectronAPI.agentAbort).toHaveBeenCalledWith({ sessionId: 'session-1' })
    expect(result.current.session?.status).toBe('aborted')
  })

  it('clearSession resets to null', async () => {
    const { result } = renderHook(() => useAgentSession())

    await act(async () => {
      await result.current.startSession(123, 'proj-1')
    })

    act(() => {
      result.current.clearSession()
    })

    expect(result.current.session).toBeNull()
  })

  it('reconnects to existing session on mount', async () => {
    const existingSession = {
      id: 'existing-session',
      bugId: 42,
      mode: 'analyze',
      primaryProjectId: 'proj-2',
      agentProvider: 'claude-sdk',
      status: 'running',
      startedAt: '2026-01-01T09:00:00Z',
      chunks: [
        {
          sessionId: 'existing-session',
          type: 'text',
          content: 'earlier chunk',
          timestamp: '2026-01-01T09:00:01Z'
        }
      ]
    }
    mockElectronAPI.agentGetSession.mockResolvedValueOnce(existingSession)

    const { result } = renderHook(() => useAgentSession())

    await waitFor(() => {
      expect(result.current.session).not.toBeNull()
    })

    expect(result.current.session?.id).toBe('existing-session')
    expect(result.current.session?.bugId).toBe(42)
    expect(result.current.session?.chunks).toHaveLength(1)
  })

  it('preserves error code from IPC errors', async () => {
    mockElectronAPI.agentStart.mockRejectedValueOnce(
      Object.assign(new Error('Sessione già in corso'), { code: 'AGENT_SESSION_ACTIVE' })
    )

    const { result } = renderHook(() => useAgentSession())

    await act(async () => {
      await result.current.startSession(123, 'proj-1')
    })

    expect(result.current.session?.status).toBe('error')
    expect(result.current.session?.error?.code).toBe('AGENT_SESSION_ACTIVE')
  })
})
