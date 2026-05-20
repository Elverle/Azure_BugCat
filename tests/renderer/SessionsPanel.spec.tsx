// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SessionsPanel } from '@renderer/components/dashboard/SessionsPanel'
import type { AgentSession } from '@shared/types'

function makeSession(overrides: Partial<AgentSession> = {}): AgentSession {
  return {
    id: 'session-1',
    bugId: 123,
    mode: 'analyze',
    primaryProjectId: 'proj-1',
    agentProvider: 'claude-sdk',
    status: 'running',
    startedAt: '2026-01-01T10:00:00Z',
    chunks: [],
    ...overrides
  }
}

describe('SessionsPanel', () => {
  it('renders empty state when session is null', () => {
    render(<SessionsPanel session={null} mcpStatus={null} onAbort={vi.fn()} />)
    expect(screen.getByText('Nessuna sessione attiva')).toBeInTheDocument()
  })

  it('renders running state with abort button', () => {
    render(<SessionsPanel session={makeSession()} mcpStatus={null} onAbort={vi.fn()} />)
    expect(screen.getByText('In corso')).toBeInTheDocument()
    expect(screen.getByText('Interrompi')).toBeInTheDocument()
  })

  it('renders completed state with report', () => {
    render(
      <SessionsPanel
        session={makeSession({
          status: 'completed',
          completedAt: '2026-01-01T10:05:00Z',
          report: 'Root cause found in module X',
          usage: {
            inputTokens: 120,
            outputTokens: 30,
            totalTokens: 150,
            model: 'claude-sonnet-4.5'
          }
        })}
        mcpStatus={null}
        onAbort={vi.fn()}
      />
    )
    expect(screen.getByText('Completata')).toBeInTheDocument()
    expect(screen.getByText('Root cause found in module X')).toBeInTheDocument()
    expect(screen.getByText('Statistiche')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('claude-sonnet-4.5')).toBeInTheDocument()
  })

  it('renders fallback text when usage metrics are not available', () => {
    render(
      <SessionsPanel
        session={makeSession({
          status: 'aborted',
          completedAt: '2026-01-01T10:03:00Z'
        })}
        mcpStatus={null}
        onAbort={vi.fn()}
      />
    )

    expect(
      screen.getByText('Metriche token non disponibili per questa sessione.')
    ).toBeInTheDocument()
  })

  it('renders aborted state with badge', () => {
    render(
      <SessionsPanel
        session={makeSession({
          status: 'aborted',
          completedAt: '2026-01-01T10:03:00Z'
        })}
        mcpStatus={null}
        onAbort={vi.fn()}
      />
    )
    expect(screen.getByText('Interrotta')).toBeInTheDocument()
  })

  it('renders error state with error message', () => {
    render(
      <SessionsPanel
        session={makeSession({
          status: 'error',
          completedAt: '2026-01-01T10:02:00Z',
          error: { code: 'UNKNOWN_ERROR', message: 'LLM timeout occurred' }
        })}
        mcpStatus={null}
        onAbort={vi.fn()}
      />
    )
    expect(screen.getByText('Errore')).toBeInTheDocument()
    expect(screen.getByText('LLM timeout occurred')).toBeInTheDocument()
  })

  it('shows streaming chunks in the log', () => {
    const session = makeSession({
      chunks: [
        {
          sessionId: 'session-1',
          type: 'text',
          content: 'Analyzing code...',
          timestamp: '2026-01-01T10:00:01Z'
        },
        {
          sessionId: 'session-1',
          type: 'tool_use',
          content: 'read_file src/main.ts',
          timestamp: '2026-01-01T10:00:02Z',
          toolName: 'read_file'
        }
      ]
    })

    render(<SessionsPanel session={session} mcpStatus={null} onAbort={vi.fn()} />)
    expect(screen.getByText('Analyzing code...')).toBeInTheDocument()
    expect(screen.getByText('→ read_file')).toBeInTheDocument()
    expect(screen.getByText('(2 eventi)')).toBeInTheDocument()
  })

  it('abort button calls onAbort', () => {
    const onAbort = vi.fn()
    render(<SessionsPanel session={makeSession()} mcpStatus={null} onAbort={onAbort} />)

    fireEvent.click(screen.getByText('Interrompi'))
    expect(onAbort).toHaveBeenCalledTimes(1)
  })
})
