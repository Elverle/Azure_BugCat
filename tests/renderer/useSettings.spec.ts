// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSettings } from '@shared/types'
import { useSettings } from '@renderer/hooks/useSettings'

const validSettings: AppSettings = {
  orgUrl: 'https://dev.azure.com/gversino',
  projectName: 'BugCat',
  queryId: '123e4567-e89b-12d3-a456-426614174000',
  topN: 20,
  chunkSize: 15,
  llmProvider: 'openai',
  apiKey: 'sk-test',
  pat: 'pat-token',
  categories: ['UI'],
  agentProvider: 'none',
  projects: [],
  architectureContext: '',
  maxConcurrentSessions: 1
}

type ElectronApiMock = {
  getSettings: ReturnType<typeof vi.fn>
  setSettings: ReturnType<typeof vi.fn>
  testAdoConnection: ReturnType<typeof vi.fn>
  testLlmConnection: ReturnType<typeof vi.fn>
}

function installElectronApiMock(overrides: Partial<ElectronApiMock> = {}): ElectronApiMock {
  const api: ElectronApiMock = {
    getSettings: vi.fn().mockResolvedValue(validSettings),
    setSettings: vi.fn().mockResolvedValue(undefined),
    testAdoConnection: vi.fn().mockResolvedValue({ success: true, message: 'ADO ok' }),
    testLlmConnection: vi.fn().mockResolvedValue({ success: false, message: 'LLM placeholder' }),
    ...overrides
  }

  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: api
  })

  return api
}

describe('useSettings', () => {
  beforeEach(() => {
    installElectronApiMock()
    vi.useRealTimers()
  })

  it('loads persisted settings on mount', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.settings).toEqual(validSettings)
    expect(result.current.isDirty).toBe(false)
    expect(result.current.canSave).toBe(false)
  })

  it('blocks save when validation fails and does not persist invalid settings', async () => {
    const electronAPI = installElectronApiMock()
    const { result } = renderHook(() => useSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.updateField('queryId', '')
    })

    await act(async () => {
      await result.current.save()
    })

    expect(electronAPI.setSettings).not.toHaveBeenCalled()
    expect(result.current.saveResult).toEqual({
      type: 'error',
      message: 'Please fix validation errors before saving.'
    })
    expect(result.current.touched.queryId).toBe(true)
  })

  it('saves valid settings, clears dirty state, and disables save again', async () => {
    const electronAPI = installElectronApiMock()
    const { result } = renderHook(() => useSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.updateField('projectName', 'BugCat Next')
    })

    expect(result.current.isDirty).toBe(true)
    expect(result.current.canSave).toBe(true)

    await act(async () => {
      await result.current.save()
    })

    expect(electronAPI.setSettings).toHaveBeenCalledWith(
      expect.objectContaining({ projectName: 'BugCat Next' })
    )
    expect(result.current.saveResult).toEqual({
      type: 'success',
      message: 'Settings saved successfully.'
    })
    expect(result.current.isDirty).toBe(false)
    expect(result.current.canSave).toBe(false)
  })

  it('falls back to defaults when initial settings load fails', async () => {
    installElectronApiMock({
      getSettings: vi.fn().mockRejectedValue(new Error('boom'))
    })

    const { result } = renderHook(() => useSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.settings).toMatchObject({
      orgUrl: '',
      topN: 20,
      chunkSize: 15,
      llmProvider: 'openai',
      categories: []
    })
    expect(result.current.saveResult).toEqual({
      type: 'error',
      message: 'Failed to load settings. Using defaults.'
    })
  })

  it('passes the current unsaved form state to the ADO connection test', async () => {
    const electronAPI = installElectronApiMock()
    const { result } = renderHook(() => useSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.updateField('orgUrl', 'https://dev.azure.com/changed-org')
    })

    await act(async () => {
      await result.current.testAdoConnection()
    })

    expect(electronAPI.testAdoConnection).toHaveBeenCalledWith(
      expect.objectContaining({ orgUrl: 'https://dev.azure.com/changed-org' })
    )
    expect(result.current.testAdoResult).toEqual({ type: 'success', message: 'ADO ok' })
  })

  it('times out ADO and LLM connection tests after five seconds', async () => {
    installElectronApiMock({
      testAdoConnection: vi.fn().mockImplementation(() => new Promise(() => undefined)),
      testLlmConnection: vi.fn().mockImplementation(() => new Promise(() => undefined))
    })

    const { result } = renderHook(() => useSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))

    vi.useFakeTimers()

    await act(async () => {
      const adoPromise = result.current.testAdoConnection()
      await vi.advanceTimersByTimeAsync(5000)
      await adoPromise
    })

    expect(result.current.testAdoResult).toEqual({
      type: 'error',
      message: 'Connection test timed out'
    })

    await act(async () => {
      const llmPromise = result.current.testLlmConnection()
      await vi.advanceTimersByTimeAsync(5000)
      await llmPromise
    })

    expect(result.current.testLlmResult).toEqual({
      type: 'error',
      message: 'Connection test timed out'
    })
  })

  it('passes the current unsaved form state to the LLM connection test', async () => {
    const electronAPI = installElectronApiMock({
      testLlmConnection: vi.fn().mockResolvedValue({ success: false, message: 'API Key mancante' })
    })
    const { result } = renderHook(() => useSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.updateField('apiKey', '')
    })

    await act(async () => {
      await result.current.testLlmConnection()
    })

    expect(electronAPI.testLlmConnection).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: '' })
    )
    expect(result.current.testLlmResult).toEqual({ type: 'error', message: 'API Key mancante' })
  })

  it('normalizes categories text helpers and resetCategories', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.textToCategories(' UI\nBackend\n\nUI\n API ')).toEqual([
      'UI',
      'Backend',
      'API'
    ])
    expect(result.current.categoriesToText(['UI', 'Backend'])).toBe('UI\nBackend')

    act(() => {
      result.current.updateField('categories', ['UI', 'Backend'])
      result.current.resetCategories()
    })

    expect(result.current.settings.categories).toEqual([])
  })
})
