export const UNCATEGORIZED = 'Non categorizzato'
export const PROCESSING_ERROR = 'Errore elaborazione'
export const NO_LLM_RESPONSE = 'Nessuna risposta LLM'
export const NOT_AVAILABLE = 'N/D'

/**
 * A categorization result whose macroCategory is the UNCATEGORIZED sentinel
 * comes from a fallback path (chunk failure or missing LLM response), never
 * from the LLM itself (the prompt forbids it). Such results must not be
 * persisted as completed categorizations.
 */
export function isFailedCategorization(macroCategory: string): boolean {
  return macroCategory === UNCATEGORIZED
}
