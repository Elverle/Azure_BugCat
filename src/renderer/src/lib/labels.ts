import {
  UNCATEGORIZED,
  PROCESSING_ERROR,
  NO_LLM_RESPONSE,
  NOT_AVAILABLE,
  PARSE_ERROR,
  UNASSIGNED
} from '@shared/categorization'

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
