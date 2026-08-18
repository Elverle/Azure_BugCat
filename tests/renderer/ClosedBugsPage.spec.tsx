// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { CatalogBug, ClosedCatalogSnapshot } from '@shared/types'
import { ClosedBugsPage } from '@renderer/pages/ClosedBugsPage'

function makeCatalogBug(overrides: Partial<CatalogBug> = {}): CatalogBug {
  return {
    id: 1,
    title: 'Bug',
    state: 'Closed',
    assignee: null,
    areaPath: 'Project\\Area',
    description: 'desc',
    priority: 2,
    createdDate: '2024-01-01T00:00:00Z',
    updatedDate: '2024-01-01T00:00:00Z',
    tags: [],
    macroCategory: 'UI',
    technicalLayer: 'Layout',
    categoryReason: 'reason',
    categorizedAt: '2024-06-01T00:00:00Z',
    firstSeenAt: '2024-05-01T00:00:00Z',
    lastSeenAt: '2024-06-01T00:00:00Z',
    closedAt: '2024-07-01T00:00:00Z',
    inputSignature: 'sig',
    everInSimilarityGroup: false,
    lastSimilarityGroupAt: null,
    ...overrides
  }
}

function installMock(snapshot: Partial<ClosedCatalogSnapshot> = {}) {
  const getCatalogClosed = vi.fn().mockResolvedValue({
    closedBugs: [],
    fetchedAt: null,
    lastClearedAt: null,
    ...snapshot
  })
  Object.defineProperty(window, 'electronAPI', {
    value: { getCatalogClosed },
    writable: true,
    configurable: true
  })
  return getCatalogClosed
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ClosedBugsPage />
    </MemoryRouter>
  )
}

describe('ClosedBugsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows empty state when no closed bugs exist', async () => {
    installMock()

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Nessun bug storico chiuso/done trovato')).toBeInTheDocument()
    })
  })

  it('shows error state when IPC call fails', async () => {
    const getCatalogClosed = vi.fn().mockRejectedValue(new Error('Store corrupted'))
    Object.defineProperty(window, 'electronAPI', {
      value: { getCatalogClosed },
      writable: true,
      configurable: true
    })

    renderPage()

    await waitFor(() => {
      // A bare Error carries no code: it reaches the page as UNKNOWN_ERROR,
      // with its own text kept underneath as the diagnostic detail.
      expect(screen.getByText('Unexpected error')).toBeInTheDocument()
    })
    expect(screen.getByText('Store corrupted')).toBeInTheDocument()
  })

  it('renders KPI cards with correct values', async () => {
    const fetchedAt = '2024-07-01T00:00:00Z'
    const bugs = [
      makeCatalogBug({
        id: 1,
        closedAt: fetchedAt,
        macroCategory: 'UI',
        title: 'Errore nel drawer',
        everInSimilarityGroup: true
      }),
      makeCatalogBug({
        id: 2,
        closedAt: fetchedAt,
        macroCategory: 'UI',
        title: 'Bottone disallineato'
      }),
      makeCatalogBug({
        id: 3,
        closedAt: '2024-06-15T00:00:00Z',
        macroCategory: 'Performance',
        title: 'Leak memoria export'
      })
    ]
    installMock({
      closedBugs: bugs,
      fetchedAt,
      lastClearedAt: '2024-06-01T00:00:00Z'
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Storico Bug Chiusi')).toBeInTheDocument()
    })

    // KPI labels
    expect(screen.getByText('Bug Chiusi Totali')).toBeInTheDocument()
    expect(screen.getByText('Chiusi Ultimo Aggiornamento')).toBeInTheDocument()
    expect(screen.getByText('In Gruppo Similarità')).toBeInTheDocument()
    expect(screen.getByText(/Ultima pulizia storico:/)).toBeInTheDocument()

    // Category distribution
    expect(screen.getByText('UI')).toBeInTheDocument()
    expect(screen.getByText('Performance')).toBeInTheDocument()
    expect(screen.getByText('Distribuzione per Macro-Categoria')).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('Errore nel drawer')).toBeInTheDocument()
    expect(screen.getByText('#3')).toBeInTheDocument()
    expect(screen.getByText('Leak memoria export')).toBeInTheDocument()
  })

  it('shows page title with Archive icon', async () => {
    installMock({
      closedBugs: [makeCatalogBug()],
      fetchedAt: '2024-07-01T00:00:00Z'
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Storico Bug Chiusi')).toBeInTheDocument()
    })
  })

  it('filters bug detail rows by id or title without changing KPI cards', async () => {
    installMock({
      closedBugs: [
        makeCatalogBug({ id: 11, macroCategory: 'UI', title: 'Errore nel drawer' }),
        makeCatalogBug({ id: 12, macroCategory: 'UI', title: 'Bottone disallineato' }),
        makeCatalogBug({ id: 21, macroCategory: 'Performance', title: 'Leak memoria export' })
      ],
      fetchedAt: '2024-07-01T00:00:00Z'
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Filtra dettaglio per ID o titolo')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('Filtra dettaglio per ID o titolo'), {
      target: { value: '21' }
    })

    expect(screen.getByText('Bug Chiusi Totali')).toBeInTheDocument()
    expect(screen.getByText('#21')).toBeInTheDocument()
    expect(screen.getByText('Leak memoria export')).toBeInTheDocument()
    expect(screen.queryByText('#11')).not.toBeInTheDocument()
    expect(screen.queryByText('Errore nel drawer')).not.toBeInTheDocument()
  })

  it('collapses and expands category detail rows', async () => {
    installMock({
      closedBugs: [
        makeCatalogBug({ id: 11, macroCategory: 'UI', title: 'Errore nel drawer' }),
        makeCatalogBug({ id: 12, macroCategory: 'UI', title: 'Bottone disallineato' })
      ],
      fetchedAt: '2024-07-01T00:00:00Z'
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Errore nel drawer')).toBeInTheDocument()
    })

    const toggleButton = screen.getByRole('button', {
      name: 'Nascondi dettagli categoria UI'
    })

    fireEvent.click(toggleButton)

    expect(screen.queryByText('Errore nel drawer')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mostra dettagli categoria UI' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mostra dettagli categoria UI' }))

    expect(screen.getByText('Errore nel drawer')).toBeInTheDocument()
  })

  it('collapses and expands all visible categories with the global toggle', async () => {
    installMock({
      closedBugs: [
        makeCatalogBug({ id: 11, macroCategory: 'UI', title: 'Errore nel drawer' }),
        makeCatalogBug({ id: 21, macroCategory: 'Performance', title: 'Leak memoria export' })
      ],
      fetchedAt: '2024-07-01T00:00:00Z'
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Errore nel drawer')).toBeInTheDocument()
      expect(screen.getByText('Leak memoria export')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Collassa tutte le categorie' }))

    expect(screen.queryByText('Errore nel drawer')).not.toBeInTheDocument()
    expect(screen.queryByText('Leak memoria export')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Espandi tutte le categorie' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Espandi tutte le categorie' }))

    expect(screen.getByText('Errore nel drawer')).toBeInTheDocument()
    expect(screen.getByText('Leak memoria export')).toBeInTheDocument()
  })
})
