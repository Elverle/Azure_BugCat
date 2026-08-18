import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import type { CategorizedBug } from '@shared/types'
import type { SortState, SortKey } from '@renderer/lib/dashboard-utils'
import { getStatusBadgeClasses, getCategoryColor } from '@renderer/lib/badge-colors'
import { sentinelLabel } from '@renderer/lib/labels'
import { cn } from '@renderer/lib/utils'

interface BugTableProps {
  bugs: CategorizedBug[]
  sortState: SortState
  onSort: (key: SortKey) => void
  onBugClick?: (bug: CategorizedBug) => void
}

interface ColumnDef {
  key: keyof CategorizedBug
  label: string
  className: string
}

const COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID', className: 'w-20' },
  { key: 'title', label: 'Titolo', className: 'max-w-xs' },
  { key: 'priority', label: 'Priorità', className: 'w-16 text-center' },
  { key: 'state', label: 'Stato', className: 'w-24' },
  { key: 'assignee', label: 'Assegnatario', className: 'w-32' },
  { key: 'areaPath', label: 'Area Path', className: 'w-40' },
  { key: 'macroCategory', label: 'Macro-cat', className: 'w-28' },
  { key: 'technicalLayer', label: 'Sotto-cat', className: 'w-28' }
]

function SortIcon({
  columnKey,
  sortState
}: {
  columnKey: keyof CategorizedBug
  sortState: SortState
}): JSX.Element {
  if (sortState.key !== columnKey) {
    return <ChevronsUpDown className="w-4 h-4 text-gray-400" />
  }
  return sortState.direction === 'asc' ? (
    <ChevronUp className="w-4 h-4 text-gray-900" />
  ) : (
    <ChevronDown className="w-4 h-4 text-gray-900" />
  )
}

function renderCell(bug: CategorizedBug, key: keyof CategorizedBug): JSX.Element {
  switch (key) {
    case 'id':
      return <span className="text-blue-600 font-medium">#{bug.id}</span>

    case 'title':
      return <span className="font-medium text-gray-900 truncate block">{bug.title}</span>

    case 'priority':
      return <span className="text-center block">{bug.priority ?? '—'}</span>

    case 'state':
      return (
        <span
          className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            getStatusBadgeClasses(bug.state)
          )}
        >
          {bug.state}
        </span>
      )

    case 'assignee':
      return bug.assignee ? (
        <span>{bug.assignee}</span>
      ) : (
        <span className="italic text-gray-400">Unassigned</span>
      )

    case 'areaPath':
      return <span className="text-sm text-gray-600 truncate block">{bug.areaPath}</span>

    case 'macroCategory': {
      const macroColor = getCategoryColor(bug.macroCategory)
      return (
        <span
          className={cn(
            'px-2 py-1 rounded text-xs border border-gray-200',
            macroColor.bg,
            macroColor.text
          )}
        >
          {sentinelLabel(bug.macroCategory) || '—'}
        </span>
      )
    }

    case 'technicalLayer': {
      const subColor = getCategoryColor(bug.technicalLayer)
      return (
        <span
          className={cn(
            'px-2 py-1 rounded text-xs border border-gray-200',
            subColor.bg,
            subColor.text
          )}
        >
          {sentinelLabel(bug.technicalLayer) || '—'}
        </span>
      )
    }

    default:
      return <span>{String(bug[key] ?? '')}</span>
  }
}

function getAriaSortValue(
  columnKey: keyof CategorizedBug,
  sortState: SortState
): 'ascending' | 'descending' | 'none' {
  if (sortState.key !== columnKey) return 'none'
  return sortState.direction === 'asc' ? 'ascending' : 'descending'
}

export function BugTable({ bugs, sortState, onSort, onBugClick }: BugTableProps): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                  col.className
                )}
                aria-sort={getAriaSortValue(col.key, sortState)}
              >
                <button
                  type="button"
                  onClick={() => onSort(col.key)}
                  className="flex items-center gap-1 cursor-pointer select-none bg-transparent border-none p-0 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  <span>{col.label}</span>
                  <SortIcon columnKey={col.key} sortState={sortState} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bugs.map((bug) => (
            <tr
              key={bug.id}
              className="hover:bg-blue-50 cursor-pointer transition border-b border-gray-100"
              tabIndex={0}
              role={onBugClick ? 'button' : undefined}
              data-bug-click=""
              onClick={() => onBugClick?.(bug)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && onBugClick) {
                  e.preventDefault()
                  onBugClick(bug)
                }
              }}
            >
              {COLUMNS.map((col) => (
                <td key={col.key} className={cn('p-3', col.className)}>
                  {renderCell(bug, col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
