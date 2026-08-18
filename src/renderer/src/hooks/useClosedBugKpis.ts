import { useState, useEffect } from 'react'
import type { AppError, ClosedCatalogSnapshot } from '@shared/types'
import { toAppError } from '@shared/app-error'
import { computeClosedBugKpis, type ClosedBugKpiData } from '@renderer/lib/closed-bug-kpis'

export interface UseClosedBugKpisReturn {
  kpis: ClosedBugKpiData | null
  loading: boolean
  error: AppError | null
}

export function useClosedBugKpis(): UseClosedBugKpisReturn {
  const [kpis, setKpis] = useState<ClosedBugKpiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AppError | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      try {
        const raw = (await window.electronAPI.getCatalogClosed()) as ClosedCatalogSnapshot
        if (!cancelled) {
          setKpis(computeClosedBugKpis(raw.closedBugs, raw.fetchedAt, raw.lastClearedAt))
        }
      } catch (err) {
        if (!cancelled) {
          setError(toAppError(err))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { kpis, loading, error }
}
