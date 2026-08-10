// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from '@renderer/components/ui/confirm-dialog'

describe('ConfirmDialog focus management', () => {
  it('moves focus inside the dialog when it opens without a cancel button', async () => {
    render(
      <ConfirmDialog
        open
        title="Errore categorizzazione"
        description="Something went wrong"
        confirmLabel="Chiudi"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    const dialog = screen.getByRole('dialog')

    // The Tab-trap in handleKeyDown only engages once focus is already inside the
    // dialog; a dialog with only a confirm button must not leave focus behind it.
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true)
    })
    expect(screen.getByRole('button', { name: 'Chiudi' })).toHaveFocus()
  })

  it('still focuses the cancel button when both buttons are rendered', async () => {
    render(
      <ConfirmDialog
        open
        title="Conferma pulizia"
        description="This cannot be undone"
        confirmLabel="Pulisci"
        cancelLabel="Annulla"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Annulla' })).toHaveFocus()
    })
  })

  it('restores focus to the previously focused element on close', async () => {
    const opener = document.createElement('button')
    opener.textContent = 'Open'
    document.body.appendChild(opener)
    opener.focus()
    expect(opener).toHaveFocus()

    const { rerender } = render(
      <ConfirmDialog
        open
        title="Errore fetch"
        description="Fetch failed"
        confirmLabel="Chiudi"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Chiudi' })).toHaveFocus()
    })

    rerender(
      <ConfirmDialog
        open={false}
        title="Errore fetch"
        description="Fetch failed"
        confirmLabel="Chiudi"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(opener).toHaveFocus()
    })

    opener.remove()
  })
})
