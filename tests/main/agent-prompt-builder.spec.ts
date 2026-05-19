import { describe, expect, it } from 'vitest'
import { buildAnalyzePrompt } from '@main/agent/prompt-builder'
import type { CategorizedBug, ProjectEntry } from '@shared/types'

const mockBug: CategorizedBug = {
  id: 123,
  title: 'Login button not working',
  state: 'Active',
  assignee: 'John',
  areaPath: 'MyProject\\Frontend',
  description: 'The login button does not respond to clicks',
  priority: 1,
  createdDate: '2026-01-01T00:00:00Z',
  updatedDate: '2026-01-02T00:00:00Z',
  tags: ['auth', 'frontend'],
  macroCategory: 'Authentication',
  subCategory: 'UI',
  categoryReason: 'Login UI issue',
  categorizedAt: '2026-01-01T00:00:00Z'
}

const mockProject: ProjectEntry = {
  id: 'proj-1',
  name: 'hotel-frontend',
  path: '/Users/dev/hotel-frontend',
  type: 'frontend',
  description: 'Hotel frontend app',
  keywords: ['hotel', 'react']
}

describe('buildAnalyzePrompt', () => {
  it('output contains bug ID, title, and description', () => {
    const result = buildAnalyzePrompt(mockBug, mockProject, '')
    expect(result).toContain('123')
    expect(result).toContain('Login button not working')
    expect(result).toContain('The login button does not respond to clicks')
  })

  it('output contains project name, path, and type', () => {
    const result = buildAnalyzePrompt(mockBug, mockProject, '')
    expect(result).toContain('hotel-frontend')
    expect(result).toContain('/Users/dev/hotel-frontend')
    expect(result).toContain('frontend')
  })

  it('output contains architecture context when provided', () => {
    const result = buildAnalyzePrompt(mockBug, mockProject, 'Monorepo with NX workspace')
    expect(result).toContain('Architecture Context')
    expect(result).toContain('Monorepo with NX workspace')
  })

  it('output does NOT contain architecture context section when empty', () => {
    const result = buildAnalyzePrompt(mockBug, mockProject, '')
    expect(result).not.toContain('## Architecture Context')
  })

  it('output does NOT contain MCP, secondary project, or cross-repo', () => {
    const result = buildAnalyzePrompt(mockBug, mockProject, 'Some context')
    expect(result).not.toContain('MCP')
    expect(result).not.toContain('secondary project')
    expect(result).not.toContain('cross-repo')
  })

  it('handles empty description with "(nessuna descrizione)"', () => {
    const bugNoDesc: CategorizedBug = { ...mockBug, description: '' }
    const result = buildAnalyzePrompt(bugNoDesc, mockProject, '')
    expect(result).toContain('(nessuna descrizione)')
  })

  it('handles empty tags', () => {
    const bugNoTags: CategorizedBug = { ...mockBug, tags: [] }
    const result = buildAnalyzePrompt(bugNoTags, mockProject, '')
    expect(result).toContain('(nessun tag)')
  })

  it('handles empty keywords', () => {
    const projectNoKeywords: ProjectEntry = { ...mockProject, keywords: [] }
    const result = buildAnalyzePrompt(mockBug, projectNoKeywords, '')
    expect(result).toContain('(nessuna keyword)')
  })
})
