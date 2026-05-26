// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AnalyzeStartPanel } from '@renderer/components/dashboard/AnalyzeStartPanel'
import type { CategorizedBug, ProjectEntry } from '@shared/types'

const mockBug: CategorizedBug = {
  id: 42,
  title: 'Test bug',
  state: 'Active',
  assignee: 'Dev',
  areaPath: 'Area',
  description: 'desc',
  priority: 1,
  createdDate: '2026-01-01T00:00:00Z',
  updatedDate: '2026-01-01T00:00:00Z',
  tags: [],
  macroCategory: 'Cat',
  subCategory: 'Sub',
  categoryReason: 'Reason',
  categorizedAt: '2026-01-01T00:00:00Z'
}

const mockBug2: CategorizedBug = { ...mockBug, id: 99, title: 'Other bug' }

const singleProject: ProjectEntry[] = [
  { id: 'p1', name: 'Project1', path: '/path/p1', type: 'backend', description: '', keywords: [] }
]

beforeEach(() => {
  ;(window as any).electronAPI = {
    agentSuggestProjects: vi
      .fn()
      .mockResolvedValue({ primaryProjectId: 'p1', suggestedSecondaryIds: [] })
  }
})

describe('AnalyzeStartPanel — user context textarea', () => {
  it('renders the collapsible trigger with label', () => {
    const onAnalyze = vi.fn()
    render(
      <AnalyzeStartPanel
        bugId={42}
        bug={mockBug}
        projects={singleProject}
        onAnalyze={onAnalyze}
        isAnalyzing={false}
      />
    )
    expect(screen.getByText("Note per l'analisi")).toBeInTheDocument()
  })

  it('textarea is hidden by default (collapsed)', () => {
    const onAnalyze = vi.fn()
    render(
      <AnalyzeStartPanel
        bugId={42}
        bug={mockBug}
        projects={singleProject}
        onAnalyze={onAnalyze}
        isAnalyzing={false}
      />
    )
    expect(screen.queryByPlaceholderText(/hint/i)).not.toBeInTheDocument()
  })

  it('clicking trigger expands the textarea', () => {
    const onAnalyze = vi.fn()
    render(
      <AnalyzeStartPanel
        bugId={42}
        bug={mockBug}
        projects={singleProject}
        onAnalyze={onAnalyze}
        isAnalyzing={false}
      />
    )
    fireEvent.click(screen.getByText("Note per l'analisi"))
    expect(screen.getByPlaceholderText(/hint/i)).toBeInTheDocument()
  })

  it('typing shows character counter', () => {
    const onAnalyze = vi.fn()
    render(
      <AnalyzeStartPanel
        bugId={42}
        bug={mockBug}
        projects={singleProject}
        onAnalyze={onAnalyze}
        isAnalyzing={false}
      />
    )
    fireEvent.click(screen.getByText("Note per l'analisi"))
    const textarea = screen.getByPlaceholderText(/hint/i)
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    expect(screen.getByText('5/2000')).toBeInTheDocument()
  })

  it('passes trimmed userContext to onAnalyze when non-empty', () => {
    const onAnalyze = vi.fn()
    render(
      <AnalyzeStartPanel
        bugId={42}
        bug={mockBug}
        projects={singleProject}
        onAnalyze={onAnalyze}
        isAnalyzing={false}
      />
    )
    // Expand and type
    fireEvent.click(screen.getByText("Note per l'analisi"))
    fireEvent.change(screen.getByPlaceholderText(/hint/i), { target: { value: '  My hint  ' } })
    // Click analyze
    fireEvent.click(screen.getByRole('button', { name: /analizza/i }))
    expect(onAnalyze).toHaveBeenCalledWith(42, 'p1', [], 'My hint')
  })

  it('passes undefined to onAnalyze when textarea is empty', () => {
    const onAnalyze = vi.fn()
    render(
      <AnalyzeStartPanel
        bugId={42}
        bug={mockBug}
        projects={singleProject}
        onAnalyze={onAnalyze}
        isAnalyzing={false}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /analizza/i }))
    expect(onAnalyze).toHaveBeenCalledWith(42, 'p1', [], undefined)
  })

  it('passes undefined when textarea has only whitespace', () => {
    const onAnalyze = vi.fn()
    render(
      <AnalyzeStartPanel
        bugId={42}
        bug={mockBug}
        projects={singleProject}
        onAnalyze={onAnalyze}
        isAnalyzing={false}
      />
    )
    fireEvent.click(screen.getByText("Note per l'analisi"))
    fireEvent.change(screen.getByPlaceholderText(/hint/i), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /analizza/i }))
    expect(onAnalyze).toHaveBeenCalledWith(42, 'p1', [], undefined)
  })

  it('resets textarea when bugId changes', () => {
    const onAnalyze = vi.fn()
    const { rerender } = render(
      <AnalyzeStartPanel
        bugId={42}
        bug={mockBug}
        projects={singleProject}
        onAnalyze={onAnalyze}
        isAnalyzing={false}
      />
    )
    // Expand and type
    fireEvent.click(screen.getByText("Note per l'analisi"))
    fireEvent.change(screen.getByPlaceholderText(/hint/i), { target: { value: 'Some context' } })
    expect(screen.getByPlaceholderText(/hint/i)).toHaveValue('Some context')

    // Re-render with different bugId
    rerender(
      <AnalyzeStartPanel
        bugId={99}
        bug={mockBug2}
        projects={singleProject}
        onAnalyze={onAnalyze}
        isAnalyzing={false}
      />
    )
    // Textarea should be collapsed (not visible)
    expect(screen.queryByPlaceholderText(/hint/i)).not.toBeInTheDocument()
  })
})
