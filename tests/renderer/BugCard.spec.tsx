// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import BugCard from '@renderer/components/dashboard/BugCard'
import type { CategorizedBug } from '@shared/types'

function makeBug(overrides: Partial<CategorizedBug> = {}): CategorizedBug {
  return {
    id: 1024,
    title: 'OAuth login fails',
    state: 'Active',
    assignee: 'Laura K.',
    areaPath: 'ECommerce\\Frontend\\Auth',
    description: 'MSAL token error',
    priority: 2,
    createdDate: '2026-01-01',
    updatedDate: '2026-01-15',
    tags: ['auth'],
    macroCategory: 'Authentication',
    technicalLayer: 'OAuth',
    categoryReason: 'OAuth related',
    categorizedAt: '2026-01-15',
    ...overrides
  }
}

describe('BugCard', () => {
  it('shows the priority as P<n> when the bug has one', () => {
    render(<BugCard bug={makeBug({ priority: 3 })} />)

    expect(screen.getByText('P3')).toBeInTheDocument()
  })

  it('shows a dash instead of a bare P when the priority is missing', () => {
    render(<BugCard bug={makeBug({ priority: null })} />)

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('P')).not.toBeInTheDocument()
  })
})
