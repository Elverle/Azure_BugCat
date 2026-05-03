import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useSyncExternalStore,
  type MutableRefObject
} from 'react'
import type { CategorizedBug, SessionData, ChunkProgress } from '@shared/types'

interface CategorizationUiState {
  isCategorizing: boolean
  isCancelling: boolean
  progress: ChunkProgress | null
  categorizeError: string | null
}

const INITIAL_CATEGORIZATION_UI_STATE: CategorizationUiState = {
  isCategorizing: false,
  isCancelling: false,
  progress: null,
  categorizeError: null
}

let categorizationUiState: CategorizationUiState = INITIAL_CATEGORIZATION_UI_STATE
const categorizationUiStateListeners = new Set<() => void>()

function emitCategorizationUiStateChange(): void {
  for (const listener of categorizationUiStateListeners) {
    listener()
  }
}

function getCategorizationUiState(): CategorizationUiState {
  return categorizationUiState
}

function subscribeToCategorizationUiState(listener: () => void): () => void {
  categorizationUiStateListeners.add(listener)
  return () => {
    categorizationUiStateListeners.delete(listener)
  }
}

function updateCategorizationUiState(
  updater:
    | Partial<CategorizationUiState>
    | ((state: CategorizationUiState) => CategorizationUiState)
): void {
  categorizationUiState =
    typeof updater === 'function'
      ? updater(categorizationUiState)
      : { ...categorizationUiState, ...updater }
  emitCategorizationUiStateChange()
}

export function resetDashboardCategorizationUiStateForTests(): void {
  categorizationUiState = INITIAL_CATEGORIZATION_UI_STATE
  emitCategorizationUiStateChange()
}

export interface UseDashboardReturn {
  bugs: CategorizedBug[]
  loading: boolean
  isCategorizing: boolean
  isCancelling: boolean
  progress: ChunkProgress | null
  categorizeError: string | null
  sessionInfo: { fetchedAt: string | null; categorizedAt: string | null }
  fetchBugs: () => Promise<void>
  categorizeBugs: () => Promise<void>
  cancelCategorization: () => Promise<void>
  clearCategorizeError: () => void
}

function isCancellationError(error: unknown): boolean {
  if (error !== null && typeof error === 'object') {
    if ('code' in error && (error as { code?: unknown }).code === 'OPERATION_CANCELLED') {
      return true
    }

    if ('message' in error) {
      const message = String((error as { message?: unknown }).message ?? '').toLowerCase()
      return message.includes('annullata') || message.includes('cancelled')
    }
  }

  return false
}

function getCategorizationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (error !== null && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  return 'Errore durante la categorizzazione'
}

function createProgressSubscription(cleanupRef: MutableRefObject<(() => void) | null>): void {
  if (cleanupRef.current) {
    return
  }

  cleanupRef.current = window.electronAPI.onCategorizeProgress((data) => {
    updateCategorizationUiState({ progress: data as ChunkProgress })
  })
}

export function useDashboard(): UseDashboardReturn {
  const [bugs, setBugs] = useState<CategorizedBug[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionInfo, setSessionInfo] = useState<{
    fetchedAt: string | null
    categorizedAt: string | null
  }>({
    fetchedAt: null,
    categorizedAt: null
  })

  const cleanupRef = useRef<(() => void) | null>(null)
  const currentCategorizationUiState = useSyncExternalStore(
    subscribeToCategorizationUiState,
    getCategorizationUiState,
    getCategorizationUiState
  )

  const loadSession = useCallback(async () => {
    const session = (await window.electronAPI.getSession()) as SessionData | null
    if (session) {
      setBugs(session.bugs)
      setSessionInfo({
        fetchedAt: session.fetchedAt,
        categorizedAt: session.categorizedAt ?? null
      })
    } else {
      setBugs([])
      setSessionInfo({ fetchedAt: null, categorizedAt: null })
    }
  }, [])

  // Load session on mount
  useEffect(() => {
    let cancelled = false

    async function init(): Promise<void> {
      try {
        const [session, categorizationStatus] = await Promise.all([
          window.electronAPI.getSession(),
          window.electronAPI.getCategorizationStatus()
        ])

        if (cancelled) {
          return
        }

        const typedSession = session as SessionData | null
        if (typedSession) {
          setBugs(typedSession.bugs)
          setSessionInfo({
            fetchedAt: typedSession.fetchedAt,
            categorizedAt: typedSession.categorizedAt ?? null
          })
        } else {
          setBugs([])
          setSessionInfo({ fetchedAt: null, categorizedAt: null })
        }

        if (categorizationStatus.active) {
          updateCategorizationUiState((state) => ({
            ...state,
            isCategorizing: true
          }))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [loadSession])

  // Cleanup progress listener on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!currentCategorizationUiState.isCategorizing) {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
      return
    }

    if (!cleanupRef.current) {
      createProgressSubscription(cleanupRef)
    }
  }, [currentCategorizationUiState.isCategorizing])

  const fetchBugs = useCallback(async () => {
    setLoading(true)
    try {
      await window.electronAPI.fetchBugs()
      await loadSession()
    } finally {
      setLoading(false)
    }
  }, [loadSession])

  const categorizeBugs = useCallback(async () => {
    if (loading || currentCategorizationUiState.isCategorizing) {
      return
    }

    updateCategorizationUiState({
      isCategorizing: true,
      isCancelling: false,
      progress: null,
      categorizeError: null
    })
    createProgressSubscription(cleanupRef)

    try {
      await window.electronAPI.categorizeBugs()
      await loadSession()
    } catch (error: unknown) {
      if (isCancellationError(error)) {
        return
      }

      updateCategorizationUiState({ categorizeError: getCategorizationErrorMessage(error) })
    } finally {
      updateCategorizationUiState({
        isCategorizing: false,
        isCancelling: false,
        progress: null
      })
    }
  }, [currentCategorizationUiState.isCategorizing, loadSession, loading])

  const cancelCategorization = useCallback(async () => {
    if (!currentCategorizationUiState.isCategorizing || currentCategorizationUiState.isCancelling) {
      return
    }

    updateCategorizationUiState({ isCancelling: true })

    try {
      const result = (await window.electronAPI.cancelCategorization()) as { cancelled?: boolean }
      if (!result?.cancelled) {
        updateCategorizationUiState({ isCancelling: false })
      }
    } catch (error: unknown) {
      updateCategorizationUiState({
        isCancelling: false,
        categorizeError: getCategorizationErrorMessage(error)
      })
    }
  }, [currentCategorizationUiState.isCancelling, currentCategorizationUiState.isCategorizing])

  return {
    bugs,
    loading,
    isCategorizing: currentCategorizationUiState.isCategorizing,
    isCancelling: currentCategorizationUiState.isCancelling,
    progress: currentCategorizationUiState.progress,
    categorizeError: currentCategorizationUiState.categorizeError,
    sessionInfo,
    fetchBugs,
    categorizeBugs,
    cancelCategorization,
    clearCategorizeError: () => updateCategorizationUiState({ categorizeError: null })
  }
}
