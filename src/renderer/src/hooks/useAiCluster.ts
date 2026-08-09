import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react'
import type { SimilarityResult, SimilarityProgress, CategorizedBug } from '@shared/types'
import { extractErrorMessage } from '@shared/app-error'
import { isCancellationError } from '@renderer/lib/cancellation'
import {
  getSessionSnapshot,
  loadSession,
  refreshSession,
  subscribeToSession
} from '@renderer/state/session-store'

export interface UseAiClusterReturn {
  results: SimilarityResult | null
  bugs: CategorizedBug[]
  loading: boolean
  analyzing: boolean
  progress: SimilarityProgress | null
  canAnalyze: boolean
  isStale: boolean
  error: string | null
  analyze: () => Promise<void>
  cancel: () => Promise<void>
}

const NO_BUGS: CategorizedBug[] = []

export function useAiCluster(): UseAiClusterReturn {
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState<SimilarityProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cleanupRef = useRef<(() => void) | null>(null)
  const sessionState = useSyncExternalStore(
    subscribeToSession,
    getSessionSnapshot,
    getSessionSnapshot
  )

  // Load session on mount, and reattach to a similarity run already in
  // progress (e.g. after a renderer reload): the run itself keeps going in
  // the main process, so without this the user would be stuck looking at an
  // idle button with no way to see progress or cancel it.
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

      // The guard on cleanupRef matters if the user starts `analyze()` themselves
      // in the narrow window before this status check resolves: analyze() will
      // already have installed its own progress subscription, and subscribing a
      // second time here would leak one listener and double-fire the other.
      if (status.active && !cleanupRef.current) {
        setAnalyzing(true)

        const cleanupProgress = window.electronAPI.onFindSimilarProgress((data) => {
          setProgress(data as SimilarityProgress)
        })
        const cleanupDone = window.electronAPI.onFindSimilarDone(() => {
          // refreshSession(), not loadSession(): a read already in flight could
          // resolve with data captured before the run finished.
          void refreshSession()
          setAnalyzing(false)
          setProgress(null)
          cleanupProgress()
          cleanupDone()
          cleanupRef.current = null
        })
        cleanupRef.current = () => {
          cleanupProgress()
          cleanupDone()
        }
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
    categorizedAt && bugs.some((b) => b.macroCategory && b.macroCategory !== 'Non categorizzato')
  )

  const isStale = Boolean(results && categorizedAt && results.analyzedAt < categorizedAt)

  const analyze = useCallback(async () => {
    if (analyzing) {
      return
    }

    setAnalyzing(true)
    setProgress(null)
    setError(null)

    // Subscribe to progress updates
    const cleanup = window.electronAPI.onFindSimilarProgress((data) => {
      setProgress(data as SimilarityProgress)
    })
    cleanupRef.current = cleanup

    try {
      await window.electronAPI.findSimilarBugs()
      await refreshSession()
    } catch (err: unknown) {
      // A user-initiated cancellation is not a failure — leave `error` unset.
      if (!isCancellationError(err)) {
        setError(extractErrorMessage(err))
      }
    } finally {
      setAnalyzing(false)
      setProgress(null)
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [analyzing])

  const cancel = useCallback(async () => {
    await window.electronAPI.cancelFindSimilar()
  }, [])

  return {
    results,
    bugs,
    loading: sessionState.loading,
    analyzing,
    progress,
    canAnalyze,
    isStale,
    error,
    analyze,
    cancel
  }
}
