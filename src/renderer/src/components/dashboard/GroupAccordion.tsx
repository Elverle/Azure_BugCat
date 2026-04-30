import { ChevronUp, ChevronDown, Layers, Sparkles } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface GroupAccordionProps {
  groupName: string
  bugCount: number
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function GroupAccordion({
  groupName,
  bugCount,
  isExpanded,
  onToggle,
  children
}: GroupAccordionProps): JSX.Element {
  const contentId = `group-content-${groupName.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div
      className={cn(
        'mb-5 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition',
        !isExpanded && 'opacity-75 hover:opacity-100'
      )}
    >
      <button
        type="button"
        className={cn(
          'w-full border-b border-gray-200 p-3.5 flex items-center justify-between cursor-pointer transition text-left',
          isExpanded ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'bg-gray-50 hover:bg-gray-100'
        )}
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-8 h-8 rounded flex items-center justify-center',
              isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600'
            )}
          >
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">
                {groupName}
              </h3>
              <span className="px-2 py-0.5 bg-white border border-gray-200 text-gray-600 rounded-full text-[10px] font-bold">
                {bugCount} Bug
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              <Sparkles className="w-3 h-3 text-indigo-400 inline mr-1" />
              Raggruppamento AI
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isExpanded && <div id={contentId} role="region" aria-label={groupName}>{children}</div>}
    </div>
  )
}
