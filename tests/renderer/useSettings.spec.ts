// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSettings } from '@shared/types'
import { useSettings } from '@renderer/hooks/useSettings'

const validSettings: AppSettings = {
  orgUrl: 'https://dev.azure.com/contoso',
  projectName: 'BugCat',
  queryId: '123e4567-e89b-12d3-a456-426614174000',
  topN: 20,
  chunkSize: 15,
  llmProvider: 'openai',
  apiKey: 'sk-test',
  pat: 'pat-token',
  categories: ['UI']
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

  it('surfaces the message of a typed AppError when saving fails', async () => {
    // What the preload actually delivers since the IPC error contract landed:
    // a plain { code, message }, not an Error instance.
    const electronAPI = installElectronApiMock({
      setSettings: vi
        .fn()
        .mockRejectedValue({ code: 'STORE_ERROR', message: 'Impossibile scrivere le settings' })
    })
    const { result } = renderHook(() => useSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.updateField('projectName', 'BugCat Next')
    })

    await act(async () => {
      await result.current.save()
    })

    expect(electronAPI.setSettings).toHaveBeenCalled()
    expect(result.current.saveResult).toEqual({
      type: 'error',
      message: 'Impossibile scrivere le settings'
    })
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

  it('reports a slow connection test result instead of a false timeout', async () => {
    let resolveAdo: ((value: { success: boolean; message: string }) => void) | undefined
    installElectronApiMock({
      testAdoConnection: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveAdo = resolve
          })
      )
    })

    const { result } = renderHook(() => useSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))

    vi.useFakeTimers()

    // The main process bounds ADO at 30s and the LLM at 60s: a reply at 10s is
    // slow, not lost, and the renderer must not overrule it with its own verdict.
    await act(async () => {
      const adoPromise = result.current.testAdoConnection()
      await vi.advanceTimersByTimeAsync(10_000)
      resolveAdo?.({ success: true, message: 'ADO ok' })
      await adoPromise
    })

    expect(result.current.testAdoResult).toEqual({ type: 'success', message: 'ADO ok' })
  })

  it('auto-dismisses a connection result after five seconds', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))

    // The dismiss timer is scheduled by the effect that reacts to the result, so
    // the clock has to be fake before the result exists.
    vi.useFakeTimers()
    await act(async () => {
      await result.current.testAdoConnection()
    })
    expect(result.current.testAdoResult).toEqual({ type: 'success', message: 'ADO ok' })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(result.current.testAdoResult).toBeNull()
  })

  it('times out a connection test only once the main-process timeouts have elapsed', async () => {
    installElectronApiMock({
      testAdoConnection: vi.fn().mockImplementation(() => new Promise(() => undefined)),
      testLlmConnection: vi.fn().mockImplementation(() => new Promise(() => undefined))
    })

    const { result } = renderHook(() => useSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))

    vi.useFakeTimers()

    let adoPromise: Promise<void> | undefined
    await act(async () => {
      adoPromise = result.current.testAdoConnection()
      await vi.advanceTimersByTimeAsync(30_000)
    })

    // Still waiting: the main process's own ADO timeout has only just elapsed.
    expect(result.current.testAdoResult).toBeNull()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(35_000)
      await adoPromise
    })

    expect(result.current.testAdoResult).toEqual({
      type: 'error',
      message: 'Connection test timed out'
    })

    await act(async () => {
      const llmPromise = result.current.testLlmConnection()
      await vi.advanceTimersByTimeAsync(65_000)
      await llmPromise
    })

    expect(result.current.testLlmResult).toEqual({
      type: 'error',
      message: 'Connection test timed out'
    })
  })

  it('cancels the 65s race timer once the ADO response wins, instead of leaving it dangling (FIX 6)', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))

    vi.useFakeTimers()
    await act(async () => {
      await result.current.testAdoConnection()
    })
    expect(result.current.testAdoResult).toEqual({ type: 'success', message: 'ADO ok' })

    // Only the 5s auto-dismiss timer (scheduled by the effect reacting to the
    // result) should still be pending — the 65s race timeout must have been
    // cleared once the real response won, not left scheduled for another 60s.
    expect(vi.getTimerCount()).toBe(1)
  })

  it('cancels the 65s race timer once the LLM response wins, instead of leaving it dangling (FIX 6)', async () => {
    const { result } = renderHook(() => useSettings())

    await waitFor(() => expect(result.current.loading).toBe(false))

    vi.useFakeTimers()
    await act(async () => {
      await result.current.testLlmConnection()
    })
    expect(result.current.testLlmResult).toEqual({ type: 'error', message: 'LLM placeholder' })

    expect(vi.getTimerCount()).toBe(1)
  })

  it('passes the current unsaved form state to the LLM connection test', async () => {
    const electronAPI = installElectronApiMock({
      testLlmConnection: vi.fn().mockResolvedValue({ success: false, message: 'API key is missing' })
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
    expect(result.current.testLlmResult).toEqual({ type: 'error', message: 'API key is missing' })
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
