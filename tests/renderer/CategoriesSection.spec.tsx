// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CategoriesSection } from '@renderer/components/settings/CategoriesSection'

describe('CategoriesSection', () => {
  it('normalizes categories on blur and exposes the info note', () => {
    const onCategoriesChange = vi.fn()

    render(
      <CategoriesSection
        categories={['UI']}
        onCategoriesChange={onCategoriesChange}
        onReset={vi.fn()}
        categoriesToText={(categories) => categories.join('\n')}
        textToCategories={(text) =>
          Array.from(new Set(text.split('\n').map((line) => line.trim()).filter(Boolean)))
        }
      />
    )

    const textarea = screen.getByLabelText('Categories (one per line)')
    fireEvent.change(textarea, { target: { value: 'UI\nBackend\n\nUI\nAPI' } })
    fireEvent.blur(textarea)

    expect(onCategoriesChange).toHaveBeenCalledWith(['UI', 'Backend', 'API'])
    expect(
      screen.getByText('When categories are empty, the LLM will auto-generate categories based on the bugs.')
    ).toBeInTheDocument()
  })

  it('resets categories only after confirmation', () => {
    const onReset = vi.fn()
    const confirmSpy = vi.spyOn(window, 'confirm')

    render(
      <CategoriesSection
        categories={['UI']}
        onCategoriesChange={vi.fn()}
        onReset={onReset}
        categoriesToText={(categories) => categories.join('\n')}
        textToCategories={(text) => text.split('\n').filter(Boolean)}
      />
    )

    confirmSpy.mockReturnValueOnce(false)
    fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }))
    expect(onReset).not.toHaveBeenCalled()

    confirmSpy.mockReturnValueOnce(true)
    fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})