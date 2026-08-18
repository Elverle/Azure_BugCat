import { describe, expect, it, vi } from 'vitest'
import type { WebContents } from 'electron'
import { attachNavigationGuard } from '@main/window-security'

function createFakeWebContents(currentUrl: string): {
  webContents: WebContents
  trigger: (event: { preventDefault: () => void }, url: string) => void
} {
  const listeners = new Map<string, (event: { preventDefault: () => void }, url: string) => void>()
  const webContents = {
    getURL: vi.fn(() => currentUrl),
    on: vi.fn((evt: string, cb: (event: { preventDefault: () => void }, url: string) => void) =>
      listeners.set(evt, cb)
    )
  } as unknown as WebContents

  return {
    webContents,
    trigger: (event, url) => listeners.get('will-navigate')?.(event, url)
  }
}

describe('attachNavigationGuard', () => {
  it('prevents top-level navigation to a different document', () => {
    const { webContents, trigger } = createFakeWebContents('file:///app/index.html')

    attachNavigationGuard(webContents)

    const preventDefault = vi.fn()
    trigger({ preventDefault }, 'https://evil.example')

    expect(preventDefault).toHaveBeenCalled()
  })

  it('allows a reload of the currently loaded document (same url)', () => {
    const currentUrl = 'file:///app/index.html'
    const { webContents, trigger } = createFakeWebContents(currentUrl)

    attachNavigationGuard(webContents)

    const preventDefault = vi.fn()
    trigger({ preventDefault }, currentUrl)

    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('allows a hash-only navigation on the same document', () => {
    const currentUrl = 'file:///app/index.html'
    const { webContents, trigger } = createFakeWebContents(currentUrl)

    attachNavigationGuard(webContents)

    const preventDefault = vi.fn()
    trigger({ preventDefault }, `${currentUrl}#/settings`)

    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('prevents navigation to a different document even when it shares a hash', () => {
    const { webContents, trigger } = createFakeWebContents('file:///app/index.html')

    attachNavigationGuard(webContents)

    const preventDefault = vi.fn()
    trigger({ preventDefault }, 'https://evil.example#/settings')

    expect(preventDefault).toHaveBeenCalled()
  })

  it('registers exactly one will-navigate listener', () => {
    const on = vi.fn()
    const webContents = { on, getURL: vi.fn(() => '') } as unknown as WebContents

    attachNavigationGuard(webContents)

    expect(on).toHaveBeenCalledTimes(1)
    expect(on).toHaveBeenCalledWith('will-navigate', expect.any(Function))
  })
})
