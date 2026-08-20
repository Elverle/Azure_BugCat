// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LlmProviderSection } from '@renderer/components/settings/LlmProviderSection'
import type { AppSettings } from '@shared/types'
import { SECRET_PLACEHOLDER } from '@shared/secrets'

const baseSettings: AppSettings = {
  orgUrl: 'https://dev.azure.com/contoso',
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
  it('shows the model field for all providers and base url only for generic', () => {
    const onFieldChange = vi.fn()
    const { rerender } = render(
      <LlmProviderSection
        settings={baseSettings}
        errors={{}}
        touched={{}}
        onFieldChange={onFieldChange}
        onClearSecret={vi.fn()}
        onTestConnection={vi.fn().mockResolvedValue(undefined)}
        testResult={null}
        testLoading={false}
      />
    )

    expect(screen.getByLabelText('OpenAI API Key')).toHaveValue('secret-key')
    expect(screen.queryByLabelText('Base URL')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Model')).toBeInTheDocument()
    expect(screen.getByLabelText('Model')).toHaveAttribute('placeholder', 'gpt-4.1-mini')

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
        onClearSecret={vi.fn()}
        onTestConnection={vi.fn().mockResolvedValue(undefined)}
        testResult={null}
        testLoading={false}
      />
    )

    expect(screen.getByLabelText('API Key')).toBeInTheDocument()
    expect(screen.getByLabelText('Base URL')).toHaveValue('https://api.example.com/v1')
    expect(screen.getByLabelText('Model')).toHaveValue('my-model')
  })

  it('updates the model placeholder when the provider changes', () => {
    const onFieldChange = vi.fn()
    const { rerender } = render(
      <LlmProviderSection
        settings={baseSettings}
        errors={{}}
        touched={{}}
        onFieldChange={onFieldChange}
        onClearSecret={vi.fn()}
        onTestConnection={vi.fn().mockResolvedValue(undefined)}
        testResult={null}
        testLoading={false}
      />
    )

    expect(screen.getByLabelText('Model')).toHaveAttribute('placeholder', 'gpt-4.1-mini')

    rerender(
      <LlmProviderSection
        settings={{ ...baseSettings, llmProvider: 'anthropic' }}
        errors={{}}
        touched={{}}
        onFieldChange={onFieldChange}
        onClearSecret={vi.fn()}
        onTestConnection={vi.fn().mockResolvedValue(undefined)}
        testResult={null}
        testLoading={false}
      />
    )

    expect(screen.getByLabelText('Model')).toHaveAttribute('placeholder', 'claude-sonnet-4.6')
  })

  it('reports a cleared Chunk Size as NaN instead of coercing it to zero', () => {
    const onFieldChange = vi.fn()
    render(
      <LlmProviderSection
        settings={baseSettings}
        errors={{}}
        touched={{}}
        onFieldChange={onFieldChange}
        onClearSecret={vi.fn()}
        onTestConnection={vi.fn().mockResolvedValue(undefined)}
        testResult={null}
        testLoading={false}
      />
    )

    fireEvent.change(screen.getByLabelText('Chunk Size'), { target: { value: '' } })

    expect(onFieldChange).toHaveBeenCalledWith('chunkSize', Number.NaN)
  })

  it('leaves the Chunk Size field empty when the value is not a number', () => {
    render(
      <LlmProviderSection
        settings={{ ...baseSettings, chunkSize: Number.NaN }}
        errors={{}}
        touched={{}}
        onFieldChange={vi.fn()}
        onClearSecret={vi.fn()}
        onTestConnection={vi.fn().mockResolvedValue(undefined)}
        testResult={null}
        testLoading={false}
      />
    )

    expect(screen.getByLabelText('Chunk Size')).toHaveValue(null)
  })

  it('reports a fractional Chunk Size as-is instead of silently truncating it (FIX 7)', () => {
    const onFieldChange = vi.fn()
    render(
      <LlmProviderSection
        settings={baseSettings}
        errors={{}}
        touched={{}}
        onFieldChange={onFieldChange}
        onClearSecret={vi.fn()}
        onTestConnection={vi.fn().mockResolvedValue(undefined)}
        testResult={null}
        testLoading={false}
      />
    )

    fireEvent.change(screen.getByLabelText('Chunk Size'), { target: { value: '1.9' } })

    expect(onFieldChange).toHaveBeenCalledWith('chunkSize', 1.9)
  })

  it('reports an exponent-notation Chunk Size at its real value instead of parseInt truncating it to 1 (FIX 7)', () => {
    const onFieldChange = vi.fn()
    render(
      <LlmProviderSection
        settings={baseSettings}
        errors={{}}
        touched={{}}
        onFieldChange={onFieldChange}
        onClearSecret={vi.fn()}
        onTestConnection={vi.fn().mockResolvedValue(undefined)}
        testResult={null}
        testLoading={false}
      />
    )

    fireEvent.change(screen.getByLabelText('Chunk Size'), { target: { value: '1e5' } })

    expect(onFieldChange).toHaveBeenCalledWith('chunkSize', 100000)
  })

  it('shows the API key as stored instead of rendering the machine value', () => {
    render(
      <LlmProviderSection
        settings={{ ...baseSettings, apiKey: SECRET_PLACEHOLDER }}
        errors={{}}
        touched={{}}
        onFieldChange={vi.fn()}
        onClearSecret={vi.fn()}
        onTestConnection={vi.fn().mockResolvedValue(undefined)}
        testResult={null}
        testLoading={false}
      />
    )

    expect(screen.getByLabelText('OpenAI API Key')).toHaveValue('')
    expect(screen.getByText(/api key stored/i)).toBeInTheDocument()
    expect(screen.queryByDisplayValue(SECRET_PLACEHOLDER)).not.toBeInTheDocument()
  })

  it('lets the user replace a stored API key', () => {
    const onClearSecret = vi.fn()
    render(
      <LlmProviderSection
        settings={{ ...baseSettings, apiKey: SECRET_PLACEHOLDER }}
        errors={{}}
        touched={{}}
        onFieldChange={vi.fn()}
        onClearSecret={onClearSecret}
        onTestConnection={vi.fn().mockResolvedValue(undefined)}
        testResult={null}
        testLoading={false}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /replace/i }))

    expect(onClearSecret).toHaveBeenCalledWith('apiKey')
  })
})
