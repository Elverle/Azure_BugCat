// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SessionListPanel } from '@renderer/components/dashboard/SessionListPanel'
import type { AgentSessionSummary, AgentSessionFilter } from '@shared/types'

function makeSummary(overrides: Partial<AgentSessionSummary> = {}): AgentSessionSummary {
  return {
    id: 'session-1',
    bugId: 100,
    mode: 'analyze',
    primaryProjectId: 'proj-1',
    agentProvider: 'claude-sdk',
    status: 'running',
    startedAt: '2026-01-15T10:00:00Z',
    chunkCount: 5,
    ...overrides
  }
}

const defaultProps = {
  sessions: [] as AgentSessionSummary[],
  selectedId: null as string | null,
  onSelect: vi.fn(),
  statusFilter: 'all' as AgentSessionFilter,
  onStatusFilterChange: vi.fn(),
  runningCount: 0,
  maxConcurrentSessions: 5,
  onNewSession: vi.fn()
}

describe('SessionListPanel', () => {
  it('renders sessions with status badges', () => {
    const sessions = [
      makeSummary({ id: 's1', bugId: 101, status: 'running' }),
      makeSummary({ id: 's2', bugId: 102, status: 'completed' }),
      makeSummary({ id: 's3', bugId: 103, status: 'error' })
    ]

    render(<SessionListPanel {...defaultProps} sessions={sessions} />)

    expect(screen.getByText('#101')).toBeInTheDocument()
    expect(screen.getByText('#102')).toBeInTheDocument()
    expect(screen.getByText('#103')).toBeInTheDocument()
  })

  it('filter tabs trigger onStatusFilterChange', () => {
    const onStatusFilterChange = vi.fn()

    render(
      <SessionListPanel
        {...defaultProps}
        sessions={[makeSummary()]}
        onStatusFilterChange={onStatusFilterChange}
      />
    )

    const completedTab = screen.getByText('Completate')
    fireEvent.click(completedTab)

    expect(onStatusFilterChange).toHaveBeenCalledWith('completed')
  })

  it('selection callback fires on session click', () => {
    const onSelect = vi.fn()
    const sessions = [makeSummary({ id: 'click-me', bugId: 200 })]

    render(<SessionListPanel {...defaultProps} sessions={sessions} onSelect={onSelect} />)

    fireEvent.click(screen.getByText('#200'))

    expect(onSelect).toHaveBeenCalledWith('click-me')
  })

  it('new session button is disabled at capacity', () => {
    render(<SessionListPanel {...defaultProps} runningCount={5} maxConcurrentSessions={5} />)

    const newButton = screen.getByText('Nuova')
    expect(newButton).toBeDisabled()
  })

  it('renders empty state when no sessions', () => {
    render(<SessionListPanel {...defaultProps} sessions={[]} />)

    expect(screen.getByText('Nessuna sessione')).toBeInTheDocument()
  })
})
