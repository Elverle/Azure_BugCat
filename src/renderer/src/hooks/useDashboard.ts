import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
  type MutableRefObject
} from 'react'
import type { AppError, CategorizedBug, ChunkProgress } from '@shared/types'
import { toAppError } from '@shared/app-error'
import {
  getSessionSnapshot,
  loadSession,
  refreshSession,
  subscribeToSession
} from '@renderer/state/session-store'
import { createUiStore } from '@renderer/state/create-ui-store'
import { isCancellationError } from '@renderer/lib/cancellation'

const NO_BUGS: CategorizedBug[] = []

interface CategorizationUiState {
  isCategorizing: boolean
  isCancelling: boolean
  progress: ChunkProgress | null
  categorizeError: AppError | null
}

const INITIAL_CATEGORIZATION_UI_STATE: CategorizationUiState = {
  isCategorizing: false,
  isCancelling: false,
  progress: null,
  categorizeError: null
}

const categorizationUiStore = createUiStore(INITIAL_CATEGORIZATION_UI_STATE)
const getCategorizationUiState = categorizationUiStore.getSnapshot
const subscribeToCategorizationUiState = categorizationUiStore.subscribe
const updateCategorizationUiState = categorizationUiStore.update

export function resetDashboardCategorizationUiStateForTests(): void {
  categorizationUiStore.reset()
}

// Fetch state is kept out of categorizationUiState on purpose: fetch and
// categorization are independent runs (see LLM_CATEGORIZE and ADO_FETCH_BUGS
// in ipc-handlers.ts, each guarded and tracked separately in the main
// process), so a stray write from one must not touch the other's UI state.
interface FetchUiState {
  isFetching: boolean
  fetchError: AppError | null
}

const INITIAL_FETCH_UI_STATE: FetchUiState = {
  isFetching: false,
  fetchError: null
}

const fetchUiStore = createUiStore(INITIAL_FETCH_UI_STATE)
const getFetchUiState = fetchUiStore.getSnapshot
const subscribeToFetchUiState = fetchUiStore.subscribe
const updateFetchUiState = fetchUiStore.update

export function resetDashboardFetchUiStateForTests(): void {
  fetchUiStore.reset()
}

export interface UseDashboardReturn {
  bugs: CategorizedBug[]
  loading: boolean
  isCategorizing: boolean
  isCancelling: boolean
  progress: ChunkProgress | null
  categorizeError: AppError | null
  fetchError: AppError | null
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

function createProgressSubscription(cleanupRef: MutableRefObject<(() => void) | null>): void {
  if (cleanupRef.current) {
    return
  }

  cleanupRef.current = window.electronAPI.onCategorizeProgress((data) => {
    updateCategorizationUiState({ progress: data as ChunkProgress })
  })
}

export function useDashboard(): UseDashboardReturn {
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
  const currentFetchUiState = useSyncExternalStore(
    subscribeToFetchUiState,
    getFetchUiState,
    getFetchUiState
  )

  const session = sessionState.session
  const bugs = session?.bugs ?? NO_BUGS
  const loading = sessionState.loading || currentFetchUiState.isFetching

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

  // Resync when the main process reports a categorization run is done — the run
  // keeps going there even if this renderer reloaded mid-run and never started
  // it, so its own promise resolving is not something we can rely on. Also
  // fires for a locally started run alongside categorizeBugs()'s own success
  // path; both converge on the same state, so running twice is harmless.
  useEffect(() => {
    if (!currentCategorizationUiState.isCategorizing) {
      return
    }

    return window.electronAPI.onCategorizeDone(() => {
      // refreshSession(), not loadSession(): a read already in flight could
      // resolve with data captured before the run finished.
      refreshSession().catch(() => undefined)
      updateCategorizationUiState({ isCategorizing: false, isCancelling: false, progress: null })
    })
  }, [currentCategorizationUiState.isCategorizing])

  const fetchBugs = useCallback(async () => {
    updateFetchUiState({ isFetching: true, fetchError: null })
    try {
      await window.electronAPI.fetchBugs()
      await refreshSession()
    } catch (error: unknown) {
      updateFetchUiState({ fetchError: toAppError(error) })
    } finally {
      updateFetchUiState({ isFetching: false })
    }
  }, [])

  const clearFetchError = useCallback(() => updateFetchUiState({ fetchError: null }), [])

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

      updateCategorizationUiState({ categorizeError: toAppError(error) })
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
        categorizeError: toAppError(error)
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
    fetchError: currentFetchUiState.fetchError,
    sessionInfo,
    fetchBugs,
    categorizeBugs,
    cancelCategorization,
    clearCategorizeError: () => updateCategorizationUiState({ categorizeError: null }),
    clearFetchError
  }
}
