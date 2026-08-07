// @vitest-environment jsdom

import { useSyncExternalStore } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionData } from '@shared/types'
import {
  getSessionSnapshot,
  loadSession,
  refreshSession,
  resetSessionStoreForTests,
  subscribeToSession
} from '@renderer/state/session-store'

const fetchedSession: SessionData = {
  bugs: [],
  fetchedAt: '2026-01-01T00:00:00.000Z',
  lastFetchNewCount: 2
}

const categorizedSession: SessionData = {
  bugs: [],
  fetchedAt: '2026-01-01T00:00:00.000Z',
  categorizedAt: '2026-01-01T12:00:00.000Z'
}

function installGetSession(...values: (SessionData | null)[]): ReturnType<typeof vi.fn> {
  const getSession = vi.fn()
  for (const value of values) {
    getSession.mockResolvedValueOnce(value)
  }
  getSession.mockResolvedValue(values[values.length - 1] ?? null)

  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: { getSession }
  })

  return getSession
}

describe('session store', () => {
  beforeEach(() => {
    resetSessionStoreForTests()
  })

  afterEach(() => {
    resetSessionStoreForTests()
    vi.restoreAllMocks()
  })

  it('starts with no session and loading true', () => {
    expect(getSessionSnapshot()).toEqual({ session: null, loading: true })
  })

  it('issues a single getSession for subscribers that load together', async () => {
    const getSession = installGetSession(fetchedSession)
    const first = vi.fn()
    const second = vi.fn()
    subscribeToSession(first)
    subscribeToSession(second)

    await Promise.all([loadSession(), loadSession()])

    expect(getSession).toHaveBeenCalledTimes(1)
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    expect(getSessionSnapshot()).toEqual({ session: fetchedSession, loading: false })
  })

  it('returns a referentially stable snapshot while the state does not change', async () => {
    installGetSession(fetchedSession)

    const initial = getSessionSnapshot()
    expect(getSessionSnapshot()).toBe(initial)

    await loadSession()

    const loaded = getSessionSnapshot()
    expect(loaded).not.toBe(initial)
    expect(getSessionSnapshot()).toBe(loaded)
    expect(getSessionSnapshot()).toBe(loaded)
  })

  it('backs useSyncExternalStore without a re-render loop', async () => {
    installGetSession(fetchedSession)
    let renderCount = 0

    const { result } = renderHook(() => {
      renderCount += 1
      return useSyncExternalStore(subscribeToSession, getSessionSnapshot, getSessionSnapshot)
    })

    expect(result.current.loading).toBe(true)

    await act(async () => {
      await loadSession()
    })

    expect(result.current).toEqual({ session: fetchedSession, loading: false })
    expect(renderCount).toBeLessThanOrEqual(4)
  })

  it('refreshSession re-reads the session and notifies every subscriber', async () => {
    const getSession = installGetSession(fetchedSession, categorizedSession)
    await loadSession()

    const first = vi.fn()
    const second = vi.fn()
    subscribeToSession(first)
    subscribeToSession(second)

    await refreshSession()

    expect(getSession).toHaveBeenCalledTimes(2)
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    expect(getSessionSnapshot().session).toEqual(categorizedSession)
  })

  it('stops notifying a listener after it unsubscribes', async () => {
    installGetSession(fetchedSession, categorizedSession)
    const listener = vi.fn()
    const unsubscribe = subscribeToSession(listener)

    await loadSession()
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    await refreshSession()

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('ignores a stale read that settles after a newer one', async () => {
    let resolveStaleRead!: (session: SessionData | null) => void
    const getSession = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveStaleRead = resolve
          })
      )
      .mockResolvedValueOnce(categorizedSession)
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { getSession }
    })

    const staleRead = loadSession()
    const freshRead = refreshSession()
    await freshRead
    expect(getSessionSnapshot().session).toEqual(categorizedSession)

    const listener = vi.fn()
    subscribeToSession(listener)

    resolveStaleRead(fetchedSession)
    await staleRead

    expect(getSessionSnapshot().session).toEqual(categorizedSession)
    expect(listener).not.toHaveBeenCalled()
  })

  it('drops a read still in flight when the store is reset', async () => {
    let resolveRead!: (session: SessionData | null) => void
    const getSession = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve
        })
    )
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { getSession }
    })

    const pendingRead = loadSession()
    resetSessionStoreForTests()

    const listener = vi.fn()
    subscribeToSession(listener)

    resolveRead(fetchedSession)
    await pendingRead

    expect(getSessionSnapshot()).toEqual({ session: null, loading: true })
    expect(listener).not.toHaveBeenCalled()
  })

  it('clears loading when the session read fails', async () => {
    const getSession = vi.fn().mockRejectedValue(new Error('store unreachable'))
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { getSession }
    })

    await expect(loadSession()).rejects.toThrow('store unreachable')
    expect(getSessionSnapshot()).toEqual({ session: null, loading: false })
  })

  it('resetSessionStoreForTests restores the initial state and notifies', async () => {
    installGetSession(fetchedSession)
    await loadSession()
    expect(getSessionSnapshot().session).toEqual(fetchedSession)

    const listener = vi.fn()
    subscribeToSession(listener)

    resetSessionStoreForTests()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(getSessionSnapshot()).toEqual({ session: null, loading: true })
  })
})
