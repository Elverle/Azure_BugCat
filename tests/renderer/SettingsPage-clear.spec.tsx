// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { SettingsPage } from '@renderer/pages/SettingsPage'

const mockElectronAPI = {
  getSettings: vi.fn().mockResolvedValue({
    orgUrl: '',
    projectName: '',
    queryId: '',
    topN: 20,
    chunkSize: 15,
    llmProvider: 'openai',
    apiKey: '',
    pat: '',
    categories: [],
    copilotAuthStatus: 'unknown'
  }),
  setSettings: vi.fn().mockResolvedValue(undefined),
  clearSession: vi.fn().mockResolvedValue(undefined),
  testAdoConnection: vi.fn(),
  testLlmConnection: vi.fn(),
  fetchBugs: vi.fn(),
  categorizeBugs: vi.fn(),
  onCategorizeProgress: vi.fn(() => vi.fn()),
  getSession: vi.fn().mockResolvedValue(null),
  openExternal: vi.fn(),
  ping: vi.fn()
}

function renderSettingsPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>
  )
}

describe('SettingsPage — clear session', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: mockElectronAPI
    })
    vi.clearAllMocks()
    mockElectronAPI.getSettings.mockResolvedValue({
      orgUrl: '',
      projectName: '',
      queryId: '',
      topN: 20,
      chunkSize: 15,
      llmProvider: 'openai',
      apiKey: '',
      pat: '',
      categories: [],
      copilotAuthStatus: 'unknown'
    })
    mockElectronAPI.clearSession.mockResolvedValue(undefined)
  })

  it('renders the "Pulisci dati sessione" button', async () => {
    renderSettingsPage()
    const button = await screen.findByRole('button', { name: 'Pulisci dati sessione' })
    expect(button).toBeInTheDocument()
  })

  it('opens a confirmation dialog when clicking the button', async () => {
    renderSettingsPage()
    const button = await screen.findByRole('button', { name: 'Pulisci dati sessione' })

    fireEvent.click(button)

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('Conferma pulizia dati sessione')).toBeInTheDocument()
  })

  it('calls clearSession when confirming the dialog', async () => {
    renderSettingsPage()
    const button = await screen.findByRole('button', { name: 'Pulisci dati sessione' })
    fireEvent.click(button)

    const confirmButton = await screen.findByRole('button', { name: 'Pulisci dati' })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockElectronAPI.clearSession).toHaveBeenCalledTimes(1)
    })
  })

  it('hides the dialog without calling clearSession when canceling', async () => {
    renderSettingsPage()
    const button = await screen.findByRole('button', { name: 'Pulisci dati sessione' })
    fireEvent.click(button)

    await screen.findByRole('dialog')

    const cancelButton = screen.getByRole('button', { name: 'Annulla' })
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(mockElectronAPI.clearSession).not.toHaveBeenCalled()
  })
})
