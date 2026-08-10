// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { createUiStore } from '@renderer/state/create-ui-store'

interface CounterState {
  count: number
  label: string
}

const INITIAL_STATE: CounterState = { count: 0, label: 'idle' }

describe('createUiStore', () => {
  it('returns the same snapshot object identity until an update happens', () => {
    const store = createUiStore(INITIAL_STATE)

    const first = store.getSnapshot()
    const second = store.getSnapshot()

    // useSyncExternalStore calls the getter on every render and compares with
    // Object.is: a fresh object per call would spin the renderer in a loop.
    expect(first).toBe(second)
    expect(first).toEqual(INITIAL_STATE)
  })

  it('merges a partial update into the current state and changes snapshot identity', () => {
    const store = createUiStore(INITIAL_STATE)
    const before = store.getSnapshot()

    store.update({ count: 5 })

    const after = store.getSnapshot()
    expect(after).not.toBe(before)
    expect(after).toEqual({ count: 5, label: 'idle' })
  })

  it('accepts a functional updater that receives the current state', () => {
    const store = createUiStore(INITIAL_STATE)
    store.update({ count: 5 })

    store.update((state) => ({ ...state, count: state.count + 1 }))

    expect(store.getSnapshot()).toEqual({ count: 6, label: 'idle' })
  })

  it('notifies every subscribed listener on an update', () => {
    const store = createUiStore(INITIAL_STATE)
    const first = vi.fn()
    const second = vi.fn()
    store.subscribe(first)
    store.subscribe(second)

    store.update({ count: 1 })

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('stops notifying a listener once it unsubscribes', () => {
    const store = createUiStore(INITIAL_STATE)
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.update({ count: 1 })
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    store.update({ count: 2 })

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('reset restores the initial state and notifies subscribers', () => {
    const store = createUiStore(INITIAL_STATE)
    store.update({ count: 42, label: 'busy' })

    const listener = vi.fn()
    store.subscribe(listener)

    store.reset()

    expect(store.getSnapshot()).toEqual(INITIAL_STATE)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('keeps two stores created from the factory fully independent', () => {
    const storeA = createUiStore({ count: 0 })
    const storeB = createUiStore({ count: 100 })

    storeA.update({ count: 1 })

    expect(storeA.getSnapshot()).toEqual({ count: 1 })
    expect(storeB.getSnapshot()).toEqual({ count: 100 })
  })
})
