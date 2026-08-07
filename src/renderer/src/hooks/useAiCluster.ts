import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react'
import type { SimilarityResult, SimilarityProgress, CategorizedBug } from '@shared/types'
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

  // Load session on mount
  useEffect(() => {
    loadSession()
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
      const message =
        err !== null && typeof err === 'object' && 'message' in err
          ? (err as { message: string }).message
          : 'Errore durante l\u2019analisi di similarità'
      setError(message)
    } finally {
      setAnalyzing(false)
      setProgress(null)
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
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
    analyze
  }
}
