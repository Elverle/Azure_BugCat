import type { AppError, ErrorCode } from './types'

/**
 * Exhaustive by construction: `Record<ErrorCode, true>` makes `tsc` fail if a
 * member is ever added to `ErrorCode` without being listed here. That matters
 * because an unlisted code would be rejected by `isAppError`, re-encoded as
 * `UNKNOWN_ERROR`, and lost to the renderer — the exact defect this module exists
 * to prevent, silently re-armed.
 */
const ERROR_CODE_TABLE: Record<ErrorCode, true> = {
  ADO_AUTH_ERROR: true,
  ADO_NOT_FOUND: true,
  ADO_EMPTY: true,
  ADO_TIMEOUT: true,
  LLM_AUTH_ERROR: true,
  LLM_RATE_LIMIT: true,
  OPERATION_CANCELLED: true,
  LLM_TIMEOUT: true,
  LLM_PARSE_ERROR: true,
  STORE_ERROR: true,
  UNKNOWN_ERROR: true
}

const ERROR_CODES: ReadonlySet<string> = new Set(Object.keys(ERROR_CODE_TABLE))

const SEPARATOR = '::'

/**
 * Narrows to the application's own error shape: a plain `{ code, message }`
 * object whose `code` belongs to the `ErrorCode` taxonomy. `Error` instances
 * are deliberately excluded — a provider SDK error carrying its own `code`
 * (`'invalid_api_key'`, `'rate_limit_exceeded'`, ...) must be mapped, not
 * re-thrown as if it were already one of ours.
 */
export function isAppError(error: unknown): error is AppError {
  return (
    error !== null &&
    typeof error === 'object' &&
    !(error instanceof Error) &&
    'code' in error &&
    'message' in error &&
    typeof (error as AppError).message === 'string' &&
    ERROR_CODES.has(String((error as AppError).code))
  )
}

export function throwAppError(code: ErrorCode, message: string, details?: unknown): never {
  const err: AppError = { code, message, ...(details !== undefined && { details }) }
  throw err
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message
  if (error !== null && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  if (typeof error === 'string' && error.trim()) return error
  return 'Unknown error'
}

/**
 * Narrows anything thrown across IPC to the app's error shape, so the renderer
 * can render a title from `code` instead of parsing the message. Anything that
 * is not already one of ours keeps its text and becomes UNKNOWN_ERROR.
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error
  return { code: 'UNKNOWN_ERROR', message: extractErrorMessage(error) }
}

/**
 * Main-process side: turn any thrown value into an `Error` whose message
 * survives Electron IPC serialization. Electron keeps only a real `Error`'s
 * `message` when it rejects an `ipcMain.handle` call — custom properties are
 * dropped even when assigned onto an `Error` — so the code travels inside the
 * message and is recovered by `decodeIpcError` on the other side.
 */
export function encodeIpcError(error: unknown): Error {
  const appError: AppError = isAppError(error)
    ? error
    : { code: 'UNKNOWN_ERROR', message: extractErrorMessage(error) }
  return new Error(`${appError.code}${SEPARATOR}${appError.message}`)
}

/** Preload side: recover the AppError from the wire format (tolerating Electron's remote-method prefix). */
export function decodeIpcError(error: unknown): AppError {
  const raw = error instanceof Error ? error.message : String(error)
  const match = raw.match(/([A-Z_]+)::([\s\S]*)$/)
  if (match && ERROR_CODES.has(match[1])) {
    return { code: match[1] as ErrorCode, message: match[2] }
  }
  return { code: 'UNKNOWN_ERROR', message: raw }
}
