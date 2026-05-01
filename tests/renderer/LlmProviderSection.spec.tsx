// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LlmProviderSection } from '@renderer/components/settings/LlmProviderSection'
import type { AppSettings } from '@shared/types'

const baseSettings: AppSettings = {
  orgUrl: 'https://dev.azure.com/gversino',
  projectName: 'BugCat',
  queryId: '123e4567-e89b-12d3-a456-426614174000',
  topN: 20,
  chunkSize: 15,
  llmProvider: 'openai',
  apiKey: 'secret-key',
  pat: 'pat-token',
  categories: []
}

describe('LlmProviderSection', () => {
  it('shows api key input for all providers and base url + model for generic', () => {
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
    expect(screen.queryByLabelText('Base URL')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Model')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'generic' } })
    expect(onFieldChange).toHaveBeenCalledWith('llmProvider', 'generic')

    rerender(
      <LlmProviderSection
        settings={{
          ...baseSettings,
          llmProvider: 'generic',
          baseUrl: 'https://api.example.com/v1',
          llmModel: 'my-model'
        }}
        errors={{}}
        touched={{}}
        onFieldChange={onFieldChange}
        onTestConnection={vi.fn().mockResolvedValue(undefined)}
        testResult={null}
        testLoading={false}
      />
    )

    expect(screen.getByLabelText('API Key')).toBeInTheDocument()
    expect(screen.getByLabelText('Base URL')).toHaveValue('https://api.example.com/v1')
    expect(screen.getByLabelText('Model')).toHaveValue('my-model')
  })
})
