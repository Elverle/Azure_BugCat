import type { SimilarityGroup, CategorizedBug } from '@shared/types'
import { cn } from '@renderer/lib/utils'

interface SimilarityGroupCardProps {
  group: SimilarityGroup
  bugs: CategorizedBug[]
  onBugClick: (bugId: number) => void
}

function getScoreBadgeClasses(score: number): string {
  if (score >= 0.9) return 'bg-green-100 text-green-800 border-green-200'
  if (score >= 0.7) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  return 'bg-orange-100 text-orange-800 border-orange-200'
}

function getScoreLabel(score: number): string {
  if (score >= 0.9) return 'Molto alta'
  if (score >= 0.7) return 'Alta'
  return 'Media'
}

export function SimilarityGroupCard({
  group,
  bugs,
  onBugClick
}: SimilarityGroupCardProps): JSX.Element {
  const scorePercent = Math.round(group.similarityScore * 100)
  const badgeClasses = getScoreBadgeClasses(group.similarityScore)

  // Resolve bug titles from IDs
  const bugMap = new Map(bugs.map((b) => [b.id, b]))

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className={cn('text-xs font-bold px-2 py-1 rounded border shrink-0', badgeClasses)}>
            {scorePercent}%
          </span>
          <p className="text-xs text-gray-500">
            Similarita: {getScoreLabel(group.similarityScore)}
          </p>
        </div>
        <span className="text-xs text-gray-400 shrink-0">
          {group.bugIds.length} {group.bugIds.length === 1 ? 'bug' : 'bug'}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)]">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Bug coinvolti
          </p>
          <div className="ml-1 border-l-2 border-indigo-100 pl-3 space-y-1.5">
            {group.bugIds.map((bugId) => {
              const bug = bugMap.get(bugId)
              return (
                <button
                  key={bugId}
                  onClick={() => onBugClick(bugId)}
                  className="block w-full text-left text-sm hover:bg-indigo-50 rounded px-2 py-1 transition group"
                >
                  <span className="text-indigo-600 font-mono text-xs group-hover:underline">
                    #{bugId}
                  </span>
                  <span className="text-gray-600 ml-2">
                    {bug ? bug.title : '(bug non trovato)'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-md border border-indigo-100 bg-indigo-50/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 mb-2">
            Motivazione
          </p>
          <p className="text-sm text-gray-700 leading-6">{group.reason}</p>
        </div>
      </div>
    </div>
  )
}
