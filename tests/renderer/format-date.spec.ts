// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { formatDate } from '@renderer/lib/date-utils'

describe('formatDate', () => {
  it('returns a string matching DD/MM/YYYY, HH:MM pattern', () => {
    const result = formatDate('2025-06-15T10:30:00Z')
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4},?\s\d{2}:\d{2}/)
  })

  it('produces correct date parts for a known ISO date', () => {
    const result = formatDate('2024-12-25T14:05:00Z')
    expect(result).toContain('25')
    expect(result).toContain('12')
    expect(result).toContain('2024')
  })

  it('produces different output for different dates', () => {
    const a = formatDate('2025-01-01T00:00:00Z')
    const b = formatDate('2025-07-04T12:00:00Z')
    expect(a).not.toBe(b)
  })
})
