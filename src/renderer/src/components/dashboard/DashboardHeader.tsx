import { RotateCw, Loader2, X } from 'lucide-react'
import type { ChunkProgress } from '@shared/types'
import { formatDate } from '@renderer/lib/date-utils'

interface DashboardHeaderProps {
  onFetch: () => void
  onCategorize: () => void
  onCancelCategorize: () => void
  loading: boolean
  isCategorizing: boolean
  isCancelling: boolean
  sessionInfo: {
    fetchedAt: string | null
    categorizedAt: string | null
    lastFetchNewCount: number | null
  }
  progress: ChunkProgress | null
}

export function DashboardHeader({
  onFetch,
  onCategorize,
  onCancelCategorize,
  loading,
  isCategorizing,
  isCancelling,
  sessionInfo,
  progress
}: DashboardHeaderProps): JSX.Element {
  const subtitle = sessionInfo.fetchedAt
    ? `Data updated on ${formatDate(sessionInfo.fetchedAt)}${sessionInfo.categorizedAt ? ` • Categorized on ${formatDate(sessionInfo.categorizedAt)}` : ''}`
    : 'No data loaded'

  return (
    <div className="flex justify-between items-end mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bug Triage</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
      <div className="flex gap-3 items-start">
        <div className="flex flex-col items-start">
          <button
            onClick={onFetch}
            disabled={loading || isCategorizing}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RotateCw className="w-4 h-4 mr-2" />
            )}
            Fetch Bugs
          </button>
          {sessionInfo.fetchedAt && sessionInfo.lastFetchNewCount !== null ? (
            <p className="mt-1 pl-1 text-xs text-gray-500">
              New compared to history: {sessionInfo.lastFetchNewCount}
            </p>
          ) : null}
        </div>
        {isCategorizing ? (
          <button
            onClick={onCancelCategorize}
            disabled={isCancelling}
            className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 shadow-sm transition flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isCancelling ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <X className="w-4 h-4 mr-2" />
            )}
            {isCancelling
              ? 'Cancelling...'
              : progress
                ? `Cancel (${progress.completed}/${progress.total})`
                : 'Cancel'}
          </button>
        ) : (
          <button
            onClick={onCategorize}
            disabled={loading}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:from-indigo-700 hover:to-purple-700 shadow-sm transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✨ Categorize
          </button>
        )}
      </div>
    </div>
  )
}
