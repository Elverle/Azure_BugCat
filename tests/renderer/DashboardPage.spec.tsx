// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from '@renderer/pages/DashboardPage'
import {
  resetDashboardCategorizationUiStateForTests,
  resetDashboardFetchUiStateForTests
} from '@renderer/hooks/useDashboard'
import { resetAiClusterUiStateForTests } from '@renderer/hooks/useAiCluster'
import { resetSessionStoreForTests } from '@renderer/state/session-store'
import type { SessionData } from '@shared/types'

const mockSession: SessionData = {
  fetchedAt: '2026-01-01T09:00:00Z',
  lastFetchNewCount: 2,
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
      technicalLayer: 'FE',
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
      technicalLayer: 'FE',
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
  getCategorizationStatus: vi.fn(),
  getSettings: vi.fn(),
  fetchBugs: vi.fn(),
  categorizeBugs: vi.fn(),
  cancelCategorization: vi.fn(),
  onCategorizeProgress: vi.fn(() => vi.fn()),
  onCategorizeDone: vi.fn(() => vi.fn()),
  openExternal: vi.fn().mockResolvedValue(undefined),
  findSimilarBugs: vi.fn(),
  cancelFindSimilar: vi.fn(),
  getFindSimilarStatus: vi.fn(),
  onFindSimilarProgress: vi.fn(() => vi.fn()),
  onFindSimilarDone: vi.fn(() => vi.fn())
}

