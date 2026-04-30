// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LlmProviderSection } from '@renderer/components/settings/LlmProviderSection'
import type { AppSettings } from '@shared/types'

const baseSettings: AppSettings = {
  orgUrl: 'https://dev.azure.com/alpitour',
  projectName: 'BugCat',
  queryId: '123e4567-e89b-12d3-a456-426614174000',
  topN: 20,
  chunkSize: 15,
  llmProvider: 'openai',
  apiKey: 'secret-key',
  pat: 'pat-token',
  categories: [],
  copilotAuthStatus: 'authenticated'
}

describe('LlmProviderSection', () => {
  it('shows api key input for non-copilot providers and badge for copilot', () => {
    const onFieldChange = vi.fn()
    const { rerender } = render(
      <LlmProviderSection
        settings={baseSettings}
        errors={{}}
        touched={{}}
        onFieldChange={onFieldChange}
        onTestConnection={vi.fn().mockResolvedValue(undefined)}
        testResult={null}
        testLoading={false}
      />
    )

    expect(screen.getByLabelText('OpenAI API Key')).toHaveValue('secret-key')
    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'github-copilot' } })
    expect(onFieldChange).toHaveBeenCalledWith('llmProvider', 'github-copilot')

    rerender(
      <LlmProviderSection
        settings={{ ...baseSettings, llmProvider: 'github-copilot' }}
        errors={{}}
        touched={{}}
        onFieldChange={onFieldChange}
        onTestConnection={vi.fn().mockResolvedValue(undefined)}
        testResult={null}
        testLoading={false}
      />
    )

    expect(screen.queryByLabelText('OpenAI API Key')).not.toBeInTheDocument()
    expect(screen.getByText('Authenticated')).toBeInTheDocument()
    expect(screen.getByText('GitHub Copilot uses your GitHub session. No API key needed.')).toBeInTheDocument()

    rerender(
      <LlmProviderSection
        settings={baseSettings}
        errors={{}}
        touched={{}}
        onFieldChange={onFieldChange}
        onTestConnection={vi.fn().mockResolvedValue(undefined)}
        testResult={null}
        testLoading={false}
      />
    )

    expect(screen.getByLabelText('OpenAI API Key')).toHaveValue('secret-key')
  })
})