import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  SimilarityResult,
  SimilarityProgress,
  SessionData,
  CategorizedBug
} from '@shared/types'

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

export function useAiCluster(): UseAiClusterReturn {
  const [results, setResults] = useState<SimilarityResult | null>(null)
  const [bugs, setBugs] = useState<CategorizedBug[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState<SimilarityProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [categorizedAt, setCategorizedAt] = useState<string | null>(null)

  const cleanupRef = useRef<(() => void) | null>(null)

  // Load session on mount
  useEffect(() => {
    let cancelled = false

    async function init(): Promise<void> {
      try {
        const session = (await window.electronAPI.getSession()) as SessionData | null
        if (!cancelled && session) {
          setCategorizedAt(session.categorizedAt ?? null)
          setResults(session.similarityResults ?? null)
          setBugs(session.bugs)
        }
      } finally {
        if (!cancelled) setLoading(false)
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
      const result = (await window.electronAPI.findSimilarBugs()) as SimilarityResult
      setResults(result)
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

  return { results, bugs, loading, analyzing, progress, canAnalyze, isStale, error, analyze }
}
