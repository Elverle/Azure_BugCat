export const UNCATEGORIZED = 'Non categorizzato'
export const PROCESSING_ERROR = 'Errore elaborazione'
export const NO_LLM_RESPONSE = 'Nessuna risposta LLM'
export const NOT_AVAILABLE = 'N/D'

/** Persisted in `technicalLayer` when the LLM response cannot be parsed at all. */
export const PARSE_ERROR = 'Errore parsing'

/**
 * Stand-in key for bugs with no assignee, used by both the assignee filter and
 * the assignee grouping. Never persisted — it is computed at render time from
 * `bug.assignee`, so it has no entry in the store migration.
 */
export const UNASSIGNED = 'Unassigned'

/**
 * A categorization result whose macroCategory is the UNCATEGORIZED sentinel
 * comes from a fallback path (chunk failure or missing LLM response), never
 * from the LLM itself (the prompt forbids it). Such results must not be
 * persisted as completed categorizations.
 */
export function isFailedCategorization(macroCategory: string): boolean {
  return macroCategory === UNCATEGORIZED
}
