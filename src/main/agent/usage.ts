import type { AgentUsageStats } from '@shared/types'

export function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function mergeAgentUsage(
  current: AgentUsageStats | undefined,
  next: AgentUsageStats | undefined
): AgentUsageStats | undefined {
  if (!current && !next) {
    return undefined
  }

  const merged: AgentUsageStats = {}
  const numericKeys: Array<
    keyof Pick<
      AgentUsageStats,
      | 'inputTokens'
      | 'outputTokens'
      | 'cacheReadTokens'
      | 'cacheWriteTokens'
      | 'reasoningTokens'
      | 'durationMs'
    >
  > = [
    'inputTokens',
    'outputTokens',
    'cacheReadTokens',
    'cacheWriteTokens',
    'reasoningTokens',
    'durationMs'
  ]

  for (const key of numericKeys) {
    const left = current?.[key]
    const right = next?.[key]

    if (left === undefined && right === undefined) {
      continue
    }

    merged[key] = (left ?? 0) + (right ?? 0)
  }

  merged.model = next?.model ?? current?.model

  if (merged.inputTokens !== undefined || merged.outputTokens !== undefined) {
    merged.totalTokens = (merged.inputTokens ?? 0) + (merged.outputTokens ?? 0)
  } else if (current?.totalTokens !== undefined || next?.totalTokens !== undefined) {
    merged.totalTokens = (current?.totalTokens ?? 0) + (next?.totalTokens ?? 0)
  }

  return merged
}
