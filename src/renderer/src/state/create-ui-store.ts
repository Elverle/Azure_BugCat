/**
 * Factory for a plain module-level UI state store, backed by `useSyncExternalStore`.
 *
 * Component-local `useState` loses its value whenever the component unmounts,
 * which happens on route navigation and on a view switch. A store created here
 * lives at module scope, so a run that finishes (or fails) while the user is
 * looking elsewhere still has somewhere to land its result.
 *
 * This is for plain UI state only (flags, progress, error strings). It does not
 * cover data with its own read-generation / in-flight-join semantics — that
 * belongs in a dedicated store like `session-store.ts`.
 */
export interface UiStore<T> {
  /**
   * Returns the cached state object on purpose: `useSyncExternalStore` calls the
   * getter on every render and compares with `Object.is`, so building a fresh
   * object here would spin the renderer in an infinite loop.
   */
  getSnapshot: () => T
  subscribe: (listener: () => void) => () => void
  /** Accepts either a partial merge into the current state or a full updater function. */
  update: (updater: Partial<T> | ((state: T) => T)) => void
  /** Restores the initial state passed to `createUiStore` and notifies subscribers. */
  reset: () => void
}

export function createUiStore<T>(initialState: T): UiStore<T> {
  let state: T = initialState
  const listeners = new Set<() => void>()

  function emitChange(): void {
    for (const listener of listeners) {
      listener()
    }
  }

  function getSnapshot(): T {
    return state
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function update(updater: Partial<T> | ((state: T) => T)): void {
    state = typeof updater === 'function' ? updater(state) : { ...state, ...updater }
    emitChange()
  }

  function reset(): void {
    state = initialState
    emitChange()
  }

  return { getSnapshot, subscribe, update, reset }
}
