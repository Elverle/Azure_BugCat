// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AdoConnectionSection } from '@renderer/components/settings/AdoConnectionSection'
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

function renderSection(
  settings: AppSettings = baseSettings,
  overrides: { onClearSecret?: ReturnType<typeof vi.fn> } = {}
): { onFieldChange: ReturnType<typeof vi.fn>; onClearSecret: ReturnType<typeof vi.fn> } {
  const onFieldChange = vi.fn()
  const onClearSecret = overrides.onClearSecret ?? vi.fn()
  render(
    <AdoConnectionSection
      settings={settings}
      errors={{}}
      touched={{}}
      onFieldChange={onFieldChange}
      onClearSecret={onClearSecret}
      onTestConnection={vi.fn().mockResolvedValue(undefined)}
      testResult={null}
      testLoading={false}
    />
  )
  return { onFieldChange, onClearSecret }
}

describe('AdoConnectionSection', () => {
  it('reports a cleared Top N as NaN instead of coercing it to zero', () => {
    const { onFieldChange } = renderSection()

    fireEvent.change(screen.getByLabelText('Top N Bugs'), { target: { value: '' } })

    expect(onFieldChange).toHaveBeenCalledWith('topN', Number.NaN)
  })

  it('leaves the Top N field empty when the value is not a number', () => {
    renderSection({ ...baseSettings, topN: Number.NaN })

    expect(screen.getByLabelText('Top N Bugs')).toHaveValue(null)
  })

  it('still reports a typed Top N as a number', () => {
    const { onFieldChange } = renderSection()

    fireEvent.change(screen.getByLabelText('Top N Bugs'), { target: { value: '50' } })

    expect(onFieldChange).toHaveBeenCalledWith('topN', 50)
  })

  it('reports a fractional Top N as-is instead of silently truncating it (FIX 7)', () => {
    const { onFieldChange } = renderSection()

    fireEvent.change(screen.getByLabelText('Top N Bugs'), { target: { value: '1.9' } })

    expect(onFieldChange).toHaveBeenCalledWith('topN', 1.9)
  })

  it('reports an exponent-notation Top N at its real value instead of parseInt truncating it to 1 (FIX 7)', () => {
    const { onFieldChange } = renderSection()

    fireEvent.change(screen.getByLabelText('Top N Bugs'), { target: { value: '1e5' } })

    expect(onFieldChange).toHaveBeenCalledWith('topN', 100000)
  })

  it('shows the PAT as stored instead of rendering the machine value', () => {
    renderSection({ ...baseSettings, pat: SECRET_PLACEHOLDER })

    const patInput = screen.getByLabelText('PAT')
    expect(patInput).toHaveValue('')
    expect(screen.getByText(/token stored/i)).toBeInTheDocument()
    expect(screen.queryByDisplayValue(SECRET_PLACEHOLDER)).not.toBeInTheDocument()

    // The disabled input is described by the "Token stored" status text, so a
    // screen reader reaching it by Tab (which skips the non-focusable span)
    // still announces why it's disabled and empty.
    const describedById = patInput.getAttribute('aria-describedby')
    expect(describedById).toBeTruthy()
    expect(document.getElementById(describedById!)).toHaveTextContent(/token stored/i)
  })

  it('lets the user replace a stored token', () => {
    // Queried by its accessible name, not a loose "replace" regex: this section
    // and LlmProviderSection each render a "Replace" button, and without a
    // distinguishing aria-label a screen reader announces both identically.
    const { onClearSecret } = renderSection({ ...baseSettings, pat: SECRET_PLACEHOLDER })

    fireEvent.click(screen.getByRole('button', { name: 'Replace PAT' }))

    expect(onClearSecret).toHaveBeenCalledWith('pat')
  })
})
