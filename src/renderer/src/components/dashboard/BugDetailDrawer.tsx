import { useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Bot, ExternalLink } from 'lucide-react'
import type { CategorizedBug } from '@shared/types'
import { cn } from '@renderer/lib/utils'
import { getStatusBadgeClasses } from '@renderer/lib/badge-colors'

interface BugDetailDrawerProps {
  bug: CategorizedBug | null
  isOpen: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
  onViewInAdo: () => void
  adoLinkEnabled: boolean
}

export default function BugDetailDrawer({
  bug,
  isOpen,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onViewInAdo,
  adoLinkEnabled
}: BugDetailDrawerProps): JSX.Element {
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (!isOpen || !drawerRef.current) return
      if (drawerRef.current.contains(e.target as Node)) return
      // Don't close if clicking a bug row/card (they will open a new bug)
      const target = e.target as HTMLElement
      if (target.closest('[data-bug-click]')) return
      onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  return (
    <div
      ref={drawerRef}
      className={cn(
        'w-[400px] bg-white border-l border-gray-200 shadow-xl fixed right-0 top-[57px] bottom-0 overflow-y-auto z-20 flex flex-col transition-transform duration-200',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {bug && (
        <>
          {/* Header */}
          <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600 font-bold">#{bug.id}</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                    getStatusBadgeClasses(bug.state)
                  )}
                >
                  {bug.state}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">{bug.title}</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onPrev}
                disabled={!hasPrev}
                aria-label="Bug precedente"
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed p-1"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={onNext}
                disabled={!hasNext}
                aria-label="Bug successivo"
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed p-1"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={onClose}
                aria-label="Chiudi dettaglio"
                className="text-gray-400 hover:text-gray-600 p-1 ml-2"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 flex-1">
            {/* LLM Card */}
            {bug.macroCategory ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-purple-800 font-semibold text-sm mb-3">
                  <Bot size={16} /> LLM Categorization
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="text-[11px] text-purple-600 uppercase font-bold tracking-wider mb-1">
                      Macro-Category
                    </div>
                    <div className="text-sm font-medium text-gray-900">{bug.macroCategory}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-purple-600 uppercase font-bold tracking-wider mb-1">
                      Sub-Category
                    </div>
                    <div className="text-sm font-medium text-gray-900">{bug.subCategory}</div>
                  </div>
                </div>
                <div className="text-[11px] text-purple-600 uppercase font-bold tracking-wider mb-1 mt-2">
                  Reasoning
                </div>
                <p className="text-sm text-gray-700 bg-white p-3 rounded border border-purple-100 shadow-sm leading-relaxed">
                  {bug.categoryReason}
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-gray-500 font-semibold text-sm">
                  <Bot size={16} />
                  <span className="italic">Non ancora categorizzato</span>
                </div>
              </div>
            )}

            {/* ADO Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Assignee</div>
                  <div className="text-sm text-gray-900">{bug.assignee || 'Non assegnato'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Area Path</div>
                  <div className="text-sm text-gray-900">{bug.areaPath}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Priority</div>
                  <div className="text-sm text-gray-900">{bug.priority}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Created</div>
                  <div className="text-sm text-gray-900">
                    {new Date(bug.createdDate).toLocaleDateString('it-IT')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Updated</div>
                  <div className="text-sm text-gray-900">
                    {new Date(bug.updatedDate).toLocaleDateString('it-IT')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Tags</div>
                  <div className="text-sm text-gray-900">
                    {bug.tags.length > 0 ? bug.tags.join(', ') : '—'}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-2">Description</div>
                {bug.description ? (
                  <div className="prose prose-sm text-gray-800 bg-gray-50 p-4 rounded-lg border border-gray-100 h-64 overflow-y-auto whitespace-pre-line">
                    {bug.description}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded-lg border border-gray-100">
                    Nessuna descrizione disponibile
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onViewInAdo}
              disabled={!adoLinkEnabled}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-center w-full gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              View in Azure DevOps <ExternalLink size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
