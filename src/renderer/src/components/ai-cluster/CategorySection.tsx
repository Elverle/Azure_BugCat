import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import { SimilarityGroupCard } from './SimilarityGroupCard'
import type { SimilarityGroup, CategorizedBug } from '@shared/types'
import { cn } from '@renderer/lib/utils'

interface CategorySectionProps {
  category: string
  groups: SimilarityGroup[]
  bugs: CategorizedBug[]
  error?: string
  onBugClick: (bugId: number) => void
}

export function CategorySection({
  category,
  groups,
  bugs,
  error,
  onBugClick
}: CategorySectionProps): JSX.Element {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <h3 className="font-semibold text-gray-800">{category}</h3>
          {!error && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
              {groups.length} {groups.length === 1 ? 'gruppo' : 'gruppi'}
            </span>
          )}
        </div>
        {error && (
          <span className="flex items-center gap-1 text-xs text-red-500">
            <AlertCircle className="w-3.5 h-3.5" />
            Errore
          </span>
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-gray-100 p-4">
          {error ? (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-md p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              Nessun bug simile rilevato in questa categoria
            </p>
          ) : (
            <div className="space-y-3">
              {groups.map((group, index) => (
                <SimilarityGroupCard
                  key={index}
                  group={group}
                  bugs={bugs}
                  onBugClick={onBugClick}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
