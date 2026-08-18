import { useEffect, useMemo, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Bot, ExternalLink } from 'lucide-react'
import type { CategorizedBug } from '@shared/types'
import { cn } from '@renderer/lib/utils'
import { getStatusBadgeClasses } from '@renderer/lib/badge-colors'
import { sentinelLabel } from '@renderer/lib/labels'
import {
  resolveAdoAttachmentImages,
  sanitizeBugDescriptionHtml,
  stripAdoAttachmentImages
} from '@renderer/lib/sanitize-bug-description-html'

interface BugDetailDrawerProps {
  bug: CategorizedBug | null
  isOpen: boolean
  width: number
  minWidth: number
  maxWidth: number
  onResize: (nextWidth: number) => void
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
  width,
  minWidth,
  maxWidth,
  onResize,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onViewInAdo,
  adoLinkEnabled
}: BugDetailDrawerProps): JSX.Element {
  const drawerRef = useRef<HTMLDivElement>(null)
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null)
  // Both pieces of state are tagged with the bug / html they belong to, so they
  // fall back to their default as soon as the drawer shows different content.
  const [expandedForBugId, setExpandedForBugId] = useState<number | null>(null)
  const [resolvedDescription, setResolvedDescription] = useState<{
    source: string
    html: string
  } | null>(null)

  // Parsing the description is the expensive part of a render: keep it tied to the
  // html itself, so resizing the drawer (a per-pixel prop change) does not redo it.
  const sanitizedDescriptionHtml = useMemo(
    () => sanitizeBugDescriptionHtml(bug?.descriptionHtml),
    [bug?.descriptionHtml]
  )
  const pendingDescriptionHtml = useMemo(
    () => stripAdoAttachmentImages(sanitizedDescriptionHtml),
    [sanitizedDescriptionHtml]
  )
  const hasAdoAttachmentImages = sanitizedDescriptionHtml !== pendingDescriptionHtml
  const descriptionExpanded = bug != null && expandedForBugId === bug.id
  const resolvedHtml =
    resolvedDescription?.source === sanitizedDescriptionHtml ? resolvedDescription.html : ''
  const descriptionHtml = hasAdoAttachmentImages
    ? resolvedHtml || pendingDescriptionHtml
    : sanitizedDescriptionHtml
  const hasDescriptionContent = Boolean(descriptionHtml || bug?.description)

  useEffect(() => {
    if (!hasAdoAttachmentImages) {
      return
    }

    let disposed = false

    async function resolveDescriptionHtml(): Promise<void> {
      try {
        const html = await resolveAdoAttachmentImages(
          sanitizedDescriptionHtml,
          window.electronAPI.fetchAdoAttachmentDataUrl
        )
        if (!disposed) {
          setResolvedDescription({ source: sanitizedDescriptionHtml, html })
        }
      } catch {
        if (!disposed) {
          setResolvedDescription({ source: sanitizedDescriptionHtml, html: pendingDescriptionHtml })
        }
      }
    }

    void resolveDescriptionHtml()

    return () => {
      disposed = true
    }
  }, [hasAdoAttachmentImages, pendingDescriptionHtml, sanitizedDescriptionHtml])

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

  useEffect(() => {
    function handleMouseMove(e: MouseEvent): void {
      const resizeState = resizeStateRef.current
      if (!resizeState) return

      const delta = resizeState.startX - e.clientX
      const nextWidth = resizeState.startWidth + delta
      onResize(Math.min(maxWidth, Math.max(minWidth, nextWidth)))
    }

    function handleMouseUp(): void {
      resizeStateRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [maxWidth, minWidth, onResize])

  function handleResizeMouseDown(e: React.MouseEvent<HTMLDivElement>): void {
    resizeStateRef.current = { startX: e.clientX, startWidth: width }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    e.preventDefault()
  }

  return (
    <div
      ref={drawerRef}
      className={cn(
        'bg-white border-l border-gray-200 shadow-xl fixed right-0 top-[57px] bottom-0 overflow-y-auto z-20 flex flex-col transition-transform duration-200',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
      style={{ width: `${width}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        role="separator"
        aria-label="Ridimensiona dettaglio"
        aria-orientation="vertical"
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        aria-valuenow={width}
        className="absolute left-0 top-0 bottom-0 w-2 -translate-x-1/2 cursor-col-resize bg-transparent before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-gray-200 hover:before:bg-indigo-400"
        onMouseDown={handleResizeMouseDown}
      />
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
                    <div className="text-sm font-medium text-gray-900">
                      {sentinelLabel(bug.macroCategory)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-purple-600 uppercase font-bold tracking-wider mb-1">
                      Sub-Category
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {sentinelLabel(bug.technicalLayer)}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-purple-600 uppercase font-bold tracking-wider mb-1 mt-2">
                  Reasoning
                </div>
                <p className="text-sm text-gray-700 bg-white p-3 rounded border border-purple-100 shadow-sm leading-relaxed">
                  {sentinelLabel(bug.categoryReason)}
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
                  <div className="text-sm text-gray-900">{bug.priority ?? '—'}</div>
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
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-xs text-gray-500">Description</div>
                  <button
                    onClick={() => setExpandedForBugId(descriptionExpanded ? null : bug.id)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    {descriptionExpanded ? 'Riduci descrizione' : 'Espandi descrizione'}
                  </button>
                </div>
                {hasDescriptionContent ? (
                  <div
                    className={cn(
                      'prose prose-sm max-w-none text-gray-800 bg-gray-50 p-4 rounded-lg border border-gray-100 transition-all duration-200 prose-img:my-4 prose-img:max-w-full prose-img:rounded-md prose-img:border prose-img:border-gray-200 prose-a:text-blue-600',
                      descriptionExpanded ? 'overflow-visible' : 'max-h-64 overflow-y-auto'
                    )}
                    {...(descriptionHtml
                      ? { dangerouslySetInnerHTML: { __html: descriptionHtml } }
                      : {})}
                  >
                    {descriptionHtml ? null : bug.description}
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
