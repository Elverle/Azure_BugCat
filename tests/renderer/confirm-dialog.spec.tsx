// @vitest-environment jsdom

import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

describe('ConfirmDialog Tab trap', () => {
  it('cycles Tab and Shift+Tab between the two buttons without leaving the dialog', async () => {
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

    const cancelButton = screen.getByRole('button', { name: 'Annulla' })
    const confirmButton = screen.getByRole('button', { name: 'Pulisci' })

    await waitFor(() => expect(cancelButton).toHaveFocus())

    // Shift+Tab from the first (cancel) button wraps to the last (confirm) button.
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(confirmButton).toHaveFocus()

    // Tab from the last (confirm) button wraps back to the first (cancel) button.
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(cancelButton).toHaveFocus()
  })

  it('keeps Tab and Shift+Tab on the single button of a one-button dialog', async () => {
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

    const confirmButton = screen.getByRole('button', { name: 'Chiudi' })
    await waitFor(() => expect(confirmButton).toHaveFocus())

    fireEvent.keyDown(document, { key: 'Tab' })
    expect(confirmButton).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(confirmButton).toHaveFocus()
  })

  it('redirects Tab/Shift+Tab into the dialog when focus sits on the dialog container itself', async () => {
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

    const dialog = screen.getByRole('dialog')
    const cancelButton = screen.getByRole('button', { name: 'Annulla' })
    const confirmButton = screen.getByRole('button', { name: 'Pulisci' })

    await waitFor(() => expect(cancelButton).toHaveFocus())

    // Simulate the user clicking dead space inside the dialog panel: the panel
    // has tabIndex={-1} and can receive focus directly, landing focus neither
    // on the first nor the last focusable element.
    dialog.focus()
    expect(dialog).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(confirmButton).toHaveFocus()

    dialog.focus()
    expect(dialog).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Tab' })
    expect(cancelButton).toHaveFocus()
  })
})

describe('ConfirmDialog focus stability across parent re-renders', () => {
  function RerenderHarness(): React.ReactNode {
    const [, forceRerender] = useState(0)
    return (
      <div>
        <button onClick={() => forceRerender((n) => n + 1)}>rerender parent</button>
        <ConfirmDialog
          open
          title="Conferma pulizia"
          description="This cannot be undone"
          confirmLabel="Pulisci"
          cancelLabel="Annulla"
          onConfirm={vi.fn()}
          // Inline arrow, recreated on every render: mirrors the real call
          // sites (e.g. SettingsPage.tsx) that pass `() => setConfirmOpen(false)`.
          onCancel={() => {}}
        />
      </div>
    )
  }

  it('does not move focus off the second button when the parent re-renders (stale handler identity)', async () => {
    render(<RerenderHarness />)

    const cancelButton = screen.getByRole('button', { name: 'Annulla' })
    const confirmButton = screen.getByRole('button', { name: 'Pulisci' })

    await waitFor(() => expect(cancelButton).toHaveFocus())

    confirmButton.focus()
    expect(confirmButton).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'rerender parent' }))

    // Give a buggy re-run of the mount effect (and its requestAnimationFrame)
    // two frames to settle before asserting focus was left untouched.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    expect(confirmButton).toHaveFocus()
  })
})
