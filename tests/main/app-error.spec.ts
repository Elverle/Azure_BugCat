import { describe, expect, it } from 'vitest'
import { decodeIpcError, encodeIpcError, isAppError, toAppError } from '@shared/app-error'

describe('app-error IPC contract', () => {
  it('round-trips an AppError through encode/decode', () => {
    const encoded = encodeIpcError({ code: 'ADO_AUTH_ERROR', message: 'Bad PAT' })
    expect(decodeIpcError(encoded)).toEqual({ code: 'ADO_AUTH_ERROR', message: 'Bad PAT' })
  })

  it('decodes the Electron remote-method prefix', () => {
    const wireError = new Error(
      "Error invoking remote method 'ado:fetch-bugs': Error: ADO_TIMEOUT::Azure DevOps connection timed out"
    )
    expect(decodeIpcError(wireError)).toEqual({
      code: 'ADO_TIMEOUT',
      message: 'Azure DevOps connection timed out'
    })
  })

  it('falls back to UNKNOWN_ERROR for arbitrary errors', () => {
    expect(decodeIpcError(new Error('boom'))).toEqual({ code: 'UNKNOWN_ERROR', message: 'boom' })
    expect(decodeIpcError('boom')).toMatchObject({ code: 'UNKNOWN_ERROR' })
  })

  it('encodes non-AppError values preserving their message', () => {
    expect(encodeIpcError(new Error('boom')).message).toBe('UNKNOWN_ERROR::boom')
  })

  it('isAppError narrows correctly', () => {
    expect(isAppError({ code: 'STORE_ERROR', message: 'x' })).toBe(true)
    expect(isAppError(new Error('x'))).toBe(false)
    expect(isAppError(null)).toBe(false)
    // A provider SDK error often carries its own `code`; it is not an AppError.
    expect(isAppError({ code: 'invalid_api_key', message: 'x' })).toBe(false)
  })

  it('keeps the code when the value is already an AppError', () => {
    expect(toAppError({ code: 'ADO_TIMEOUT', message: 'timed out' })).toEqual({
      code: 'ADO_TIMEOUT',
      message: 'timed out'
    })
  })

  it('wraps anything else as UNKNOWN_ERROR', () => {
    expect(toAppError(new Error('boom'))).toEqual({ code: 'UNKNOWN_ERROR', message: 'boom' })
  })
})
