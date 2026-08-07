import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
  type MutableRefObject
} from 'react'
import type { CategorizedBug, ChunkProgress } from '@shared/types'
import {
  getSessionSnapshot,
  loadSession,
  refreshSession,
  subscribeToSession
} from '@renderer/state/session-store'

const NO_BUGS: CategorizedBug[] = []

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
  sessionInfo: {
    fetchedAt: string | null
    categorizedAt: string | null
    lastFetchNewCount: number | null
  }
  fetchBugs: () => Promise<void>
  categorizeBugs: () => Promise<void>
  cancelCategorization: () => Promise<void>
  clearCategorizeError: () => void
}

function isCancellationError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'OPERATION_CANCELLED'
  )
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
  const [isFetching, setIsFetching] = useState(false)

  const cleanupRef = useRef<(() => void) | null>(null)
  const sessionState = useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    getSessionSnapshot
  )
  const currentCategorizationUiState = useSyncExternalStore(
    subscribeToCategorizationUiState,
    getCategorizationUiState,
    getCategorizationUiState
  )

  const session = sessionState.session
  const bugs = session?.bugs ?? NO_BUGS
  const loading = sessionState.loading || isFetching

  const sessionInfo = useMemo(
    () => ({
      fetchedAt: session?.fetchedAt ?? null,
      categorizedAt: session?.categorizedAt ?? null,
      lastFetchNewCount: session?.lastFetchNewCount ?? null
    }),
    [session]
  )

  // Load session on mount
  useEffect(() => {
    let cancelled = false

    async function init(): Promise<void> {
      const [, categorizationStatus] = await Promise.all([
        loadSession(),
        window.electronAPI.getCategorizationStatus()
      ])

      if (cancelled) {
        return
      }

      if (categorizationStatus.active) {
        updateCategorizationUiState({ isCategorizing: true })
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

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
    setIsFetching(true)
    try {
      await window.electronAPI.fetchBugs()
      await refreshSession()
    } finally {
      setIsFetching(false)
    }
  }, [])

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
      await refreshSession()
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
  }, [currentCategorizationUiState.isCategorizing, loading])

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
