import { useState, useEffect, useCallback, useRef } from 'react'
import type { CategorizedBug, SessionData, ChunkProgress } from '@shared/types'

export interface UseDashboardReturn {
  bugs: CategorizedBug[]
  loading: boolean
  progress: ChunkProgress | null
  sessionInfo: { fetchedAt: string | null; categorizedAt: string | null }
  fetchBugs: () => Promise<void>
  categorizeBugs: () => Promise<void>
}

export function useDashboard(): UseDashboardReturn {
  const [bugs, setBugs] = useState<CategorizedBug[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<ChunkProgress | null>(null)
  const [sessionInfo, setSessionInfo] = useState<{
    fetchedAt: string | null
    categorizedAt: string | null
  }>({
    fetchedAt: null,
    categorizedAt: null
  })

  const cleanupRef = useRef<(() => void) | null>(null)

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
        await loadSession()
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
    setLoading(true)
    setProgress(null)

    // Subscribe to progress updates
    const cleanup = window.electronAPI.onCategorizeProgress((data) => {
      setProgress(data as ChunkProgress)
    })
    cleanupRef.current = cleanup

    try {
      await window.electronAPI.categorizeBugs()
      await loadSession()
    } finally {
      setLoading(false)
      setProgress(null)
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [loadSession])

  return {
    bugs,
    loading,
    progress,
    sessionInfo,
    fetchBugs,
    categorizeBugs
  }
}
