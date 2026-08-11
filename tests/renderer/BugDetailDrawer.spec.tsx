// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CategorizedBug } from '@shared/types'
import BugDetailDrawer from '@renderer/components/dashboard/BugDetailDrawer'

const { sanitizeCalls, stripCalls } = vi.hoisted(() => ({
  sanitizeCalls: vi.fn(),
  stripCalls: vi.fn()
}))

// Counts the real work without replacing it: the drawer must keep rendering the
// same markup, it just must not redo the parse on every unrelated re-render.
vi.mock('@renderer/lib/sanitize-bug-description-html', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@renderer/lib/sanitize-bug-description-html')>()
  return {
    ...actual,
    sanitizeBugDescriptionHtml: (html?: string): string => {
      sanitizeCalls(html)
      return actual.sanitizeBugDescriptionHtml(html)
    },
    stripAdoAttachmentImages: (html: string): string => {
      stripCalls(html)
      return actual.stripAdoAttachmentImages(html)
    }
  }
})

Object.defineProperty(window, 'electronAPI', {
  configurable: true,
  writable: true,
  value: {
    fetchAdoAttachmentDataUrl: vi.fn(async (url: string) => `data:image/png;base64,${btoa(url)}`)
  }
})

function makeBug(overrides: Partial<CategorizedBug> = {}): CategorizedBug {
  return {
    id: 1024,
    title: 'OAuth login fails intermittently on Safari',
    state: 'Active',
    assignee: 'Laura K.',
    areaPath: 'ECommerce\\Frontend\\Auth',
    description: 'Users report redirect loop on Safari when using Microsoft Account login.',
    descriptionHtml:
      '<p>Users report redirect loop on Safari when using Microsoft Account login.</p>',
    priority: 2,
    createdDate: '2026-01-15T10:00:00Z',
    updatedDate: '2026-01-20T14:30:00Z',
    tags: ['OAuth', 'Safari'],
    macroCategory: 'Authentication',
    technicalLayer: 'OAuth',
    categoryReason: 'The description mentions MSAL token exchange failure and Safari ITP.',
    categorizedAt: '2026-01-20T15:00:00Z',
    ...overrides
  }
}

const defaultProps = {
  bug: makeBug(),
  isOpen: true,
  width: 400,
  minWidth: 400,
  maxWidth: 760,
  onResize: vi.fn(),
  onClose: vi.fn(),
  onPrev: vi.fn(),
  onNext: vi.fn(),
  hasPrev: true,
  hasNext: true,
  onViewInAdo: vi.fn(),
  adoLinkEnabled: true
}

