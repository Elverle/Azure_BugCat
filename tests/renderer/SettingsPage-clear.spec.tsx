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
    categories: []
  }),
  setSettings: vi.fn().mockResolvedValue(undefined),
  clearSession: vi.fn().mockResolvedValue(undefined),
  clearCatalog: vi.fn().mockResolvedValue(undefined),
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
      categories: []
    })
    mockElectronAPI.clearSession.mockResolvedValue(undefined)
    mockElectronAPI.clearCatalog.mockResolvedValue(undefined)
  })

  it('renders the "Clear session data" button', async () => {
    renderSettingsPage()
    const button = await screen.findByRole('button', { name: 'Clear session data' })
    expect(button).toBeInTheDocument()
  })

  it('opens a confirmation dialog when clicking the button', async () => {
    renderSettingsPage()
    const button = await screen.findByRole('button', { name: 'Clear session data' })

    fireEvent.click(button)

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('Clear the current session?')).toBeInTheDocument()
  })

  it('calls clearSession when confirming the dialog', async () => {
    renderSettingsPage()
    const button = await screen.findByRole('button', { name: 'Clear session data' })
    fireEvent.click(button)

    const confirmButton = await screen.findByRole('button', { name: 'Clear session' })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockElectronAPI.clearSession).toHaveBeenCalledTimes(1)
    })
  })

  it('hides the dialog without calling clearSession when canceling', async () => {
    renderSettingsPage()
    const button = await screen.findByRole('button', { name: 'Clear session data' })
    fireEvent.click(button)

    await screen.findByRole('dialog')

    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(mockElectronAPI.clearSession).not.toHaveBeenCalled()
  })
})

describe('SettingsPage — clear catalog', () => {
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
      categories: []
    })
    mockElectronAPI.clearSession.mockResolvedValue(undefined)
    mockElectronAPI.clearCatalog.mockResolvedValue(undefined)
  })

  it('renders the "Clear bug history" button', async () => {
    renderSettingsPage()
    const button = await screen.findByRole('button', { name: 'Clear bug history' })
    expect(button).toBeInTheDocument()
  })

  it('opens catalog confirmation dialog when clicking the button', async () => {
    renderSettingsPage()
    const button = await screen.findByRole('button', { name: 'Clear bug history' })

    fireEvent.click(button)

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('Clear the bug history?')).toBeInTheDocument()
  })

  it('calls clearCatalog when confirming the dialog', async () => {
    renderSettingsPage()
    const button = await screen.findByRole('button', { name: 'Clear bug history' })
    fireEvent.click(button)

    const confirmButton = await screen.findByRole('button', { name: 'Clear history' })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockElectronAPI.clearCatalog).toHaveBeenCalledTimes(1)
    })
  })

  it('does not call clearCatalog when canceling', async () => {
    renderSettingsPage()
    const button = await screen.findByRole('button', { name: 'Clear bug history' })
    fireEvent.click(button)

    await screen.findByRole('dialog')

    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' })
    // Click the last "Cancel" button which belongs to the catalog dialog
    fireEvent.click(cancelButtons[cancelButtons.length - 1])

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(mockElectronAPI.clearCatalog).not.toHaveBeenCalled()
  })

  it('does not call clearSession when clearing catalog', async () => {
    renderSettingsPage()
    const button = await screen.findByRole('button', { name: 'Clear bug history' })
    fireEvent.click(button)

    const confirmButton = await screen.findByRole('button', { name: 'Clear history' })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockElectronAPI.clearCatalog).toHaveBeenCalledTimes(1)
    })
    expect(mockElectronAPI.clearSession).not.toHaveBeenCalled()
  })
})
