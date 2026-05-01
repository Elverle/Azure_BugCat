import { describe, expect, it } from 'vitest'
import { validateLLMResponse } from '@main/llm/response-validator'
import type { BugItem } from '@shared/types'

function makeBug(id: number): BugItem {
  return {
    id,
    title: `Bug ${id}`,
    state: 'Active',
    assignee: null,
    areaPath: 'Test',
    description: `Desc ${id}`,
    priority: 2,
    createdDate: '2026-01-01T00:00:00Z',
    updatedDate: '2026-01-01T00:00:00Z',
    tags: []
  }
}

describe('response-validator', () => {
  it('parses valid JSON response and maps results', () => {
    const raw = JSON.stringify({
      results: [
        { bugId: 1, macroCategory: 'UI', subCategory: 'FE', categoryReason: 'Visual issue' },
        { bugId: 2, macroCategory: 'Backend', subCategory: 'BE', categoryReason: 'Server crash' }
      ]
    })
    const bugs = [makeBug(1), makeBug(2)]
    const results = validateLLMResponse(raw, bugs)
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({
      bugId: 1,
      macroCategory: 'UI',
      subCategory: 'FE',
      categoryReason: 'Visual issue'
    })
    expect(results[1]).toEqual({
      bugId: 2,
      macroCategory: 'Backend',
      subCategory: 'BE',
      categoryReason: 'Server crash'
    })
  })

  it('returns fallback when JSON is invalid', () => {
    const bugs = [makeBug(1), makeBug(2)]
    const results = validateLLMResponse('not valid json', bugs)
    expect(results).toHaveLength(2)
    expect(results[0].macroCategory).toBe('Non categorizzato')
    expect(results[0].subCategory).toBe('Errore parsing')
    expect(results[1].macroCategory).toBe('Non categorizzato')
  })

  it('returns fallback when results array is missing', () => {
    const bugs = [makeBug(1)]
    const results = validateLLMResponse(JSON.stringify({ data: [] }), bugs)
    expect(results).toHaveLength(1)
    expect(results[0].macroCategory).toBe('Non categorizzato')
    expect(results[0].subCategory).toBe('Errore parsing')
  })

  it('fills missing bugs with fallback entry', () => {
    const raw = JSON.stringify({
      results: [{ bugId: 1, macroCategory: 'UI', subCategory: 'Layout', categoryReason: 'Test' }]
    })
    const bugs = [makeBug(1), makeBug(2)]
    const results = validateLLMResponse(raw, bugs)
    expect(results).toHaveLength(2)
    expect(results[0].macroCategory).toBe('UI')
    expect(results[1].macroCategory).toBe('Non categorizzato')
    expect(results[1].subCategory).toBe('Nessuna risposta LLM')
  })

  it('replaces empty strings with N/D', () => {
    const raw = JSON.stringify({
      results: [{ bugId: 1, macroCategory: '', subCategory: '  ', categoryReason: '' }]
    })
    const bugs = [makeBug(1)]
    const results = validateLLMResponse(raw, bugs)
    expect(results[0].macroCategory).toBe('N/D')
    expect(results[0].subCategory).toBe('Non determinabile')
    expect(results[0].categoryReason).toBe('N/D')
  })

  it('skips entries without valid bugId', () => {
    const raw = JSON.stringify({
      results: [
        { bugId: null, macroCategory: 'UI', subCategory: 'X', categoryReason: 'Y' },
        { bugId: 1, macroCategory: 'Backend', subCategory: 'API', categoryReason: 'OK' }
      ]
    })
    const bugs = [makeBug(1)]
    const results = validateLLMResponse(raw, bugs)
    expect(results).toHaveLength(1)
    expect(results[0].macroCategory).toBe('Backend')
  })

  it('extracts JSON when the model adds extra prose around the payload', () => {
    const raw = [
      'Here is the categorization result:',
      JSON.stringify({
        results: [
          {
            bugId: 1,
            macroCategory: 'Validazioni',
            subCategory: 'backend',
            categoryReason: 'The title explicitly mentions final validations and cost error.'
          }
        ]
      }),
      'Done.'
    ].join('\n')

    const results = validateLLMResponse(raw, [makeBug(1)])

    expect(results).toEqual([
      {
        bugId: 1,
        macroCategory: 'Validazioni',
        subCategory: 'BE',
        categoryReason: 'The title explicitly mentions final validations and cost error.'
      }
    ])
  })

  it('accepts a top-level array with common alternative field names', () => {
    const raw = JSON.stringify([
      {
        id: '1',
        category: 'Validazioni',
        subcategory: 'frontend',
        reason:
          'The title contains "Validazioni finali" and the description points to a validation problem.'
      }
    ])

    const results = validateLLMResponse(raw, [makeBug(1)])

    expect(results).toEqual([
      {
        bugId: 1,
        macroCategory: 'Validazioni',
        subCategory: 'FE',
        categoryReason:
          'The title contains "Validazioni finali" and the description points to a validation problem.'
      }
    ])
  })

  it('normalizes common legacy layer labels to FE or BE', () => {
    const raw = JSON.stringify({
      results: [
        { bugId: 1, macroCategory: 'UI', subCategory: 'Layout', categoryReason: 'Visual issue' },
        { bugId: 2, macroCategory: 'Services', subCategory: 'API', categoryReason: 'Server issue' }
      ]
    })

    const results = validateLLMResponse(raw, [makeBug(1), makeBug(2)])

    expect(results).toEqual([
      { bugId: 1, macroCategory: 'UI', subCategory: 'FE', categoryReason: 'Visual issue' },
      { bugId: 2, macroCategory: 'Services', subCategory: 'BE', categoryReason: 'Server issue' }
    ])
  })
})
