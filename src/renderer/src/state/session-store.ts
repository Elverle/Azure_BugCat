import type { SessionData } from '@shared/types'

export interface SessionState {
  /** Last session read from the main process, `null` when there is no session yet. */
  session: SessionData | null
  /** True until the first read completes; a later refresh does not flip it back on. */
  loading: boolean
}

const INITIAL_SESSION_STATE: SessionState = { session: null, loading: true }

let sessionState: SessionState = INITIAL_SESSION_STATE
let inFlightRead: Promise<void> | null = null
const listeners = new Set<() => void>()

function emitSessionChange(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Returns the cached state object on purpose: `useSyncExternalStore` calls the
 * getter on every render and compares with `Object.is`, so building a fresh
 * object here would spin the renderer in an infinite loop.
 */
export function getSessionSnapshot(): SessionState {
  return sessionState
}

async function readSession(): Promise<void> {
  try {
    const session = (await window.electronAPI.getSession()) as SessionData | null
    sessionState = { session, loading: false }
  } catch (error: unknown) {
    sessionState = { session: sessionState.session, loading: false }
    throw error
  } finally {
    emitSessionChange()
  }
}

function startRead(): Promise<void> {
  const pending = readSession()
  inFlightRead = pending

  const clearInFlight = (): void => {
    if (inFlightRead === pending) {
      inFlightRead = null
    }
  }
  // Attaching both handlers also marks `pending` as handled, so callers are free
  // to fire-and-forget without producing an unhandled rejection.
  pending.then(clearInFlight, clearInFlight)

  return pending
}

/** Reads the session, joining a read that is already in flight instead of duplicating it. */
export async function loadSession(): Promise<void> {
  if (inFlightRead) {
    return inFlightRead
  }
  return startRead()
}

/** Forces a fresh read after an operation that invalidated the session. */
export async function refreshSession(): Promise<void> {
  return startRead()
}

export function resetSessionStoreForTests(): void {
  sessionState = INITIAL_SESSION_STATE
  inFlightRead = null
  emitSessionChange()
}
