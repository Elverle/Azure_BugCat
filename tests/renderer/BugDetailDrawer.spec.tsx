// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CategorizedBug } from '@shared/types'
import BugDetailDrawer from '@renderer/components/dashboard/BugDetailDrawer'

function makeBug(overrides: Partial<CategorizedBug> = {}): CategorizedBug {
  return {
    id: 1024,
    title: 'OAuth login fails intermittently on Safari',
    state: 'Active',
    assignee: 'Laura K.',
    areaPath: 'ECommerce\\Frontend\\Auth',
    description: 'Users report redirect loop on Safari when using Microsoft Account login.',
    priority: 2,
    createdDate: '2026-01-15T10:00:00Z',
    updatedDate: '2026-01-20T14:30:00Z',
    tags: ['OAuth', 'Safari'],
    macroCategory: 'Authentication',
    subCategory: 'OAuth',
    categoryReason: 'The description mentions MSAL token exchange failure and Safari ITP.',
    categorizedAt: '2026-01-20T15:00:00Z',
    ...overrides
  }
}

const defaultProps = {
  bug: makeBug(),
  isOpen: true,
  onClose: vi.fn(),
  onPrev: vi.fn(),
  onNext: vi.fn(),
  hasPrev: true,
  hasNext: true,
  onViewInAdo: vi.fn(),
  adoLinkEnabled: true
}

describe('BugDetailDrawer', () => {
  it('renders all fields for a categorized bug', () => {
    render(<BugDetailDrawer {...defaultProps} />)

    expect(screen.getByText('#1024')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('OAuth login fails intermittently on Safari')).toBeInTheDocument()
    expect(screen.getByText('Authentication')).toBeInTheDocument()
    expect(screen.getByText('OAuth')).toBeInTheDocument()
    expect(screen.getByText(/MSAL token exchange failure/)).toBeInTheDocument()
    expect(screen.getByText('Laura K.')).toBeInTheDocument()
    expect(screen.getByText('ECommerce\\Frontend\\Auth')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('OAuth, Safari')).toBeInTheDocument()
  })

  it('shows "Non ancora categorizzato" for uncategorized bug', () => {
    const uncategorized = makeBug({ macroCategory: '', subCategory: '', categoryReason: '' })
    render(<BugDetailDrawer {...defaultProps} bug={uncategorized} />)

    expect(screen.getByText('Non ancora categorizzato')).toBeInTheDocument()
    expect(screen.queryByText('Authentication')).not.toBeInTheDocument()
  })

  it('shows "Nessuna descrizione disponibile" for empty description', () => {
    const noDesc = makeBug({ description: '' })
    render(<BugDetailDrawer {...defaultProps} bug={noDesc} />)

    expect(screen.getByText('Nessuna descrizione disponibile')).toBeInTheDocument()
  })

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn()
    render(<BugDetailDrawer {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Chiudi dettaglio' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<BugDetailDrawer {...defaultProps} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onPrev when prev button is clicked', () => {
    const onPrev = vi.fn()
    render(<BugDetailDrawer {...defaultProps} onPrev={onPrev} />)

    fireEvent.click(screen.getByRole('button', { name: 'Bug precedente' }))
    expect(onPrev).toHaveBeenCalledTimes(1)
  })

  it('calls onNext when next button is clicked', () => {
    const onNext = vi.fn()
    render(<BugDetailDrawer {...defaultProps} onNext={onNext} />)

    fireEvent.click(screen.getByRole('button', { name: 'Bug successivo' }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('disables prev button when hasPrev is false', () => {
    render(<BugDetailDrawer {...defaultProps} hasPrev={false} />)

    expect(screen.getByRole('button', { name: 'Bug precedente' })).toBeDisabled()
  })

  it('disables next button when hasNext is false', () => {
    render(<BugDetailDrawer {...defaultProps} hasNext={false} />)

    expect(screen.getByRole('button', { name: 'Bug successivo' })).toBeDisabled()
  })

  it('renders tags correctly', () => {
    render(<BugDetailDrawer {...defaultProps} />)
    expect(screen.getByText('OAuth, Safari')).toBeInTheDocument()
  })

  it('shows dash for empty tags', () => {
    const noTags = makeBug({ tags: [] })
    render(<BugDetailDrawer {...defaultProps} bug={noTags} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('disables "View in Azure DevOps" when adoLinkEnabled is false', () => {
    render(<BugDetailDrawer {...defaultProps} adoLinkEnabled={false} />)

    const adoButton = screen.getByText(/View in Azure DevOps/)
    expect(adoButton).toBeDisabled()
  })

  it('does not render content when bug is null', () => {
    render(<BugDetailDrawer {...defaultProps} bug={null} />)
    expect(screen.queryByText('#1024')).not.toBeInTheDocument()
  })

  it('applies translate-x-full when not open', () => {
    const { container } = render(<BugDetailDrawer {...defaultProps} isOpen={false} />)
    const drawer = container.firstElementChild as HTMLElement
    expect(drawer.className).toContain('translate-x-full')
  })

  it('applies translate-x-0 when open', () => {
    const { container } = render(<BugDetailDrawer {...defaultProps} isOpen={true} />)
    const drawer = container.firstElementChild as HTMLElement
    expect(drawer.className).toContain('translate-x-0')
  })
})
