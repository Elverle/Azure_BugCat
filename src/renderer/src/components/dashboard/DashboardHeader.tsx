import { RotateCw, Loader2 } from 'lucide-react'
import type { ChunkProgress } from '@shared/types'
import { formatDate } from '@renderer/lib/date-utils'

interface DashboardHeaderProps {
  onFetch: () => void
  onCategorize: () => void
  loading: boolean
  sessionInfo: { fetchedAt: string | null; categorizedAt: string | null }
  progress: ChunkProgress | null
}

export function DashboardHeader({
  onFetch,
  onCategorize,
  loading,
  sessionInfo,
  progress
}: DashboardHeaderProps): JSX.Element {
  const subtitle = sessionInfo.fetchedAt
    ? `Dati aggiornati il ${formatDate(sessionInfo.fetchedAt)}${sessionInfo.categorizedAt ? ` • Categorizzati il ${formatDate(sessionInfo.categorizedAt)}` : ''}`
    : 'Nessun dato caricato'

  return (
    <div className="flex justify-between items-end mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bug Triage</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onFetch}
          disabled={loading}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RotateCw className="w-4 h-4 mr-2" />
          )}
          Fetch Bugs
        </button>
        <button
          onClick={onCategorize}
          disabled={loading}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:from-indigo-700 hover:to-purple-700 shadow-sm transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {progress
            ? `Categorizing ${progress.completed}/${progress.total}`
            : '✨ Categorize'}
        </button>
      </div>
    </div>
  )
}
