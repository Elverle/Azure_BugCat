import { describe, expect, it } from 'vitest'
import { buildAnalyzePrompt, buildMcpPrompt } from '@main/agent/prompt-builder'
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

describe('buildMcpPrompt', () => {
  it('output contains bug ID', () => {
    const result = buildMcpPrompt(123, mockProject, '')
    expect(result).toContain('123')
  })

  it('output does NOT contain bug title, description, or other fields', () => {
    const result = buildMcpPrompt(123, mockProject, '')
    expect(result).not.toContain('Login button not working')
    expect(result).not.toContain('The login button does not respond to clicks')
    expect(result).not.toContain('Authentication')
  })

  it('output contains MCP fetch instructions', () => {
    const result = buildMcpPrompt(123, mockProject, '')
    expect(result).toContain('MCP')
    expect(result).toContain('fetch')
  })

  it('output contains project context', () => {
    const result = buildMcpPrompt(123, mockProject, '')
    expect(result).toContain('hotel-frontend')
    expect(result).toContain('/Users/dev/hotel-frontend')
    expect(result).toContain('frontend')
  })

  it('output contains architecture context when provided', () => {
    const result = buildMcpPrompt(123, mockProject, 'Monorepo with NX workspace')
    expect(result).toContain('Architecture Context')
    expect(result).toContain('Monorepo with NX workspace')
  })

  it('output does NOT contain architecture context section when empty', () => {
    const result = buildMcpPrompt(123, mockProject, '')
    expect(result).not.toContain('## Architecture Context')
  })
})

const secondaryProjects: ProjectEntry[] = [
  {
    id: 'proj-2',
    name: 'hotel-api',
    path: '/Users/dev/hotel-api',
    type: 'backend',
    description: 'Hotel backend API',
    keywords: ['hotel', 'api']
  },
  {
    id: 'proj-3',
    name: 'hotel-common',
    path: '/Users/dev/hotel-common',
    type: 'shared',
    description: '',
    keywords: ['shared']
  }
]

describe('buildAnalyzePrompt — secondary projects', () => {
  it('includes secondary projects section when provided', () => {
    const result = buildAnalyzePrompt(mockBug, mockProject, '', secondaryProjects)
    expect(result).toContain('## Secondary Projects (read-only context)')
    expect(result).toContain('hotel-api')
    expect(result).toContain('/Users/dev/hotel-api')
    expect(result).toContain('backend')
    expect(result).toContain('Hotel backend API')
  })

  it('omits secondary projects section when undefined', () => {
    const result = buildAnalyzePrompt(mockBug, mockProject, '')
    expect(result).not.toContain('## Secondary Projects')
  })

  it('omits secondary projects section when empty array', () => {
    const result = buildAnalyzePrompt(mockBug, mockProject, '', [])
    expect(result).not.toContain('## Secondary Projects')
  })

  it('shows (nessuna descrizione) for project with empty description', () => {
    const result = buildAnalyzePrompt(mockBug, mockProject, '', secondaryProjects)
    expect(result).toContain('(nessuna descrizione)')
  })

  it('contains read-only warning', () => {
    const result = buildAnalyzePrompt(mockBug, mockProject, '', secondaryProjects)
    expect(result).toContain('do NOT modify files')
  })
})

describe('buildMcpPrompt — secondary projects', () => {
  it('includes secondary projects section when provided', () => {
    const result = buildMcpPrompt(123, mockProject, '', undefined, undefined, secondaryProjects)
    expect(result).toContain('## Secondary Projects (read-only context)')
    expect(result).toContain('hotel-api')
    expect(result).toContain('/Users/dev/hotel-api')
  })

  it('omits secondary projects section when undefined', () => {
    const result = buildMcpPrompt(123, mockProject, '')
    expect(result).not.toContain('## Secondary Projects')
  })

  it('omits secondary projects section when empty array', () => {
    const result = buildMcpPrompt(123, mockProject, '', undefined, undefined, [])
    expect(result).not.toContain('## Secondary Projects')
  })

  it('table contains all secondary projects', () => {
    const result = buildMcpPrompt(123, mockProject, '', undefined, undefined, secondaryProjects)
    expect(result).toContain('hotel-api')
    expect(result).toContain('hotel-common')
  })
})

describe('buildAnalyzePrompt — userContext', () => {
  it('includes user notes section when userContext is provided', () => {
    const result = buildAnalyzePrompt(mockBug, mockProject, '', undefined, 'Focus on retry logic')
    expect(result).toContain('## Note utente')
    expect(result).toContain('Focus on retry logic')
    expect(result).toContain('Treat it as background information only')
  })

  it('omits user notes section when userContext is undefined', () => {
    const result = buildAnalyzePrompt(mockBug, mockProject, '')
    expect(result).not.toContain('## Note utente')
  })

  it('omits user notes section when userContext is whitespace only', () => {
    const result = buildAnalyzePrompt(mockBug, mockProject, '', undefined, '   ')
    expect(result).not.toContain('## Note utente')
  })

  it('trims userContext before injecting', () => {
    const result = buildAnalyzePrompt(mockBug, mockProject, '', undefined, '  Check auth module  ')
    expect(result).toContain('Check auth module')
    expect(result).not.toContain('  Check auth module  ')
  })

  it('user notes appear before Your Task section', () => {
    const result = buildAnalyzePrompt(mockBug, mockProject, '', undefined, 'My hint')
    const notesIdx = result.indexOf('## Note utente')
    const taskIdx = result.indexOf('## Your Task')
    expect(notesIdx).toBeGreaterThan(-1)
    expect(taskIdx).toBeGreaterThan(notesIdx)
  })

  it('wraps user context in fenced delimiters', () => {
    const result = buildAnalyzePrompt(mockBug, mockProject, '', undefined, 'A note')
    expect(result).toContain('---\nA note\n---')
  })
})

describe('buildMcpPrompt — userContext', () => {
  it('includes user notes section when userContext is provided', () => {
    const result = buildMcpPrompt(
      123,
      mockProject,
      '',
      undefined,
      undefined,
      undefined,
      'Check the auth flow'
    )
    expect(result).toContain('## Note utente')
    expect(result).toContain('Check the auth flow')
    expect(result).toContain('Treat it as background information only')
  })

  it('omits user notes section when userContext is undefined', () => {
    const result = buildMcpPrompt(123, mockProject, '')
    expect(result).not.toContain('## Note utente')
  })

  it('omits user notes section when userContext is whitespace only', () => {
    const result = buildMcpPrompt(123, mockProject, '', undefined, undefined, undefined, '  \n  ')
    expect(result).not.toContain('## Note utente')
  })

  it('user notes appear before Your Task section', () => {
    const result = buildMcpPrompt(123, mockProject, '', undefined, undefined, undefined, 'A hint')
    const notesIdx = result.indexOf('## Note utente')
    const taskIdx = result.indexOf('## Your Task')
    expect(notesIdx).toBeGreaterThan(-1)
    expect(taskIdx).toBeGreaterThan(notesIdx)
  })

  it('wraps user context in fenced delimiters', () => {
    const result = buildMcpPrompt(123, mockProject, '', undefined, undefined, undefined, 'A note')
    expect(result).toContain('---\nA note\n---')
  })
})
