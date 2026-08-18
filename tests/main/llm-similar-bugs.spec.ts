import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSettings, CategorizedBug } from '@shared/types'
import { UNCATEGORIZED } from '@shared/categorization'

const mockChat = vi.fn()
const mockTestConnection = vi.fn()

vi.mock('@main/llm/provider-factory', () => ({
  createLLMProvider: vi.fn(() => ({
    name: 'generic',
    displayName: 'the generic provider',
    chat: mockChat,
    testConnection: mockTestConnection
  }))
}))

import { findSimilarBugs } from '@main/llm/similarity-service'

function makeCategorizedBug(id: number, macroCategory: string): CategorizedBug {
  return {
    id,
    title: `Bug ${id}`,
    state: 'Active',
    assignee: null,
    areaPath: 'Test',
    description: `Description for bug ${id}`,
    priority: 2,
    createdDate: '2026-01-01T00:00:00Z',
    updatedDate: '2026-01-01T00:00:00Z',
    tags: [],
    macroCategory,
    technicalLayer: 'Sub',
    categoryReason: 'reason',
    categorizedAt: '2026-01-01T12:00:00Z'
  }
}

const baseSettings: AppSettings = {
  orgUrl: 'https://dev.azure.com/test',
  projectName: 'Test',
  queryId: 'query-id',
  topN: 20,
  chunkSize: 5,
  llmProvider: 'generic',
  apiKey: 'sk-test',
  baseUrl: 'https://api.example.com/v1',
  pat: 'pat-test',
  categories: ['Costi', 'Validazioni']
}

