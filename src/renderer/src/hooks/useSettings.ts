import { useState, useEffect, useCallback, useMemo } from 'react'
import type { AppSettings } from '@shared/types'
import { extractErrorMessage } from '@shared/app-error'
import { validateSettings, isSettingsValid } from '@shared/validation'

const DEFAULT_SETTINGS: AppSettings = {
  orgUrl: '',
  projectName: '',
  queryId: '',
  topN: 20,
  chunkSize: 15,
  llmProvider: 'openai',
  apiKey: '',
  baseUrl: '',
  llmModel: '',
  pat: '',
  categories: []
}

type ResultMessage = { type: 'success' | 'error'; message: string }

export interface UseSettingsReturn {
  settings: AppSettings
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  loading: boolean
  saving: boolean
  saveResult: ResultMessage | null
  isDirty: boolean
  canSave: boolean
  updateField: (field: keyof AppSettings, value: unknown) => void
  clearSecret: (field: 'pat' | 'apiKey') => void
  save: () => Promise<void>
  clearSaveResult: () => void
  testAdoConnection: () => Promise<void>
  testAdoResult: ResultMessage | null
  testAdoLoading: boolean
  testLlmConnection: () => Promise<void>
  testLlmResult: ResultMessage | null
  testLlmLoading: boolean
  resetCategories: () => void
  categoriesToText: (categories: string[]) => string
  textToCategories: (text: string) => string[]
}

/**
 * The main process bounds the connection tests itself (30s for ADO, 60s for the
 * LLM), so this race is only a safety net against a reply that never comes: it
 * must outlast those timeouts, or a slow-but-successful test is reported as a
 * failure the user cannot explain.
 */
const TEST_CONNECTION_TIMEOUT_MS = 65000
const RESULT_AUTO_DISMISS_MS = 5000

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [originalSettings, setOriginalSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<ResultMessage | null>(null)
  const [testAdoResult, setTestAdoResult] = useState<ResultMessage | null>(null)
  const [testAdoLoading, setTestAdoLoading] = useState(false)
  const [testLlmResult, setTestLlmResult] = useState<ResultMessage | null>(null)
  const [testLlmLoading, setTestLlmLoading] = useState(false)

  // Load settings on mount
  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      try {
        const loaded = (await window.electronAPI.getSettings()) as AppSettings
        if (cancelled) return
        setSettings(loaded)
        setOriginalSettings(loaded)
      } catch {
        if (cancelled) return
        setSettings(DEFAULT_SETTINGS)
        setOriginalSettings(DEFAULT_SETTINGS)
        setSaveResult({ type: 'error', message: 'Failed to load settings. Using defaults.' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Validation is a pure function of the current form state
  const errors = useMemo(() => validateSettings(settings), [settings])

  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(originalSettings),
    [settings, originalSettings]
  )

  const canSave = useMemo(
    () => isDirty && isSettingsValid(errors) && !saving,
    [isDirty, errors, saving]
  )

  const updateField = useCallback((field: keyof AppSettings, value: unknown) => {
    setSettings((prev) => {
      const next = { ...prev, [field]: value }
      return next
    })
    setTouched((prev) => ({ ...prev, [field]: true }))
  }, [])

  /**
   * A stored secret arrives as a placeholder the user cannot meaningfully edit:
   * typing into it would produce '__stored__abc'. Replacing one is therefore an
   * explicit act — clear the field, then type the new value.
   */
  const clearSecret = useCallback(
    (field: 'pat' | 'apiKey') => {
      updateField(field, '')
    },
    [updateField]
  )

  const save = useCallback(async () => {
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {}
    for (const key of Object.keys(settings)) {
      allTouched[key] = true
    }
    setTouched(allTouched)

    if (!isSettingsValid(errors)) {
      setSaveResult({ type: 'error', message: 'Please fix validation errors before saving.' })
      return
    }

    setSaving(true)
    try {
      await window.electronAPI.setSettings(settings)
      setOriginalSettings(settings)
      setSaveResult({ type: 'success', message: 'Settings saved successfully.' })
    } catch (err: unknown) {
      setSaveResult({ type: 'error', message: extractErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }, [errors, settings])

  const clearSaveResult = useCallback(() => {
    setSaveResult(null)
  }, [])

  const testAdoConnection = useCallback(async () => {
    setTestAdoLoading(true)
    setTestAdoResult(null)
    // Captured so the race timer can be cancelled once the real response wins —
    // otherwise it stays scheduled for the rest of its 65s and later rejects a
    // promise nobody is awaiting (FIX 6).
    let raceTimeout: ReturnType<typeof setTimeout> | undefined
    try {
      const response = (await Promise.race([
        window.electronAPI.testAdoConnection(settings),
        new Promise<never>((_, reject) => {
          raceTimeout = setTimeout(
            () => reject(new Error('Connection test timed out')),
            TEST_CONNECTION_TIMEOUT_MS
          )
        })
      ])) as { success: boolean; message: string }
      setTestAdoResult({
        type: response.success ? 'success' : 'error',
        message: response.message
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection test failed.'
      setTestAdoResult({ type: 'error', message })
    } finally {
      clearTimeout(raceTimeout)
      setTestAdoLoading(false)
    }
  }, [settings])

  const testLlmConnection = useCallback(async () => {
    setTestLlmLoading(true)
    setTestLlmResult(null)
    // See testAdoConnection above: cancelled once the real response wins so it
    // does not linger for the rest of its 65s (FIX 6).
    let raceTimeout: ReturnType<typeof setTimeout> | undefined
    try {
      const response = (await Promise.race([
        window.electronAPI.testLlmConnection(settings),
        new Promise<never>((_, reject) => {
          raceTimeout = setTimeout(
            () => reject(new Error('Connection test timed out')),
            TEST_CONNECTION_TIMEOUT_MS
          )
        })
      ])) as { success: boolean; message: string }

      setTestLlmResult({
        type: response.success ? 'success' : 'error',
        message: response.message
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection test failed.'
      setTestLlmResult({ type: 'error', message })
    } finally {
      clearTimeout(raceTimeout)
      setTestLlmLoading(false)
    }
  }, [settings])

  // Auto-dismiss test connection results after 5 seconds
  useEffect(() => {
    if (testAdoResult) {
      const timer = setTimeout(() => setTestAdoResult(null), RESULT_AUTO_DISMISS_MS)
      return () => clearTimeout(timer)
    }
  }, [testAdoResult])

  useEffect(() => {
    if (testLlmResult) {
      const timer = setTimeout(() => setTestLlmResult(null), RESULT_AUTO_DISMISS_MS)
      return () => clearTimeout(timer)
    }
  }, [testLlmResult])

  const categoriesToText = useCallback((categories: string[]): string => {
    return categories.join('\n')
  }, [])

  const textToCategories = useCallback((text: string): string[] => {
    const seen = new Set<string>()
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        if (line.length === 0) return false
        if (seen.has(line)) return false
        seen.add(line)
        return true
      })
  }, [])

  const resetCategories = useCallback(() => {
    updateField('categories', [])
  }, [updateField])

  return {
    settings,
    errors,
    touched,
    loading,
    saving,
    saveResult,
    isDirty,
    canSave,
    updateField,
    clearSecret,
    save,
    clearSaveResult,
    testAdoConnection,
    testAdoResult,
    testAdoLoading,
    testLlmConnection,
    testLlmResult,
    testLlmLoading,
    resetCategories,
    categoriesToText,
    textToCategories
  }
}
