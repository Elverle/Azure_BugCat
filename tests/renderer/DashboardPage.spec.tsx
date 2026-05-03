// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from '@renderer/pages/DashboardPage'
import type { SessionData } from '@shared/types'

const mockSession: SessionData = {
  fetchedAt: '2026-01-01T09:00:00Z',
  categorizedAt: '2026-01-01T10:00:00Z',
  bugs: [
    {
      id: 101,
      title: 'Errore apertura modale costo',
      state: 'Active',
      assignee: 'Laura K.',
      areaPath: 'ECommerce\\Frontend\\Costs',
      description: 'La modale costo non si apre in management',
      priority: 1,
      createdDate: '2026-01-01T09:00:00Z',
      updatedDate: '2026-01-01T10:00:00Z',
      tags: ['costi', 'modale'],
      macroCategory: 'Costi',
      subCategory: 'FE',
      categoryReason: 'Problema UI sulla modale costo',
      categorizedAt: '2026-01-01T10:00:00Z'
    },
    {
      id: 102,
      title: 'Popup costo non visualizzato',
      state: 'Active',
      assignee: 'Marco R.',
      areaPath: 'ECommerce\\Frontend\\Costs',
      description: 'Il popup del costo non viene mostrato',
      priority: 2,
      createdDate: '2026-01-01T09:30:00Z',
      updatedDate: '2026-01-01T10:05:00Z',
      tags: ['costi'],
      macroCategory: 'Costi',
      subCategory: 'FE',
      categoryReason: 'Problema di visualizzazione costo',
      categorizedAt: '2026-01-01T10:00:00Z'
    }
  ],
  similarityResults: {
    analyzedAt: '2026-01-01T11:00:00Z',
    categories: [
      {
        macroCategory: 'Costi',
        groups: [
          {
            similarityScore: 0.85,
            reason: 'Entrambi i bug descrivono la mancata apertura della modale costo.',
            bugIds: [101, 102]
          }
        ]
      }
    ]
  }
}

const mockElectronAPI = {
  getSession: vi.fn(),
  getSettings: vi.fn(),
  fetchBugs: vi.fn(),
  categorizeBugs: vi.fn(),
  onCategorizeProgress: vi.fn(() => vi.fn()),
  openExternal: vi.fn().mockResolvedValue(undefined),
  findSimilarBugs: vi.fn(),
  onFindSimilarProgress: vi.fn(() => vi.fn())
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()

    mockElectronAPI.getSession.mockResolvedValue(mockSession)
    mockElectronAPI.getSettings.mockResolvedValue({
      orgUrl: 'https://dev.azure.com/alpitour',
      projectName: 'BugCat'
    })
    mockElectronAPI.fetchBugs.mockResolvedValue(undefined)
    mockElectronAPI.categorizeBugs.mockResolvedValue(undefined)
    mockElectronAPI.findSimilarBugs.mockResolvedValue(mockSession.similarityResults)

    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: mockElectronAPI
    })
  })

  it('renders the Similarita tab in Dashboard and shows the Motivation panel', async () => {
    render(<DashboardPage />)

    const similarityTab = await screen.findByRole('button', { name: /Similarità/i })
    fireEvent.click(similarityTab)

    await waitFor(() => {
      expect(screen.getByText('Motivazione')).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: 'Similarità' })).toBeInTheDocument()
    expect(
      screen.getByText('Entrambi i bug descrivono la mancata apertura della modale costo.')
    ).toBeInTheDocument()
    expect(screen.getByText('#101')).toBeInTheDocument()
    expect(screen.getByText('#102')).toBeInTheDocument()
  })

  it('shows a popup when categorization fails with a blocking error', async () => {
    mockElectronAPI.categorizeBugs.mockRejectedValue(
      new Error(
        'OpenRouter ha instradato la richiesta verso un provider o modello che non supporta correttamente structured outputs con json_schema. Seleziona un modello compatibile oppure cambia routing/provider.'
      )
    )

    render(<DashboardPage />)

    const categorizeButton = await screen.findByRole('button', { name: /categorize/i })
    fireEvent.click(categorizeButton)

    expect(
      await screen.findByRole('dialog', { name: 'Errore categorizzazione' })
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'OpenRouter ha instradato la richiesta verso un provider o modello che non supporta correttamente structured outputs con json_schema. Seleziona un modello compatibile oppure cambia routing/provider.'
      )
    ).toBeInTheDocument()
  })
})
