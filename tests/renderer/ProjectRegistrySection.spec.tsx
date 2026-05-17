// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ProjectRegistrySection } from '@renderer/components/settings/ProjectRegistrySection'
import type { ProjectEntry } from '@shared/types'

const defaultProps = {
  projects: [] as ProjectEntry[],
  errors: {} as Record<string, string | null>,
  touched: {} as Record<string, boolean>,
  onAddProject: vi.fn(),
  onUpdateProject: vi.fn(),
  onRemoveProject: vi.fn(),
  onSelectDirectory: vi.fn().mockResolvedValue(null)
}

const blankProject: ProjectEntry = {
  id: 'p1',
  name: '',
  path: '',
  type: 'backend',
  description: '',
  keywords: []
}

describe('ProjectRegistrySection', () => {
  it('hides field errors on a newly added project when not touched', () => {
    render(
      <ProjectRegistrySection
        {...defaultProps}
        projects={[blankProject]}
        errors={{
          'project-0-name': 'Il nome è obbligatorio',
          'project-0-path': 'Il percorso è obbligatorio'
        }}
        touched={{}}
      />
    )

    expect(screen.queryByText('Il nome è obbligatorio')).not.toBeInTheDocument()
    expect(screen.queryByText('Il percorso è obbligatorio')).not.toBeInTheDocument()
  })

  it('shows field errors after the specific field is touched', () => {
    render(
      <ProjectRegistrySection
        {...defaultProps}
        projects={[blankProject]}
        errors={{
          'project-0-name': 'Il nome è obbligatorio',
          'project-0-path': 'Il percorso è obbligatorio'
        }}
        touched={{
          'project-0-name': true
        }}
      />
    )

    expect(screen.getByText('Il nome è obbligatorio')).toBeInTheDocument()
    expect(screen.queryByText('Il percorso è obbligatorio')).not.toBeInTheDocument()
  })
})
