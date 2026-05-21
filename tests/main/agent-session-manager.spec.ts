import { describe, expect, it, vi, beforeEach } from 'vitest'
import { SessionManager } from '@main/agent/session-manager'
import type { AgentRunResult, AgentRunner, RunParams } from '@main/agent/types'
import type { AgentChunk, AppError } from '@shared/types'

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50))
}

function createMockRunner(
  options: {
    resolveWith?: AgentRunResult
    rejectWith?: Error
    onRun?: (params: RunParams) => void
  } = {}
): AgentRunner {
  return {
    supportsFixMode: false,
    supportsMcp: false,
    run: vi.fn(async (params: RunParams) => {
      options.onRun?.(params)
      if (options.rejectWith) throw options.rejectWith
      return options.resolveWith ?? { report: 'Test report' }
    })
  }
}

describe('SessionManager', () => {
  let manager: SessionManager

  beforeEach(() => {
    manager = new SessionManager()
  })

  it('start() creates a session and returns an ID', () => {
    const runner = createMockRunner()
    const onChunk = vi.fn()
    const onCompleted = vi.fn()
    const onError = vi.fn()

    const sessionId = manager.start(
      123,
      'analyze',
      'proj-1',
      'claude-sdk',
      runner,
      'test prompt',
      { primaryPath: '/path', mode: 'analyze', apiKey: 'key' },
      onChunk,
      onCompleted,
      onError
    )

    expect(sessionId).toBeDefined()
    expect(typeof sessionId).toBe('string')
    expect(sessionId.length).toBeGreaterThan(0)
  })

  it('isRunning() returns true while session is running', () => {
    const runner = createMockRunner({
      onRun: () => new Promise(() => {}) // never resolves
    })
    // Override run to hang indefinitely
    runner.run = vi.fn(() => new Promise(() => {}))

    manager.start(
      123,
      'analyze',
      'proj-1',
      'claude-sdk',
      runner,
      'prompt',
      { primaryPath: '/path', mode: 'analyze', apiKey: 'key' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    )

    expect(manager.isRunning()).toBe(true)
  })

  it('start() throws when concurrency limit reached', () => {
    const mgr = new SessionManager(1)
    const runner = createMockRunner({
      onRun: () => new Promise(() => {})
    })
    runner.run = vi.fn(() => new Promise(() => {}))

    mgr.start(
      123,
      'analyze',
      'proj-1',
      'claude-sdk',
      runner,
      'prompt',
      { primaryPath: '/path', mode: 'analyze', apiKey: 'key' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    )

    expect(() =>
      mgr.start(
        456,
        'analyze',
        'proj-2',
        'claude-sdk',
        runner,
        'prompt 2',
        { primaryPath: '/path2', mode: 'analyze', apiKey: 'key' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )
    ).toThrow('Numero massimo di sessioni concorrenti raggiunto')
  })

  it('abort() transitions to aborted', () => {
    const runner = createMockRunner()
    runner.run = vi.fn(() => new Promise(() => {}))

    const sessionId = manager.start(
      123,
      'analyze',
      'proj-1',
      'claude-sdk',
      runner,
      'prompt',
      { primaryPath: '/path', mode: 'analyze', apiKey: 'key' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    )

    const result = manager.abort(sessionId)
    expect(result).toBe(true)
    expect(manager.isRunning()).toBe(false)
    expect(manager.getSession(sessionId)?.status).toBe('aborted')
  })

  it('abort() returns false for non-existent session', () => {
    const result = manager.abort('non-existent-id')
    expect(result).toBe(false)
  })

  it('on runner completion: session transitions to completed and calls onCompleted', async () => {
    const runner = createMockRunner({
      resolveWith: {
        report: 'Final report',
        usage: { inputTokens: 120, outputTokens: 45, totalTokens: 165 }
      }
    })
    const onCompleted = vi.fn()

    const sessionId = manager.start(
      123,
      'analyze',
      'proj-1',
      'claude-sdk',
      runner,
      'prompt',
      { primaryPath: '/path', mode: 'analyze', apiKey: 'key' },
      vi.fn(),
      onCompleted,
      vi.fn()
    )

    await flushPromises()

    expect(manager.getSession(sessionId)?.status).toBe('completed')
    expect(manager.getSession(sessionId)?.report).toBe('Final report')
    expect(manager.getSession(sessionId)?.usage).toEqual({
      inputTokens: 120,
      outputTokens: 45,
      totalTokens: 165
    })
    expect(onCompleted).toHaveBeenCalledWith(sessionId, 'Final report', {
      inputTokens: 120,
      outputTokens: 45,
      totalTokens: 165
    })
  })

  it('on runner error: session transitions to error and calls onError', async () => {
    const runner = createMockRunner({ rejectWith: new Error('LLM exploded') })
    const onError = vi.fn()

    const sessionId = manager.start(
      123,
      'analyze',
      'proj-1',
      'claude-sdk',
      runner,
      'prompt',
      { primaryPath: '/path', mode: 'analyze', apiKey: 'key' },
      vi.fn(),
      vi.fn(),
      onError
    )

    await flushPromises()

    expect(manager.getSession(sessionId)?.status).toBe('error')
    expect(onError).toHaveBeenCalledWith(
      sessionId,
      expect.objectContaining({ code: 'UNKNOWN_ERROR', message: 'LLM exploded' })
    )
  })

  it('clearCompleted() removes non-running sessions', () => {
    const runner = createMockRunner()
    runner.run = vi.fn(() => new Promise(() => {}))

    const sessionId = manager.start(
      123,
      'analyze',
      'proj-1',
      'claude-sdk',
      runner,
      'prompt',
      { primaryPath: '/path', mode: 'analyze', apiKey: 'key' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    )

    // Abort then clear completed
    manager.abort(sessionId)
    manager.clearCompleted()

    expect(manager.getSession(sessionId)).toBeNull()
    expect(manager.isRunning()).toBe(false)
  })

  it('ignores stale callbacks after abort and restart', async () => {
    // Start first session with a slow runner that we control
    let resolveFirst!: (v: AgentRunResult) => void
    const slowRunner: AgentRunner = {
      supportsFixMode: false,
      supportsMcp: false,
      run: vi.fn().mockImplementation(
        () =>
          new Promise<AgentRunResult>((resolve) => {
            resolveFirst = resolve
          })
      )
    }

    const onChunk = vi.fn()
    const onCompleted = vi.fn()
    const onError = vi.fn()

    const runParams = { primaryPath: '/path', mode: 'analyze' as const, apiKey: 'key' }

    const firstId = manager.start(
      1,
      'analyze',
      'proj-1',
      'claude-sdk',
      slowRunner,
      'prompt 1',
      runParams,
      onChunk,
      onCompleted,
      onError
    )

    // Abort first session
    manager.abort(firstId)
    expect(manager.getSession(firstId)?.status).toBe('aborted')

    // Start second session with instant runner
    const fastRunner: AgentRunner = {
      supportsFixMode: false,
      supportsMcp: false,
      run: vi.fn().mockResolvedValue({ report: 'second report' })
    }

    const secondId = manager.start(
      2,
      'analyze',
      'proj-2',
      'codex-sdk',
      fastRunner,
      'prompt 2',
      runParams,
      onChunk,
      onCompleted,
      onError
    )
    expect(secondId).not.toBe(firstId)

    // Wait for second runner to complete
    await flushPromises()

    // The completed callback should be called with the second session's id
    expect(onCompleted).toHaveBeenCalledWith(secondId, 'second report', undefined)
    expect(manager.getSession(secondId)?.report).toBe('second report')

    // Resolve the first runner (stale callback) — should be ignored
    resolveFirst({ report: 'stale report' })
    await flushPromises()

    // Session should still show second session data, not stale data
    expect(manager.getSession(secondId)?.id).toBe(secondId)
    expect(manager.getSession(secondId)?.report).toBe('second report')
    expect(onCompleted).toHaveBeenCalledTimes(1)
  })

  it('caps stored chunks at 500 to prevent unbounded growth', async () => {
    const runner: AgentRunner = {
      supportsFixMode: false,
      supportsMcp: false,
      run: vi.fn(async (params: RunParams) => {
        // Emit 510 chunks
        for (let i = 0; i < 510; i++) {
          params.onChunk({
            sessionId: '',
            type: 'text',
            content: `chunk-${i}`,
            timestamp: new Date().toISOString()
          })
        }
        return { report: 'done' }
      })
    }

    const sessionId = manager.start(
      1,
      'analyze',
      'proj-1',
      'claude-sdk',
      runner,
      'prompt',
      { primaryPath: '/path', mode: 'analyze', apiKey: 'key' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    )

    await flushPromises()

    const session = manager.getSession(sessionId)
    expect(session?.chunks.length).toBeLessThanOrEqual(500)
    // The last chunk should be the most recent one
    expect(session?.chunks[session.chunks.length - 1].content).toBe('chunk-509')
  })

  describe('Multi-session support', () => {
    it('can start multiple sessions up to maxConcurrent', () => {
      const mgr = new SessionManager(3)
      const runner = createMockRunner()
      runner.run = vi.fn(() => new Promise(() => {}))

      const id1 = mgr.start(
        1,
        'analyze',
        'proj-1',
        'claude-sdk',
        runner,
        'p1',
        { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )
      const id2 = mgr.start(
        2,
        'analyze',
        'proj-2',
        'claude-sdk',
        runner,
        'p2',
        { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )
      const id3 = mgr.start(
        3,
        'analyze',
        'proj-3',
        'claude-sdk',
        runner,
        'p3',
        { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )

      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id3).toBeDefined()
      expect(mgr.getRunningCount()).toBe(3)
    })

    it('throws when attempting to start beyond maxConcurrent', () => {
      const mgr = new SessionManager(2)
      const runner = createMockRunner()
      runner.run = vi.fn(() => new Promise(() => {}))

      mgr.start(
        1,
        'analyze',
        'proj-1',
        'claude-sdk',
        runner,
        'p1',
        { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )
      mgr.start(
        2,
        'analyze',
        'proj-2',
        'claude-sdk',
        runner,
        'p2',
        { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )

      expect(() =>
        mgr.start(
          3,
          'analyze',
          'proj-3',
          'claude-sdk',
          runner,
          'p3',
          { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
          vi.fn(),
          vi.fn(),
          vi.fn()
        )
      ).toThrow('Numero massimo di sessioni concorrenti raggiunto')
    })

    it('aborting one session leaves the other running', () => {
      const mgr = new SessionManager(5)
      const runner = createMockRunner()
      runner.run = vi.fn(() => new Promise(() => {}))

      const id1 = mgr.start(
        1,
        'analyze',
        'proj-1',
        'claude-sdk',
        runner,
        'p1',
        { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )
      const id2 = mgr.start(
        2,
        'analyze',
        'proj-2',
        'claude-sdk',
        runner,
        'p2',
        { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )

      mgr.abort(id1)

      expect(mgr.getSession(id1)?.status).toBe('aborted')
      expect(mgr.getSession(id2)?.status).toBe('running')
      expect(mgr.getRunningCount()).toBe(1)
    })

    it('getAllSessions returns all sessions', () => {
      const mgr = new SessionManager(5)
      const runner = createMockRunner()
      runner.run = vi.fn(() => new Promise(() => {}))

      mgr.start(
        1,
        'analyze',
        'proj-1',
        'claude-sdk',
        runner,
        'p1',
        { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )
      mgr.start(
        2,
        'analyze',
        'proj-2',
        'claude-sdk',
        runner,
        'p2',
        { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )

      const all = mgr.getAllSessions()
      expect(all).toHaveLength(2)
      expect(all[0].bugId).not.toBe(all[1].bugId)
    })

    it('getSession by id returns specific session', () => {
      const mgr = new SessionManager(5)
      const runner = createMockRunner()
      runner.run = vi.fn(() => new Promise(() => {}))

      const id1 = mgr.start(
        1,
        'analyze',
        'proj-1',
        'claude-sdk',
        runner,
        'p1',
        { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )
      mgr.start(
        2,
        'analyze',
        'proj-2',
        'claude-sdk',
        runner,
        'p2',
        { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )

      const session = mgr.getSession(id1)
      expect(session?.bugId).toBe(1)
      expect(session?.id).toBe(id1)
    })

    it('getSession without id returns first running (backwards compat)', () => {
      const mgr = new SessionManager(5)
      const runner = createMockRunner()
      runner.run = vi.fn(() => new Promise(() => {}))

      mgr.start(
        1,
        'analyze',
        'proj-1',
        'claude-sdk',
        runner,
        'p1',
        { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )
      mgr.start(
        2,
        'analyze',
        'proj-2',
        'claude-sdk',
        runner,
        'p2',
        { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )

      const session = mgr.getSession()
      expect(session).not.toBeNull()
      expect(session?.status).toBe('running')
    })

    it('restoreSessions loads given sessions into internal map', () => {
      const mgr = new SessionManager(5)
      const sessions = [
        {
          id: 'restored-1',
          bugId: 10,
          mode: 'analyze' as const,
          primaryProjectId: 'p1',
          agentProvider: 'claude-sdk' as const,
          status: 'completed' as const,
          startedAt: '2026-01-01T10:00:00Z',
          completedAt: '2026-01-01T10:05:00Z',
          chunks: [],
          report: 'report1'
        },
        {
          id: 'restored-2',
          bugId: 11,
          mode: 'analyze' as const,
          primaryProjectId: 'p2',
          agentProvider: 'codex-sdk' as const,
          status: 'aborted' as const,
          startedAt: '2026-01-01T11:00:00Z',
          completedAt: '2026-01-01T11:03:00Z',
          chunks: []
        }
      ]

      mgr.restoreSessions(sessions)

      expect(mgr.getSession('restored-1')?.bugId).toBe(10)
      expect(mgr.getSession('restored-2')?.bugId).toBe(11)
      expect(mgr.getAllSessions()).toHaveLength(2)
    })

    it('markStaleAsAborted marks running sessions as aborted', () => {
      const mgr = new SessionManager(5)
      const runner = createMockRunner()
      runner.run = vi.fn(() => new Promise(() => {}))

      const id1 = mgr.start(
        1,
        'analyze',
        'proj-1',
        'claude-sdk',
        runner,
        'p1',
        { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )
      const id2 = mgr.start(
        2,
        'analyze',
        'proj-2',
        'claude-sdk',
        runner,
        'p2',
        { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )

      mgr.markStaleAsAborted()

      expect(mgr.getSession(id1)?.status).toBe('aborted')
      expect(mgr.getSession(id2)?.status).toBe('aborted')
      expect(mgr.getRunningCount()).toBe(0)
    })

    it('setMaxConcurrent updates the limit', () => {
      const mgr = new SessionManager(1)
      const runner = createMockRunner()
      runner.run = vi.fn(() => new Promise(() => {}))

      mgr.start(
        1,
        'analyze',
        'proj-1',
        'claude-sdk',
        runner,
        'p1',
        { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )

      // Cannot start another with limit = 1
      expect(() =>
        mgr.start(
          2,
          'analyze',
          'proj-2',
          'claude-sdk',
          runner,
          'p2',
          { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
          vi.fn(),
          vi.fn(),
          vi.fn()
        )
      ).toThrow()

      // Increase limit
      mgr.setMaxConcurrent(3)

      // Now we can start more
      const id2 = mgr.start(
        2,
        'analyze',
        'proj-2',
        'claude-sdk',
        runner,
        'p2',
        { primaryPath: '/path', mode: 'analyze', apiKey: 'k' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )
      expect(id2).toBeDefined()
      expect(mgr.getRunningCount()).toBe(2)
    })
  })
})
