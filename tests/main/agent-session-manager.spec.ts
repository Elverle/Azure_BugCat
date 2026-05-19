import { describe, expect, it, vi, beforeEach } from 'vitest'
import { SessionManager } from '@main/agent/session-manager'
import type { AgentRunner, RunParams } from '@main/agent/types'
import type { AgentChunk, AppError } from '@shared/types'

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50))
}

function createMockRunner(
  options: {
    resolveWith?: string
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
      return options.resolveWith ?? 'Test report'
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

  it('start() throws when session already active', () => {
    const runner = createMockRunner({
      onRun: () => new Promise(() => {})
    })
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

    expect(() =>
      manager.start(
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
    ).toThrow('Sessione già in corso')
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
    expect(manager.getSession()?.status).toBe('aborted')
  })

  it('abort() returns false for non-existent session', () => {
    const result = manager.abort('non-existent-id')
    expect(result).toBe(false)
  })

  it('on runner completion: session transitions to completed and calls onCompleted', async () => {
    const runner = createMockRunner({ resolveWith: 'Final report' })
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

    expect(manager.getSession()?.status).toBe('completed')
    expect(manager.getSession()?.report).toBe('Final report')
    expect(onCompleted).toHaveBeenCalledWith(sessionId, 'Final report')
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

    expect(manager.getSession()?.status).toBe('error')
    expect(onError).toHaveBeenCalledWith(
      sessionId,
      expect.objectContaining({ code: 'UNKNOWN_ERROR', message: 'LLM exploded' })
    )
  })

  it('clear() resets state', () => {
    const runner = createMockRunner()
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

    manager.clear()

    expect(manager.getSession()).toBeNull()
    expect(manager.isRunning()).toBe(false)
  })

  it('ignores stale callbacks after abort and restart', async () => {
    // Start first session with a slow runner that we control
    let resolveFirst!: (v: string) => void
    const slowRunner: AgentRunner = {
      supportsFixMode: false,
      supportsMcp: false,
      run: vi.fn().mockImplementation(
        () =>
          new Promise<string>((resolve) => {
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
    expect(manager.getSession()?.status).toBe('aborted')

    // Start second session with instant runner
    const fastRunner: AgentRunner = {
      supportsFixMode: false,
      supportsMcp: false,
      run: vi.fn().mockResolvedValue('second report')
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
    expect(onCompleted).toHaveBeenCalledWith(secondId, 'second report')
    expect(manager.getSession()?.report).toBe('second report')

    // Resolve the first runner (stale callback) — should be ignored
    resolveFirst('stale report')
    await flushPromises()

    // Session should still show second session data, not stale data
    expect(manager.getSession()?.id).toBe(secondId)
    expect(manager.getSession()?.report).toBe('second report')
    expect(onCompleted).toHaveBeenCalledTimes(1)
  })

  it('caps stored chunks at 500 to prevent unbounded growth', async () => {
    let capturedOnChunk!: (chunk: AgentChunk) => void
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
        return 'done'
      })
    }

    manager.start(
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

    const session = manager.getSession()
    expect(session?.chunks.length).toBeLessThanOrEqual(500)
    // The last chunk should be the most recent one
    expect(session?.chunks[session.chunks.length - 1].content).toBe('chunk-509')
  })
})