describe('findSimilarBugs', () => {
  beforeEach(() => {
    mockChat.mockReset()
  })

  it('groups bugs by macroCategory and calls LLM for each group', async () => {
    mockChat
      .mockResolvedValueOnce(
        JSON.stringify({
          groups: [{ similarityScore: 0.85, reason: 'Same cost modal error', bugIds: [1, 2] }]
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          groups: [{ similarityScore: 0.72, reason: 'Validation on same field', bugIds: [3, 4] }]
        })
      )

    const bugs = [
      makeCategorizedBug(1, 'Costi'),
      makeCategorizedBug(2, 'Costi'),
      makeCategorizedBug(3, 'Validazioni'),
      makeCategorizedBug(4, 'Validazioni')
    ]

    const progressCalls: unknown[] = []
    const result = await findSimilarBugs(baseSettings, bugs, (p) => progressCalls.push(p))

    expect(result.categories).toHaveLength(2)
    expect(result.categories[0].macroCategory).toBe('Costi')
    expect(result.categories[0].groups).toHaveLength(1)
    expect(result.categories[0].groups[0].similarityScore).toBe(0.85)
    expect(result.categories[1].macroCategory).toBe('Validazioni')
    expect(result.categories[1].groups[0].bugIds).toEqual([3, 4])
    expect(result.analyzedAt).toBeTruthy()
    expect(mockChat).toHaveBeenCalledTimes(2)
    expect(progressCalls).toHaveLength(2)
  })

  it('skips groups with fewer than 2 bugs', async () => {
    const bugs = [makeCategorizedBug(1, 'Costi'), makeCategorizedBug(2, 'Validazioni')]

    const result = await findSimilarBugs(baseSettings, bugs)

    expect(result.categories).toHaveLength(0)
    expect(mockChat).not.toHaveBeenCalled()
  })

  it('skips bugs with empty macroCategory or Non categorizzato', async () => {
    mockChat.mockResolvedValueOnce(JSON.stringify({ groups: [] }))

    const bugs = [
      makeCategorizedBug(1, ''),
      makeCategorizedBug(2, 'Non categorizzato'),
      makeCategorizedBug(3, 'Costi'),
      makeCategorizedBug(4, 'Costi')
    ]

    const result = await findSimilarBugs(baseSettings, bugs)

    expect(result.categories).toHaveLength(1)
    expect(result.categories[0].macroCategory).toBe('Costi')
    expect(mockChat).toHaveBeenCalledTimes(1)
  })

  it('excludes bugs carrying the uncategorized sentinel from the analysis', async () => {
    const bugs = [makeCategorizedBug(1, UNCATEGORIZED), makeCategorizedBug(2, UNCATEGORIZED)]

    const result = await findSimilarBugs(baseSettings, bugs)

    expect(result.categories).toHaveLength(0)
    expect(mockChat).not.toHaveBeenCalled()
  })

  it('records error per category without aborting others', async () => {
    mockChat.mockRejectedValueOnce(new Error('Rate limit exceeded')).mockResolvedValueOnce(
      JSON.stringify({
        groups: [{ similarityScore: 0.9, reason: 'Duplicate', bugIds: [3, 4] }]
      })
    )

    const bugs = [
      makeCategorizedBug(1, 'Costi'),
      makeCategorizedBug(2, 'Costi'),
      makeCategorizedBug(3, 'Validazioni'),
      makeCategorizedBug(4, 'Validazioni')
    ]

    const result = await findSimilarBugs(baseSettings, bugs)

    expect(result.categories).toHaveLength(2)
    expect(result.categories[0].error).toBe('Rate limit exceeded')
    expect(result.categories[0].groups).toHaveLength(0)
    expect(result.categories[1].groups).toHaveLength(1)
    expect(result.categories[1].error).toBeUndefined()
  })

  it('throws immediately on blocking auth error', async () => {
    mockChat.mockRejectedValueOnce({
      code: 'LLM_AUTH_ERROR',
      message: 'Auth failed'
    })

    const bugs = [
      makeCategorizedBug(1, 'Costi'),
      makeCategorizedBug(2, 'Costi'),
      makeCategorizedBug(3, 'Validazioni'),
      makeCategorizedBug(4, 'Validazioni')
    ]

    await expect(findSimilarBugs(baseSettings, bugs)).rejects.toMatchObject({
      code: 'LLM_AUTH_ERROR'
    })
    expect(mockChat).toHaveBeenCalledTimes(1)
  })

  it('handles malformed LLM response gracefully', async () => {
    mockChat.mockResolvedValueOnce('not valid json at all')

    const bugs = [makeCategorizedBug(1, 'Costi'), makeCategorizedBug(2, 'Costi')]

    const result = await findSimilarBugs(baseSettings, bugs)

    // JSON parse error should be caught per-group
    expect(result.categories).toHaveLength(1)
    expect(result.categories[0].error).toBeDefined()
    expect(result.categories[0].groups).toHaveLength(0)
  })

  it('filters out groups with invalid structure', async () => {
    mockChat.mockResolvedValueOnce(
      JSON.stringify({
        groups: [
          { similarityScore: 0.85, reason: 'Valid', bugIds: [1, 2] },
          { similarityScore: 1.5, reason: 'Score out of range', bugIds: [1, 2] },
          { similarityScore: 0.7, reason: 'Only one bug', bugIds: [1] },
          { similarityScore: 0.6, reason: 'Non-numeric IDs', bugIds: ['a', 'b'] },
          { reason: 'Missing score', bugIds: [1, 2] }
        ]
      })
    )

    const bugs = [makeCategorizedBug(1, 'Costi'), makeCategorizedBug(2, 'Costi')]

    const result = await findSimilarBugs(baseSettings, bugs)

    expect(result.categories[0].groups).toHaveLength(1)
    expect(result.categories[0].groups[0].reason).toBe('Valid')
  })

  it('strips markdown fences from response', async () => {
    mockChat.mockResolvedValueOnce(
      '```json\n{"groups": [{"similarityScore": 0.8, "reason": "Same issue", "bugIds": [1, 2]}]}\n```'
    )

    const bugs = [makeCategorizedBug(1, 'Costi'), makeCategorizedBug(2, 'Costi')]

    const result = await findSimilarBugs(baseSettings, bugs)

    expect(result.categories[0].groups).toHaveLength(1)
    expect(result.categories[0].groups[0].similarityScore).toBe(0.8)
  })

  it('extracts JSON when the model adds extra prose around similarity payload', async () => {
    mockChat.mockResolvedValueOnce(
      [
        'Here are the likely duplicates:',
        JSON.stringify({
          groups: [{ similarityScore: 0.8, reason: 'Same root cause', bugIds: [1, 2] }]
        }),
        'Done.'
      ].join('\n')
    )

    const bugs = [makeCategorizedBug(1, 'Costi'), makeCategorizedBug(2, 'Costi')]

    const result = await findSimilarBugs(baseSettings, bugs)

    expect(result.categories[0].groups).toEqual([
      { similarityScore: 0.8, reason: 'Same root cause', bugIds: [1, 2] }
    ])
  })

  it('passes responseSchema option to provider', async () => {
    mockChat.mockResolvedValueOnce(JSON.stringify({ groups: [] }))

    const bugs = [makeCategorizedBug(1, 'Costi'), makeCategorizedBug(2, 'Costi')]

    await findSimilarBugs(baseSettings, bugs)

    expect(mockChat).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
      responseSchema: 'similar-bugs'
    })
  })

  it('stops between groups when the signal is aborted (review 2.2)', async () => {
    const controller = new AbortController()
    mockChat.mockImplementationOnce(async () => {
      // Abort lands right after group 1's request completes — the loop must not
      // start group 2's request once it checks the signal.
      controller.abort()
      return JSON.stringify({ groups: [] })
    })

    const bugs = [
      makeCategorizedBug(1, 'Costi'),
      makeCategorizedBug(2, 'Costi'),
      makeCategorizedBug(3, 'Validazioni'),
      makeCategorizedBug(4, 'Validazioni')
    ]

    await expect(
      findSimilarBugs(baseSettings, bugs, undefined, controller.signal)
    ).rejects.toMatchObject({ code: 'OPERATION_CANCELLED' })

    expect(mockChat).toHaveBeenCalledTimes(1)
  })

  it('rethrows a mid-flight cancellation instead of recording it as a group error (review 2.2)', async () => {
    const controller = new AbortController()
    mockChat.mockImplementationOnce(async () => {
      controller.abort()
      // Mirrors what chatWithRetry surfaces once a signal aborts mid-request
      // (llm-service.ts:147-149).
      throw { code: 'OPERATION_CANCELLED', message: 'Operation cancelled' }
    })

    const bugs = [makeCategorizedBug(1, 'Costi'), makeCategorizedBug(2, 'Costi')]

    await expect(
      findSimilarBugs(baseSettings, bugs, undefined, controller.signal)
    ).rejects.toMatchObject({ code: 'OPERATION_CANCELLED' })
  })
})
