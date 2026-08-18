import { useEffect, useCallback, useRef, useSyncExternalStore } from 'react'
import type { SimilarityResult, SimilarityProgress, CategorizedBug } from '@shared/types'
import { extractErrorMessage } from '@shared/app-error'
import { UNCATEGORIZED } from '@shared/categorization'
import { isCancellationError } from '@renderer/lib/cancellation'
import {
  getSessionSnapshot,
  loadSession,
  refreshSession,
  subscribeToSession
} from '@renderer/state/session-store'
import { createUiStore } from '@renderer/state/create-ui-store'

export interface UseAiClusterReturn {
  results: SimilarityResult | null
  bugs: CategorizedBug[]
  loading: boolean
  analyzing: boolean
  isCancelling: boolean
  progress: SimilarityProgress | null
  canAnalyze: boolean
  isStale: boolean
  error: string | null
  analyze: () => Promise<void>
  cancel: () => Promise<void>
  clearError: () => void
}

const NO_BUGS: CategorizedBug[] = []

// Module-level store, not component-local useState: `DashboardSimilaritySection`
// is conditionally rendered (DashboardPage switches view mode), so it unmounts
// on a view switch — more frequent than the route navigation useDashboard's
// equivalent store was built for. Without this, a run that finishes or fails
// while the user switched away would lose its result or its error.
interface AiClusterUiState {
  analyzing: boolean
  isCancelling: boolean
  progress: SimilarityProgress | null
  error: string | null
}

const INITIAL_AI_CLUSTER_UI_STATE: AiClusterUiState = {
  analyzing: false,
  isCancelling: false,
  progress: null,
  error: null
}

const aiClusterUiStore = createUiStore(INITIAL_AI_CLUSTER_UI_STATE)
const getAiClusterUiState = aiClusterUiStore.getSnapshot
const subscribeToAiClusterUiState = aiClusterUiStore.subscribe
const updateAiClusterUiState = aiClusterUiStore.update

export function resetAiClusterUiStateForTests(): void {
  aiClusterUiStore.reset()
}

