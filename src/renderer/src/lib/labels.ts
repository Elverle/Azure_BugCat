import {
  UNCATEGORIZED,
  PROCESSING_ERROR,
  NO_LLM_RESPONSE,
  NOT_AVAILABLE,
  PARSE_ERROR,
  UNASSIGNED
} from '@shared/categorization'
import type { ErrorCode } from '@shared/types'

/**
 * The single presentation layer of the app: machine values are persisted and
 * compared, labels are shown. Keeping the two apart is what makes a future
 * localization a matter of translating this file instead of migrating the
 * store a second time.
 */
const SENTINEL_LABELS: Record<string, string> = {
  [UNCATEGORIZED]: 'Uncategorized',
  [PROCESSING_ERROR]: 'Processing error',
  [NO_LLM_RESPONSE]: 'No LLM response',
  [NOT_AVAILABLE]: 'N/A',
  [PARSE_ERROR]: 'Parse error',
  [UNASSIGNED]: 'Unassigned'
}

/**
 * Total by design: anything that is not a sentinel — a user's own category, a
 * technical layer, the model's free-form reason — comes back untouched, so
 * call sites never need to ask whether a value is a sentinel first.
 */
export function sentinelLabel(value: string): string {
  return SENTINEL_LABELS[value] ?? value
}

/**
 * `Record<ErrorCode, string>` on purpose: adding a member to the taxonomy
 * without giving it a title becomes a compile error, the same guarantee
 * ERROR_CODE_TABLE gives in shared/app-error.ts.
 */
const ERROR_LABELS: Record<ErrorCode, string> = {
  ADO_AUTH_ERROR: 'Azure DevOps authentication failed',
  ADO_NOT_FOUND: 'Azure DevOps resource not found',
  ADO_EMPTY: 'The query returned no bugs',
  ADO_TIMEOUT: 'Azure DevOps request timed out',
  LLM_AUTH_ERROR: 'LLM provider authentication failed',
  LLM_RATE_LIMIT: 'LLM provider rate limit reached',
  OPERATION_CANCELLED: 'Operation cancelled',
  LLM_TIMEOUT: 'The LLM request timed out',
  LLM_PARSE_ERROR: 'The LLM response could not be read',
  STORE_ERROR: 'Configuration problem',
  UNKNOWN_ERROR: 'Unexpected error'
}

/**
 * The title of an error dialog: derived from the code, so the message the main
 * process produced can stay underneath as diagnostic detail instead of being
 * the only thing the user reads.
 */
export function errorLabel(code: ErrorCode): string {
  return ERROR_LABELS[code]
}
