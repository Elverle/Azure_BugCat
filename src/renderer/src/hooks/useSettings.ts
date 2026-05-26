import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { AppSettings, ProjectEntry, BinaryCheckResult } from '@shared/types'
import { validateSettings, isSettingsValid } from '@renderer/lib/validation'

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
  categories: [],
  agentProvider: 'none',
  agentApiKey: '',
  agentModel: '',
  copilotByokEnabled: false,
  copilotByokProvider: undefined,
  copilotByokApiKey: '',
  projects: [],
  architectureContext: '',
  maxConcurrentSessions: 1,
  codeSource: 'local'
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
  addProject: () => void
  updateProject: (id: string, updates: Partial<ProjectEntry>) => void
  removeProject: (id: string) => void
  checkAgentBinary: () => Promise<BinaryCheckResult>
  selectDirectory: () => Promise<string | null>
}

const CONNECTION_TIMEOUT = 5000

function sanitizeSettingsBeforeSave(settings: AppSettings): AppSettings {
  const sanitized = { ...settings }

  if (sanitized.agentProvider === 'none') {
    sanitized.agentApiKey = ''
    sanitized.agentModel = ''
    sanitized.copilotByokEnabled = false
    sanitized.copilotByokProvider = undefined
    sanitized.copilotByokApiKey = ''
  } else if (sanitized.agentProvider !== 'copilot-sdk') {
    sanitized.copilotByokEnabled = false
    sanitized.copilotByokProvider = undefined
    sanitized.copilotByokApiKey = ''
  } else if (sanitized.agentProvider === 'copilot-sdk' && !sanitized.copilotByokEnabled) {
    sanitized.copilotByokProvider = undefined
    sanitized.copilotByokApiKey = ''
  }

  return sanitized
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [originalSettings, setOriginalSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<ResultMessage | null>(null)
  const [testAdoResult, setTestAdoResult] = useState<ResultMessage | null>(null)
  const [testAdoLoading, setTestAdoLoading] = useState(false)
  const [testLlmResult, setTestLlmResult] = useState<ResultMessage | null>(null)
  const [testLlmLoading, setTestLlmLoading] = useState(false)
  const initialLoadDone = useRef(false)

  // Load settings on mount
  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      try {
        const loaded = (await window.electronAPI.getSettings()) as AppSettings
        if (cancelled) return
        setSettings(loaded)
        setOriginalSettings(loaded)
        setErrors(validateSettings(loaded))
      } catch {
        if (cancelled) return
        setSettings(DEFAULT_SETTINGS)
        setOriginalSettings(DEFAULT_SETTINGS)
        setErrors(validateSettings(DEFAULT_SETTINGS))
        setSaveResult({ type: 'error', message: 'Failed to load settings. Using defaults.' })
      } finally {
        if (!cancelled) {
          setLoading(false)
          initialLoadDone.current = true
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Re-validate whenever settings change
  useEffect(() => {
    setErrors(validateSettings(settings))
  }, [settings])

  // Auto-derive agentProvider when llmProvider changes (skip initial load)
  useEffect(() => {
    if (!initialLoadDone.current) return
    if (settings.llmProvider === 'anthropic') {
      setSettings((prev) => ({ ...prev, agentProvider: 'claude-sdk' }))
    } else if (settings.llmProvider === 'openai') {
      setSettings((prev) => ({ ...prev, agentProvider: 'codex-sdk' }))
    }
  }, [settings.llmProvider])

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

  const save = useCallback(async () => {
    // Mark all fields as touched (including per-project keys)
    const allTouched: Record<string, boolean> = {}
    for (const key of Object.keys(settings)) {
      allTouched[key] = true
    }
    for (let i = 0; i < settings.projects.length; i++) {
      allTouched[`project-${i}-name`] = true
      allTouched[`project-${i}-path`] = true
      allTouched[`project-${i}-description`] = true
      allTouched[`project-${i}-keywords`] = true
    }
    setTouched(allTouched)

    // Sanitize dependent fields before validation/save
    const sanitized = sanitizeSettingsBeforeSave(settings)
    setSettings(sanitized)

    // Run full validation
    const currentErrors = validateSettings(sanitized)

    // Validate project paths via main process (only in local mode)
    const projectPaths =
      sanitized.codeSource === 'local'
        ? sanitized.projects.map((p) => p.path ?? '').filter((p) => p.length > 0)
        : []
    if (projectPaths.length > 0) {
      try {
        const pathResults = (await (window as any).electronAPI.validateProjectPaths(
          projectPaths
        )) as Record<string, string | null>
        for (let i = 0; i < sanitized.projects.length; i++) {
          const projPath = sanitized.projects[i].path ?? ''
          const pathError = pathResults[projPath]
          if (pathError) {
            currentErrors[`project-${i}-path`] = pathError
          }
        }
      } catch {
        // If path validation IPC fails, mark all paths as unverifiable to block save
        for (let i = 0; i < sanitized.projects.length; i++) {
          if (!currentErrors[`project-${i}-path`]) {
            currentErrors[`project-${i}-path`] = 'Unable to verify directory — check path and retry'
          }
        }
      }
    }

    setErrors(currentErrors)

    if (!isSettingsValid(currentErrors)) {
      setSaveResult({ type: 'error', message: 'Please fix validation errors before saving.' })
      return
    }

    setSaving(true)
    try {
      await window.electronAPI.setSettings(sanitized)
      setOriginalSettings(sanitized)
      setSaveResult({ type: 'success', message: 'Settings saved successfully.' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save settings.'
      setSaveResult({ type: 'error', message })
    } finally {
      setSaving(false)
    }
  }, [settings])

  const clearSaveResult = useCallback(() => {
    setSaveResult(null)
  }, [])

  const testAdoConnection = useCallback(async () => {
    setTestAdoLoading(true)
    setTestAdoResult(null)
    try {
      const response = (await Promise.race([
        window.electronAPI.testAdoConnection(settings),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Connection test timed out')), CONNECTION_TIMEOUT)
        )
      ])) as { success: boolean; message: string }
      setTestAdoResult({
        type: response.success ? 'success' : 'error',
        message: response.message
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection test failed.'
      setTestAdoResult({ type: 'error', message })
    } finally {
      setTestAdoLoading(false)
    }
  }, [settings])

  const testLlmConnection = useCallback(async () => {
    setTestLlmLoading(true)
    setTestLlmResult(null)
    try {
      const response = (await Promise.race([
        window.electronAPI.testLlmConnection(settings),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Connection test timed out')), CONNECTION_TIMEOUT)
        )
      ])) as { success: boolean; message: string }

      setTestLlmResult({
        type: response.success ? 'success' : 'error',
        message: response.message
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection test failed.'
      setTestLlmResult({ type: 'error', message })
    } finally {
      setTestLlmLoading(false)
    }
  }, [settings])

  // Auto-dismiss test connection results after 5 seconds
  useEffect(() => {
    if (testAdoResult) {
      const timer = setTimeout(() => setTestAdoResult(null), CONNECTION_TIMEOUT)
      return () => clearTimeout(timer)
    }
  }, [testAdoResult])

  useEffect(() => {
    if (testLlmResult) {
      const timer = setTimeout(() => setTestLlmResult(null), CONNECTION_TIMEOUT)
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

  const addProject = useCallback(() => {
    const newProject: ProjectEntry = {
      id: crypto.randomUUID(),
      name: '',
      path: '',
      type: 'backend',
      description: '',
      keywords: []
    }
    setSettings((prev) => ({ ...prev, projects: [...prev.projects, newProject] }))
    setTouched((prev) => ({ ...prev, projects: true }))
  }, [])

  const updateProject = useCallback((id: string, updates: Partial<ProjectEntry>) => {
    setSettings((prev) => {
      const index = prev.projects.findIndex((p) => p.id === id)
      if (index !== -1) {
        const perFieldTouched: Record<string, boolean> = {}
        for (const key of Object.keys(updates)) {
          perFieldTouched[`project-${index}-${key}`] = true
        }
        setTouched((t) => ({ ...t, projects: true, ...perFieldTouched }))
      }
      return {
        ...prev,
        projects: prev.projects.map((p) => (p.id === id ? { ...p, ...updates } : p))
      }
    })
  }, [])

  const removeProject = useCallback((id: string) => {
    setSettings((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id)
    }))
    setTouched((prev) => ({ ...prev, projects: true }))
  }, [])

  const checkAgentBinary = useCallback(async (): Promise<BinaryCheckResult> => {
    return (window as any).electronAPI.checkAgentBinary() as Promise<BinaryCheckResult>
  }, [])

  const selectDirectory = useCallback(async (): Promise<string | null> => {
    return (window as any).electronAPI.selectDirectory() as Promise<string | null>
  }, [])

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
    textToCategories,
    addProject,
    updateProject,
    removeProject,
    checkAgentBinary,
    selectDirectory
  }
}