describe('BugDetailDrawer', () => {
  beforeEach(() => {
    window.electronAPI.fetchAdoAttachmentDataUrl = vi.fn(
      async (url: string) => `data:image/png;base64,${btoa(url)}`
    )
  })

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
    const uncategorized = makeBug({ macroCategory: '', technicalLayer: '', categoryReason: '' })
    render(<BugDetailDrawer {...defaultProps} bug={uncategorized} />)

    expect(screen.getByText('Non ancora categorizzato')).toBeInTheDocument()
    expect(screen.queryByText('Authentication')).not.toBeInTheDocument()
  })

  it('shows "Nessuna descrizione disponibile" for empty description', () => {
    const noDesc = makeBug({ description: '', descriptionHtml: '' })
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

  it('resizes the drawer while dragging the left border handle', () => {
    const onResize = vi.fn()
    render(<BugDetailDrawer {...defaultProps} onResize={onResize} width={400} />)

    fireEvent.mouseDown(screen.getByRole('separator', { name: 'Ridimensiona dettaglio' }), {
      clientX: 800
    })
    fireEvent.mouseMove(document, { clientX: 700 })
    fireEvent.mouseUp(document)

    expect(onResize).toHaveBeenCalledWith(500)
  })

  it('clamps resize drag values to the configured bounds', () => {
    const onResize = vi.fn()
    render(<BugDetailDrawer {...defaultProps} onResize={onResize} width={400} />)

    fireEvent.mouseDown(screen.getByRole('separator', { name: 'Ridimensiona dettaglio' }), {
      clientX: 800
    })
    fireEvent.mouseMove(document, { clientX: 100 })
    fireEvent.mouseMove(document, { clientX: 900 })
    fireEvent.mouseUp(document)

    expect(onResize).toHaveBeenNthCalledWith(1, 760)
    expect(onResize).toHaveBeenNthCalledWith(2, 400)
  })

  it('toggles the description between collapsed and expanded states', () => {
    render(<BugDetailDrawer {...defaultProps} />)

    const toggleButton = screen.getByRole('button', { name: 'Espandi descrizione' })
    const description = screen
      .getByText('Users report redirect loop on Safari when using Microsoft Account login.')
      .closest('div[class*="prose"]')

    expect(description).not.toBeNull()
    expect(description?.className).toContain('max-h-64')
    fireEvent.click(toggleButton)

    expect(screen.getByRole('button', { name: 'Riduci descrizione' })).toBeInTheDocument()
    expect(description?.className).not.toContain('max-h-64')
  })

  it('collapses the description again when the drawer switches to another bug', () => {
    const { rerender } = render(<BugDetailDrawer {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Espandi descrizione' }))
    expect(screen.getByRole('button', { name: 'Riduci descrizione' })).toBeInTheDocument()

    rerender(<BugDetailDrawer {...defaultProps} bug={makeBug({ id: 2048 })} />)

    expect(screen.getByRole('button', { name: 'Espandi descrizione' })).toBeInTheDocument()
  })

  it('renders images from the HTML description', async () => {
    render(
      <BugDetailDrawer
        {...defaultProps}
        bug={makeBug({
          description: 'Passaggi riprodotti con screenshot allegato.',
          descriptionHtml:
            '<p>Passaggi riprodotti con screenshot allegato.</p><img src="https://dev.azure.com/example/834b6bb6-7aa6-4920-95f9-940c95460830/_apis/wit/attachments/screenshot-id?fileName=image.png" alt="Screenshot errore" />'
        })}
      />
    )

    await waitFor(() => {
      const image = screen.getByRole('img', { name: 'Screenshot errore' })
      expect(image.getAttribute('src')).toMatch(/^data:image\/png;base64,/) 
    })
    expect(window.electronAPI.fetchAdoAttachmentDataUrl).toHaveBeenCalledWith(
      'https://dev.azure.com/example/834b6bb6-7aa6-4920-95f9-940c95460830/_apis/wit/attachments/screenshot-id?fileName=image.png'
    )
  })

  it('strips unsafe content from the HTML description', () => {
    const { container } = render(
      <BugDetailDrawer
        {...defaultProps}
        bug={makeBug({
          description: 'Descrizione con markup HTML.',
          descriptionHtml:
            '<p>Descrizione con markup HTML.</p><script>window.__xss = true</script><img src="javascript:alert(1)" alt="Blocked" />'
        })}
      />
    )

    expect(screen.getByText('Descrizione con markup HTML.')).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders HTML-only descriptions when plain text is empty', async () => {
    render(
      <BugDetailDrawer
        {...defaultProps}
        bug={makeBug({
          description: '',
          descriptionHtml:
            '<p><img src="https://dev.azure.com/example/834b6bb6-7aa6-4920-95f9-940c95460830/_apis/wit/attachments/screenshot-id?fileName=image.png" alt="Only screenshot" /></p>'
        })}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Only screenshot' })).toBeInTheDocument()
    })
    expect(screen.queryByText('Nessuna descrizione disponibile')).not.toBeInTheDocument()
  })

  it('does not show ADO image alt text while the authenticated image is being resolved', () => {
    window.electronAPI.fetchAdoAttachmentDataUrl = vi.fn(
      () => new Promise<string>(() => undefined)
    )

    render(
      <BugDetailDrawer
        {...defaultProps}
        bug={makeBug({
          description: 'Descrizione con attachment.',
          descriptionHtml:
            '<p>Descrizione con attachment.</p><img src="https://dev.azure.com/example/834b6bb6-7aa6-4920-95f9-940c95460830/_apis/wit/attachments/screenshot-id?fileName=image.png" alt="Image" />'
        })}
      />
    )

    expect(screen.queryByText('Image')).not.toBeInTheDocument()
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

  it('applies the requested drawer width through inline style', () => {
    const { container } = render(<BugDetailDrawer {...defaultProps} width={520} />)
    const drawer = container.firstElementChild as HTMLElement
    expect(drawer.style.width).toBe('520px')
  })

  it('shows a dash in the Priority field when the bug has no priority', () => {
    render(<BugDetailDrawer {...defaultProps} bug={makeBug({ priority: null })} />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('does not re-sanitize the description when only the width changes', () => {
    sanitizeCalls.mockClear()
    const { rerender } = render(<BugDetailDrawer {...defaultProps} width={400} />)
    const afterMount = sanitizeCalls.mock.calls.length

    rerender(<BugDetailDrawer {...defaultProps} width={500} />)
    rerender(<BugDetailDrawer {...defaultProps} width={600} />)

    expect(sanitizeCalls.mock.calls.length).toBe(afterMount)
  })

  it('does not re-strip attachment images when only the width changes', () => {
    stripCalls.mockClear()
    const { rerender } = render(<BugDetailDrawer {...defaultProps} width={400} />)
    const afterMount = stripCalls.mock.calls.length

    rerender(<BugDetailDrawer {...defaultProps} width={500} />)
    rerender(<BugDetailDrawer {...defaultProps} width={600} />)

    expect(stripCalls.mock.calls.length).toBe(afterMount)
  })

  it('re-sanitizes when the drawer switches to a bug with different html', () => {
    sanitizeCalls.mockClear()
    const { rerender } = render(<BugDetailDrawer {...defaultProps} />)
    const afterMount = sanitizeCalls.mock.calls.length

    rerender(
      <BugDetailDrawer
        {...defaultProps}
        bug={makeBug({ id: 2048, descriptionHtml: '<p>A different description</p>' })}
      />
    )

    expect(sanitizeCalls.mock.calls.length).toBeGreaterThan(afterMount)
    expect(screen.getByText('A different description')).toBeInTheDocument()
  })
})
