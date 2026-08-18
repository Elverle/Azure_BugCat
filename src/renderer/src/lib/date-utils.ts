/**
 * Locale comes from the machine, the clock does not: a triage tool is read at
 * a glance and a 12-hour timestamp changes meaning between users. `hour12` is
 * pinned, everything else follows the system.
 */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

export function formatDateOnly(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