describe('DashboardPage', () => {
  beforeEach(() => {
    resetDashboardCategorizationUiStateForTests()
    resetDashboardFetchUiStateForTests()
    resetAiClusterUiStateForTests()
    resetSessionStoreForTests()
    vi.restoreAllMocks()
    vi.clearAllMocks()

    mockElectronAPI.getSession.mockResolvedValue(mockSession)
    mockElectronAPI.getCategorizationStatus.mockResolvedValue({ active: false })
    mockElectronAPI.getSettings.mockResolvedValue({
      orgUrl: 'https://dev.azure.com/alpitour',
      projectName: 'BugCat'
    })
    mockElectronAPI.fetchBugs.mockResolvedValue(undefined)
    mockElectronAPI.categorizeBugs.mockResolvedValue(undefined)
    mockElectronAPI.cancelCategorization.mockResolvedValue({ cancelled: true })
    mockElectronAPI.findSimilarBugs.mockResolvedValue(mockSession.similarityResults)
    mockElectronAPI.cancelFindSimilar.mockResolvedValue({ cancelled: true })
    mockElectronAPI.getFindSimilarStatus.mockResolvedValue({ active: false })

    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: mockElectronAPI
    })
  })

  it('renders the Similarita tab in Dashboard and shows the Motivation panel', async () => {
    render(<DashboardPage />)

    expect(await screen.findByText('Nuovi rispetto allo storico: 2')).toBeInTheDocument()

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

  it('resyncs the Similarita section from the shared session store after a categorization', async () => {
    const recategorizedSession: SessionData = {
      bugs: mockSession.bugs,
      fetchedAt: mockSession.fetchedAt,
      categorizedAt: '2026-01-02T10:00:00Z'
    }
    // Mirrors the main process: categorizing rewrites the session and drops the
    // similarity results computed against the previous categorization.
    mockElectronAPI.categorizeBugs.mockImplementation(async () => {
      mockElectronAPI.getSession.mockResolvedValue(recategorizedSession)
    })

    render(<DashboardPage />)

    const similarityTab = await screen.findByRole('button', { name: /Similarità/i })
    fireEvent.click(similarityTab)
    expect(await screen.findByText('Motivazione')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /categorize/i }))

    // No remount key on the section: it re-reads the refreshed session by itself.
    expect(await screen.findByText('Nessuna analisi eseguita')).toBeInTheDocument()
    expect(screen.queryByText('Motivazione')).not.toBeInTheDocument()
  })

  it('shows a popup when categorization fails with a blocking error', async () => {
    mockElectronAPI.categorizeBugs.mockRejectedValue(
      new Error(
        'OpenRouter routed the request to a provider or model that does not properly support structured outputs with json_schema. Select a compatible model, or change the routing/provider.'
      )
    )

    render(<DashboardPage />)

    const categorizeButton = await screen.findByRole('button', { name: /categorize/i })
    fireEvent.click(categorizeButton)

    // A bare Error carries no code, so it reaches the dialog as UNKNOWN_ERROR;
    // the provider's own wording stays underneath as the diagnostic detail.
    expect(await screen.findByRole('dialog', { name: 'Unexpected error' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'OpenRouter routed the request to a provider or model that does not properly support structured outputs with json_schema. Select a compatible model, or change the routing/provider.'
      )
    ).toBeInTheDocument()
  })

  it('shows a popup when the bug fetch fails', async () => {
    mockElectronAPI.fetchBugs.mockRejectedValue({
      code: 'ADO_AUTH_ERROR',
      message: 'Authentication failed: 401 Unauthorized'
    })

    render(<DashboardPage />)

    fireEvent.click(await screen.findByRole('button', { name: /Fetch Bugs/i }))

    expect(
      await screen.findByRole('dialog', { name: 'Azure DevOps authentication failed' })
    ).toBeInTheDocument()
    expect(screen.getByText('Authentication failed: 401 Unauthorized')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Azure DevOps authentication failed' })
      ).not.toBeInTheDocument()
    )
  })

  it('shows the fetch error popup when the session is empty (fresh install, bad PAT)', async () => {
    mockElectronAPI.getSession.mockResolvedValue(null)
    mockElectronAPI.fetchBugs.mockRejectedValue({
      code: 'ADO_AUTH_ERROR',
      message: 'Authentication failed: 401 Unauthorized'
    })

    render(<DashboardPage />)

    expect(await screen.findByText('Nessun bug caricato')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Fetch Bugs/i }))

    expect(
      await screen.findByRole('dialog', { name: 'Azure DevOps authentication failed' })
    ).toBeInTheDocument()
    expect(screen.getByText('Authentication failed: 401 Unauthorized')).toBeInTheDocument()
  })

  it('shows the categorization error popup when the session is empty', async () => {
    mockElectronAPI.getSession.mockResolvedValue(null)
    mockElectronAPI.categorizeBugs.mockRejectedValue({
      code: 'STORE_ERROR',
      message: 'No bugs in the current session'
    })

    render(<DashboardPage />)

    expect(await screen.findByText('Nessun bug caricato')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Categorize/i }))

    expect(await screen.findByRole('dialog', { name: 'Configuration problem' })).toBeInTheDocument()
    expect(screen.getByText('No bugs in the current session')).toBeInTheDocument()
  })

  it('shows the cancel button only while categorization is running and dismisses cancellation silently', async () => {
    let progressHandler: ((data: unknown) => void) | undefined
    let rejectCategorize: ((reason?: unknown) => void) | undefined
    let resolveCancel: (() => void) | undefined

    mockElectronAPI.onCategorizeProgress.mockImplementation((callback) => {
      progressHandler = callback
      return vi.fn()
    })
    mockElectronAPI.categorizeBugs.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectCategorize = reject
        })
    )
    mockElectronAPI.cancelCategorization.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCancel = () => {
            rejectCategorize?.({
              code: 'OPERATION_CANCELLED',
              message: 'Operation cancelled'
            })
            resolve({ cancelled: true })
          }
        })
    )

    render(<DashboardPage />)

    const categorizeButton = await screen.findByRole('button', { name: /categorize/i })
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()

    fireEvent.click(categorizeButton)

    await act(async () => {
      progressHandler?.({ total: 4, completed: 1, currentChunk: [] })
    })

    const cancelButton = await screen.findByRole('button', { name: /cancel/i })
    expect(cancelButton).toBeInTheDocument()

    fireEvent.click(cancelButton)

    expect(await screen.findByRole('button', { name: /cancelling/i })).toBeDisabled()

    resolveCancel?.()

    await waitFor(() => {
      expect(mockElectronAPI.cancelCategorization).toHaveBeenCalledTimes(1)
      // Queried without a name on purpose: now that the title is derived from
      // the code, pinning one title would make this vacuous — a cancellation
      // that wrongly surfaced would open a dialog reading 'Operation
      // cancelled' and slip past. No error dialog at all is the real assertion.
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await screen.findByRole('button', { name: /categorize/i })
  })

  it('shows cancel instead of categorize when the dashboard remounts while categorization is still active', async () => {
    mockElectronAPI.getCategorizationStatus.mockResolvedValue({ active: true })

    render(<DashboardPage />)

    expect(await screen.findByRole('button', { name: /^cancel$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /categorize/i })).not.toBeInTheDocument()
  })

  it('shows a dismissible popup when the similarity analysis fails (FIX 4)', async () => {
    mockElectronAPI.findSimilarBugs.mockRejectedValue({
      code: 'LLM_TIMEOUT',
      message: 'Request to OpenAI timed out'
    })

    render(<DashboardPage />)

    const similarityTab = await screen.findByRole('button', { name: /Similarità/i })
    fireEvent.click(similarityTab)

    const analyzeButton = await screen.findByRole('button', { name: /Analizza Similarità/i })
    fireEvent.click(analyzeButton)

    expect(
      await screen.findByRole('dialog', { name: 'The LLM request timed out' })
    ).toBeInTheDocument()
    expect(screen.getByText('Request to OpenAI timed out')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'The LLM request timed out' })
      ).not.toBeInTheDocument()
    )
  })

  it('disables the similarity cancel button while cancelling and re-enables it once settled (Task 18b item 4)', async () => {
    let resolveCancel: ((value: { cancelled: boolean }) => void) | undefined
    mockElectronAPI.findSimilarBugs.mockImplementation(() => new Promise(() => {}))
    mockElectronAPI.cancelFindSimilar.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCancel = resolve
        })
    )

    render(<DashboardPage />)

    const similarityTab = await screen.findByRole('button', { name: /Similarità/i })
    fireEvent.click(similarityTab)

    const analyzeButton = await screen.findByRole('button', { name: /Analizza Similarità/i })
    fireEvent.click(analyzeButton)

    const cancelButton = await screen.findByRole('button', { name: /Annulla analisi/i })
    fireEvent.click(cancelButton)

    expect(await screen.findByRole('button', { name: /Annullamento/i })).toBeDisabled()

    await act(async () => {
      resolveCancel?.({ cancelled: false })
      await Promise.resolve()
    })

    // The run is still active (main process reported cancelled: false), so the
    // button reverts to the enabled "cancel" state rather than staying stuck.
    expect(await screen.findByRole('button', { name: /^Annulla analisi$/i })).not.toBeDisabled()
  })
})
