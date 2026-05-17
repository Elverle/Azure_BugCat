// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ArchitectureContextSection } from '@renderer/components/settings/ArchitectureContextSection'
import type { AppSettings } from '@shared/types'

const baseSettings: AppSettings = {
  orgUrl: 'https://dev.azure.com/org',
  projectName: 'Proj',
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

describe('ArchitectureContextSection', () => {
  it('passes 0 through to onFieldChange instead of coercing to 1', () => {
    const onFieldChange = vi.fn()

    render(
      <ArchitectureContextSection
        settings={baseSettings}
        errors={{}}
        touched={{}}
        onFieldChange={onFieldChange}
      />
    )

    const input = screen.getByLabelText('Sessioni agente concorrenti')
    fireEvent.change(input, { target: { value: '0' } })

    expect(onFieldChange).toHaveBeenCalledWith('maxConcurrentSessions', 0)
  })

  it('shows error for maxConcurrentSessions when touched', () => {
    render(
      <ArchitectureContextSection
        settings={{ ...baseSettings, maxConcurrentSessions: 0 }}
        errors={{ maxConcurrentSessions: 'Deve essere tra 1 e 5' }}
        touched={{ maxConcurrentSessions: true }}
        onFieldChange={vi.fn()}
      />
    )

    expect(screen.getByText('Deve essere tra 1 e 5')).toBeInTheDocument()
  })

  it('hides error for maxConcurrentSessions when not touched', () => {
    render(
      <ArchitectureContextSection
        settings={{ ...baseSettings, maxConcurrentSessions: 0 }}
        errors={{ maxConcurrentSessions: 'Deve essere tra 1 e 5' }}
        touched={{}}
        onFieldChange={vi.fn()}
      />
    )

    expect(screen.queryByText('Deve essere tra 1 e 5')).not.toBeInTheDocument()
  })
})
