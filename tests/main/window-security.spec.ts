import { describe, expect, it, vi } from 'vitest'
import type { WebContents } from 'electron'
import { attachNavigationGuard } from '@main/window-security'

describe('attachNavigationGuard', () => {
  it('prevents top-level navigation', () => {
    const listeners = new Map<string, (event: { preventDefault: () => void }, url: string) => void>()
    const webContents = {
      on: vi.fn((evt: string, cb: (event: { preventDefault: () => void }, url: string) => void) =>
        listeners.set(evt, cb)
      )
    } as unknown as WebContents

    attachNavigationGuard(webContents)

    const preventDefault = vi.fn()
    listeners.get('will-navigate')?.({ preventDefault }, 'https://evil.example')

    expect(preventDefault).toHaveBeenCalled()
  })

  it('registers exactly one will-navigate listener', () => {
    const on = vi.fn()
    const webContents = { on } as unknown as WebContents

    attachNavigationGuard(webContents)

    expect(on).toHaveBeenCalledTimes(1)
    expect(on).toHaveBeenCalledWith('will-navigate', expect.any(Function))
  })
})
