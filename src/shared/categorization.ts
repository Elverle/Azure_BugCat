/**
 * Machine values, never shown as they are: the renderer maps them through
 * `sentinelLabel()` in lib/labels.ts. The `__name__` shape cannot collide with
 * a category the user types in Settings, and a path that forgets the label
 * layer shows `__uncategorized__` on screen instead of failing silently.
 */
export const UNCATEGORIZED = '__uncategorized__'
export const PROCESSING_ERROR = '__processing_error__'
export const NO_LLM_RESPONSE = '__no_llm_response__'
export const NOT_AVAILABLE = '__not_available__'
export const PARSE_ERROR = '__parse_error__'

/**
 * Stand-in key for bugs with no assignee, used by both the assignee filter and
 * the assignee grouping. Never persisted — it is computed at render time from
 * `bug.assignee`, so it has no entry in the store migration.
 */
export const UNASSIGNED = '__unassigned__'

/**
 * A categorization result whose macroCategory is the UNCATEGORIZED sentinel
 * comes from a fallback path (chunk failure or missing LLM response), never
 * from the LLM itself (the prompt forbids it). Such results must not be
 * persisted as completed categorizations.
 */
export function isFailedCategorization(macroCategory: string): boolean {
  return macroCategory === UNCATEGORIZED
}
