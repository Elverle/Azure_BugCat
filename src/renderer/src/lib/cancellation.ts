/**
 * True when an IPC rejection is a user-initiated cancellation rather than a
 * real failure. Shared by useDashboard (categorization) and useAiCluster
 * (similarity) so a cancelled run never surfaces through the `error` state
 * the same way an actual failure does.
 */
export function isCancellationError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'OPERATION_CANCELLED'
  )
}
