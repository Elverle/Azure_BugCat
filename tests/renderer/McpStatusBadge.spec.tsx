// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SessionsPanel } from '@renderer/components/dashboard/SessionsPanel'
import type { AgentSession, McpStatus } from '@shared/types'

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

describe('McpStatusBadge (via SessionsPanel)', () => {
  it('shows no MCP badge when mcpStatus is null', () => {
    render(<SessionsPanel session={makeSession()} mcpStatus={null} onAbort={vi.fn()} />)
    expect(screen.queryByText('MCP')).not.toBeInTheDocument()
    expect(screen.queryByText('Fallback')).not.toBeInTheDocument()
  })

  it('shows "MCP" badge when mcpStatus.available is true', () => {
    const mcpStatus: McpStatus = { available: true }
    render(<SessionsPanel session={makeSession()} mcpStatus={mcpStatus} onAbort={vi.fn()} />)
    expect(screen.getByText('MCP')).toBeInTheDocument()
  })

  it('shows "Fallback" badge when mcpStatus.available is false', () => {
    const mcpStatus: McpStatus = { available: false, reason: 'Binary not found' }
    render(<SessionsPanel session={makeSession()} mcpStatus={mcpStatus} onAbort={vi.fn()} />)
    const badge = screen.getByText('Fallback')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('title', 'Binary not found')
  })

  it('shows no badge when session is null (entire panel shows empty state)', () => {
    const mcpStatus: McpStatus = { available: true }
    render(<SessionsPanel session={null} mcpStatus={mcpStatus} onAbort={vi.fn()} />)
    expect(screen.queryByText('MCP')).not.toBeInTheDocument()
    expect(screen.queryByText('Fallback')).not.toBeInTheDocument()
    expect(screen.getByText('Nessuna sessione attiva')).toBeInTheDocument()
  })

  it('shows fallback with default title when reason is undefined', () => {
    const mcpStatus: McpStatus = { available: false }
    render(<SessionsPanel session={makeSession()} mcpStatus={mcpStatus} onAbort={vi.fn()} />)
    const badge = screen.getByText('Fallback')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('title', 'MCP non disponibile — analisi con prompt completo')
  })
})
