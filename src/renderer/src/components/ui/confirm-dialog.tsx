import { useEffect, useCallback, useId, useRef } from 'react'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'destructive' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel,
  variant = 'default',
  onConfirm,
  onCancel
}: ConfirmDialogProps): React.ReactNode {
  const id = useId()
  const titleId = `${id}-title`
  const descriptionId = `${id}-description`
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<Element | null>(null)

  // `onCancel` is frequently passed as an inline arrow by call sites (e.g.
  // `onCancel={() => setConfirmOpen(false)}`), so it gets a new identity on
  // every parent render. Reading it through a ref lets `handleKeyDown` (and
  // the mount effect below) stay referentially stable across those renders,
  // instead of tearing the effect down and re-running it on every keystroke
  // of unrelated parent state.
  const onCancelRef = useRef(onCancel)
  useEffect(() => {
    onCancelRef.current = onCancel
  })

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancelRef.current()
      return
    }
    // Focus trap: cycle Tab within the dialog.
    if (e.key === 'Tab') {
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      // Focus can land on the dialog container itself (tabIndex={-1}; the
      // user clicking dead space inside the dialog focuses it) or, in
      // principle, outside the dialog altogether. Neither case is "first" nor
      // "last", so without this check Shift+Tab would escape the trap
      // backwards instead of wrapping into it.
      const isOutsideTerminals = active !== dialog && !dialog.contains(active)
      const isOnContainer = active === dialog
      const needsRedirect = isOnContainer || isOutsideTerminals

      if (e.shiftKey && (active === first || needsRedirect)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || needsRedirect)) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [])

  useEffect(() => {
    if (!open) return

    // Save current focus to restore later
    previousFocusRef.current = document.activeElement

    // Move focus into the dialog: target its first focusable element (whatever
    // buttons it renders — a dialog without a cancel button only has the confirm
    // button), falling back to the dialog container itself so the Tab trap above
    // always has a starting point inside the dialog.
    requestAnimationFrame(() => {
      const dialog = dialogRef.current
      if (!dialog) return
      const firstFocusable = dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      ;(firstFocusable ?? dialog).focus()
    })

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus to the element that opened the dialog
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus()
      }
    }
    // `handleKeyDown` is intentionally omitted: it is stable (see the ref
    // above), and including a fresh reference from a parent's inline handler
    // would re-run this effect — and its focus-stealing requestAnimationFrame
    // — on every unrelated parent re-render while the dialog is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={cn(
          'bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4',
          'animate-in fade-in-0 zoom-in-95'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm text-gray-600">
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          {cancelLabel && (
            <Button variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
