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
import { extractErrorMessage } from '@shared/app-error'
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
  fetchError: string | null
  sessionInfo: {
    fetchedAt: string | null
    categorizedAt: string | null
    lastFetchNewCount: number | null
  }
  fetchBugs: () => Promise<void>
  categorizeBugs: () => Promise<void>
  cancelCategorization: () => Promise<void>
  clearCategorizeError: () => void
  clearFetchError: () => void
}

function isCancellationError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'OPERATION_CANCELLED'
  )
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
  const [fetchError, setFetchError] = useState<string | null>(null)

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

    // The mount read touches only the local store, never Azure DevOps, so a
    // failure here has no user-actionable message to show: the session store
    // already degrades to `loading: false` keeping whatever it had. Swallowing
    // it deliberately, because `loadSession()` rethrows to its callers and an
    // unhandled rejection would surface as a console error instead.
    init().catch(() => undefined)
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
    setFetchError(null)
    try {
      await window.electronAPI.fetchBugs()
      await refreshSession()
    } catch (error: unknown) {
      setFetchError(extractErrorMessage(error))
    } finally {
      setIsFetching(false)
    }
  }, [])

  const clearFetchError = useCallback(() => setFetchError(null), [])

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
        // Chunks completed before the cancellation were already persisted by the
        // main process (see LLM_CATEGORIZE's persistChunk) — refresh to show them.
        await refreshSession()
        return
      }

      updateCategorizationUiState({ categorizeError: extractErrorMessage(error) })
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
        categorizeError: extractErrorMessage(error)
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
    fetchError,
    sessionInfo,
    fetchBugs,
    categorizeBugs,
    cancelCategorization,
    clearCategorizeError: () => updateCategorizationUiState({ categorizeError: null }),
    clearFetchError
  }
}
