/**
 * What the main process sends the renderer in place of a stored secret. The
 * renderer never receives the PAT or the API key: it receives this, shows the
 * field as already configured, and sends it back untouched on save — which the
 * main process reads as "keep what you have".
 *
 * Same machine-value convention as the sentinels of phase 2 (`__uncategorized__`
 * and friends): a value that can be compared and persisted, never displayed raw.
 */
export const SECRET_PLACEHOLDER = '__stored__'

export function isSecretPlaceholder(value: string | undefined): boolean {
  return value === SECRET_PLACEHOLDER
}
