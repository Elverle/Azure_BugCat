import { AppError } from '../../shared/types'

export function isBlockingLLMError(error: AppError): boolean {
  return (
    error.code === 'LLM_AUTH_ERROR' ||
    error.code === 'LLM_TIMEOUT' ||
    (error.code === 'LLM_PARSE_ERROR' &&
      error.details !== null &&
      typeof error.details === 'object' &&
      'reason' in error.details &&
      (error.details as { reason?: unknown }).reason === 'structured-output-routing-mismatch')
  )
}
