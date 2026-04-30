import type { CategorizedBug } from '@shared/types'
import { getStatusBadgeClasses, getCategoryColor, getSubCategoryBgTint } from '@renderer/lib/badge-colors'
import { cn } from '@renderer/lib/utils'

interface BugCardProps {
  bug: CategorizedBug
  onClick?: (bug: CategorizedBug) => void
}

export default function BugCard({ bug, onClick }: BugCardProps): JSX.Element {
  const macroColor = getCategoryColor(bug.macroCategory)
  const subColor = getCategoryColor(bug.subCategory)

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 p-4 shadow-sm cursor-pointer hover:shadow-md transition',
        getSubCategoryBgTint(bug.subCategory)
      )}
      onClick={() => onClick?.(bug)}
    >
      {/* Top row: ID + Status badge */}
      <div className="flex items-center justify-between">
        <span className="text-blue-600 font-medium text-sm">#{bug.id}</span>
        <span
          className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            getStatusBadgeClasses(bug.state)
          )}
        >
          {bug.state}
        </span>
      </div>

      {/* Title */}
      <p className="text-gray-900 font-medium mt-1">{bug.title}</p>

      {/* Bottom section */}
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        {bug.macroCategory && (
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', macroColor.bg, macroColor.text)}>
            {bug.macroCategory}
          </span>
        )}
        {bug.subCategory && (
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', subColor.bg, subColor.text)}>
            {bug.subCategory}
          </span>
        )}
        <span className="text-xs text-gray-500">P{bug.priority}</span>
        {bug.assignee ? (
          <span className="text-sm text-gray-600">{bug.assignee}</span>
        ) : (
          <span className="text-sm text-gray-400 italic">Unassigned</span>
        )}
        {bug.areaPath && (
          <span className="text-xs text-gray-500 truncate max-w-[160px]">{bug.areaPath}</span>
        )}
      </div>
    </div>
  )
}