export function useAiCluster(): UseAiClusterReturn {
  const cleanupRef = useRef<(() => void) | null>(null)
  const sessionState = useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    getSessionSnapshot
  )
  const currentAiClusterUiState = useSyncExternalStore(
    subscribeToAiClusterUiState,
    getAiClusterUiState,
    getAiClusterUiState
  )

  // Load session on mount, and reconcile with a similarity run the main
  // process may already be tracking (e.g. after a renderer reload): the run
  // itself keeps going there, so without this the user would be stuck looking
  // at an idle button with no way to see progress or cancel it.
  //
  // FIX 1 (regression from d00a666): `analyzing` used to be able to get stuck
  // at `true` forever — the only thing that ever cleared it was the DONE
  // listener installed inside the `status.active` branch below, and
  // unmounting (e.g. switching away from the Similarità tab, which unmounts
  // DashboardSimilaritySection) tore that listener down with nothing to
  // re-arm it. Because this effect re-runs fresh on every mount (each new
  // component instance gets its own run of it) and always re-queries the main
  // process's live status, the `else if` branch below is enough to heal a
  // flag left stuck by an earlier mount — no extra effect is needed for that.
  //
  // A first attempt mirrored useDashboard's shape more literally, moving the
  // DONE subscription into a second effect keyed on `analyzing`
  // (useDashboard.ts:188-199). That introduced a race specific to this hook's
  // "clear a stale flag" requirement: on a remount where the module-scope
  // store still has `analyzing: true` left over from a finished run, the
  // separate effect fires synchronously at mount — before this async status
  // check can resolve and clear the stale flag — and eagerly re-subscribes to
  // a run that is already gone, which re-triggers the exact "stuck forever"
  // bug this fix exists to close. Keeping the subscription inline here, so it
  // only ever runs once the live status has actually been verified, avoids
  // that race; `analyze()` below is unaffected, since it always subscribes
  // its own progress listener directly and synchronously.
  useEffect(() => {
    let cancelled = false

    async function init(): Promise<void> {
      const [, status] = await Promise.all([
        loadSession(),
        window.electronAPI.getFindSimilarStatus()
      ])

      if (cancelled) {
        return
      }

      // The `!cleanupRef.current` guard matters if the user starts `analyze()`
      // themselves in the narrow window before this status check resolves:
      // `analyze()` will already have installed its own progress subscription,
      // and neither branch below must clobber state a locally started run
      // already owns.
      if (status.active && !cleanupRef.current) {
        updateAiClusterUiState({ analyzing: true })

        const cleanupProgress = window.electronAPI.onFindSimilarProgress((data) => {
          updateAiClusterUiState({ progress: data as SimilarityProgress })
        })
        const cleanupDone = window.electronAPI.onFindSimilarDone(() => {
          // refreshSession(), not loadSession(): a read already in flight could
          // resolve with data captured before the run finished.
          void refreshSession()
          updateAiClusterUiState({ analyzing: false, isCancelling: false, progress: null })
          cleanupProgress()
          cleanupDone()
          cleanupRef.current = null
        })
        cleanupRef.current = () => {
          cleanupProgress()
          cleanupDone()
        }
      } else if (!status.active && getAiClusterUiState().analyzing && !cleanupRef.current) {
        // No run is active on the main process, yet the module-scope store
        // still says otherwise — a leftover from a run that finished while
        // nothing was subscribed to observe it. Clear it instead of leaving
        // the button reading "Annulla analisi" forever, and pull in whatever
        // the main process persisted while we were not looking.
        updateAiClusterUiState({ analyzing: false, isCancelling: false, progress: null })
        void refreshSession()
      }
    }

    // The mount read touches only the local store and the main process's
    // in-memory run map, so a failure here has no user-actionable message to
    // show. Swallowing it deliberately, because an unhandled rejection would
    // otherwise surface as a console error instead (mirrors useDashboard).
    init().catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  // Cleanup any active listener on unmount.
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [])

  const session = sessionState.session
  const bugs = session?.bugs ?? NO_BUGS
  const categorizedAt = session?.categorizedAt ?? null
  // The main process persists the analysis into the session, so the store stays
  // the single source of truth: a fetch or a categorization drops the results
  // there and this hook reflects it without needing to be remounted.
  const results = session?.similarityResults ?? null

  const canAnalyze = Boolean(
    categorizedAt && bugs.some((b) => b.macroCategory && b.macroCategory !== UNCATEGORIZED)
  )

  const isStale = Boolean(results && categorizedAt && results.analyzedAt < categorizedAt)

  const analyze = useCallback(async () => {
    // Mirrors categorizeBugs's `loading || isCategorizing` guard: a run must not
    // be startable while the session is still loading.
    if (sessionState.loading || currentAiClusterUiState.analyzing) {
      return
    }

    updateAiClusterUiState({
      analyzing: true,
      isCancelling: false,
      progress: null,
      error: null
    })

    // Subscribe to progress updates
    const cleanup = window.electronAPI.onFindSimilarProgress((data) => {
      updateAiClusterUiState({ progress: data as SimilarityProgress })
    })
    cleanupRef.current = cleanup

    try {
      await window.electronAPI.findSimilarBugs()
      await refreshSession()
    } catch (err: unknown) {
      // A user-initiated cancellation is not a failure — leave `error` unset.
      if (!isCancellationError(err)) {
        updateAiClusterUiState({ error: extractErrorMessage(err) })
      }
    } finally {
      updateAiClusterUiState({ analyzing: false, isCancelling: false, progress: null })
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [sessionState.loading, currentAiClusterUiState.analyzing])

  const cancel = useCallback(async () => {
    if (!currentAiClusterUiState.analyzing || currentAiClusterUiState.isCancelling) {
      return
    }

    updateAiClusterUiState({ isCancelling: true })

    try {
      const result = (await window.electronAPI.cancelFindSimilar()) as { cancelled?: boolean }
      if (!result?.cancelled) {
        // The main process reports there was no run to cancel (e.g. it already
        // finished): revert the flag so the button state visibly reflects it,
        // instead of leaving the user with no feedback at all.
        updateAiClusterUiState({ isCancelling: false })
      }
    } catch (error: unknown) {
      updateAiClusterUiState({
        isCancelling: false,
        error: extractErrorMessage(error)
      })
    }
  }, [currentAiClusterUiState.analyzing, currentAiClusterUiState.isCancelling])

  const clearError = useCallback(() => updateAiClusterUiState({ error: null }), [])

  return {
    results,
    bugs,
    loading: sessionState.loading,
    analyzing: currentAiClusterUiState.analyzing,
    isCancelling: currentAiClusterUiState.isCancelling,
    progress: currentAiClusterUiState.progress,
    canAnalyze,
    isStale,
    error: currentAiClusterUiState.error,
    analyze,
    cancel,
    clearError
  }
}
