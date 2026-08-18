import { describe, it, expect } from 'vitest'
import { sentinelLabel } from '@renderer/lib/labels'
import {
  UNCATEGORIZED,
  PROCESSING_ERROR,
  NO_LLM_RESPONSE,
  NOT_AVAILABLE,
  PARSE_ERROR,
  UNASSIGNED
} from '@shared/categorization'

describe('sentinelLabel', () => {
  // Written against the constants rather than their literal values, so the spec
  // stays valid both before and after the sentinels turn into machine values.
  it('maps the machine values to their english label', () => {
    expect(sentinelLabel(UNCATEGORIZED)).toBe('Uncategorized')
    expect(sentinelLabel(PROCESSING_ERROR)).toBe('Processing error')
    expect(sentinelLabel(NO_LLM_RESPONSE)).toBe('No LLM response')
    expect(sentinelLabel(NOT_AVAILABLE)).toBe('N/A')
    expect(sentinelLabel(PARSE_ERROR)).toBe('Parse error')
    expect(sentinelLabel(UNASSIGNED)).toBe('Unassigned')
  })

  it('returns any other value untouched', () => {
    // A user's own category, the model's free-form reason, a technical layer:
    // none of these are sentinels and none of them may be rewritten.
    expect(sentinelLabel('Payments')).toBe('Payments')
    expect(sentinelLabel('FE/BE')).toBe('FE/BE')
    expect(sentinelLabel('the title points at a frontend issue')).toBe(
      'the title points at a frontend issue'
    )
    expect(sentinelLabel('')).toBe('')
  })
})
