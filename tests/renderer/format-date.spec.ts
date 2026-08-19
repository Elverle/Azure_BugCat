// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { formatDate, formatDateOnly } from '@renderer/lib/date-utils'

describe('formatDate', () => {
  // Asserting on the parts rather than on the separators: the locale now comes
  // from the machine, so pinning "DD/MM/YYYY" would make this test pass or fail
  // depending on who runs it.
  it('contains the day, month and year of the given date', () => {
    const result = formatDate('2024-12-25T14:05:00Z')
    expect(result).toContain('25')
    expect(result).toContain('12')
    expect(result).toContain('2024')
  })

  it('formats the time on a 24-hour clock regardless of locale', () => {
    const result = formatDate('2024-12-25T14:05:00Z')
    expect(result).not.toMatch(/AM|PM/i)
  })

  it('produces different output for different dates', () => {
    expect(formatDate('2025-01-01T00:00:00Z')).not.toBe(formatDate('2025-07-04T12:00:00Z'))
  })
})

describe('formatDateOnly', () => {
  it('contains the date parts and no time', () => {
    const result = formatDateOnly('2024-12-25T14:05:00Z')
    expect(result).toContain('25')
    expect(result).toContain('2024')
    expect(result).not.toMatch(/\d{2}:\d{2}/)
  })
})
