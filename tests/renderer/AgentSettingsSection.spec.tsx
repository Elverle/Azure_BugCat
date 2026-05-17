// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgentProviderSection } from '@renderer/components/settings/AgentProviderSection'
import type { AppSettings, BinaryCheckResult } from '@shared/types'

const baseSettings: AppSettings = {
  orgUrl: 'https://dev.azure.com/gversino',
  projectName: 'BugCat',
  queryId: '123e4567-e89b-12d3-a456-426614174000',
  topN: 20,
  chunkSize: 15,
  llmProvider: 'openai',
  apiKey: 'sk-test',
  pat: 'pat-token',
  categories: [],
  agentProvider: 'none',
  projects: [],
  architectureContext: '',
  maxConcurrentSessions: 1
}

const defaultProps = {
  settings: baseSettings,
  errors: {},
  touched: {},
  onFieldChange: vi.fn(),
  onCheckBinary: vi.fn().mockResolvedValue(undefined),
  binaryCheckResult: null as BinaryCheckResult | null,
  binaryCheckLoading: false
}

describe('AgentProviderSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Claude Code SDK badge when llmProvider is anthropic', () => {
    render(
      <AgentProviderSection
        {...defaultProps}
        settings={{ ...baseSettings, llmProvider: 'anthropic' }}
      />
    )

    expect(screen.getByText(/Claude Code SDK/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Provider agente')).not.toBeInTheDocument()
  })

  it('renders Codex CLI badge and check button when llmProvider is openai', () => {
    render(
      <AgentProviderSection
        {...defaultProps}
        settings={{ ...baseSettings, llmProvider: 'openai' }}
      />
    )

    expect(screen.getByText(/Codex CLI/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Verifica installazione CLI/ })).toBeInTheDocument()
  })

  it('renders dropdown with agent provider options when llmProvider is gemini', () => {
    render(
      <AgentProviderSection
        {...defaultProps}
        settings={{ ...baseSettings, llmProvider: 'gemini', agentProvider: 'none' }}
      />
    )

    const select = screen.getByLabelText('Provider agente')
    expect(select).toBeInTheDocument()
    expect(select).toHaveValue('none')
  })

  it('shows BYOK section when agentProvider is copilot-sdk', () => {
    render(
      <AgentProviderSection
        {...defaultProps}
        settings={{ ...baseSettings, llmProvider: 'gemini', agentProvider: 'copilot-sdk' }}
      />
    )

    expect(screen.getByText(/SDK in public preview/)).toBeInTheDocument()
  })

  it('calls onCheckBinary when CLI check button is clicked', async () => {
    const onCheckBinary = vi.fn().mockResolvedValue(undefined)

    render(
      <AgentProviderSection
        {...defaultProps}
        settings={{ ...baseSettings, llmProvider: 'openai' }}
        onCheckBinary={onCheckBinary}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Verifica installazione CLI/ }))
    expect(onCheckBinary).toHaveBeenCalledTimes(1)
  })
})
