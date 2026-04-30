import { describe, expect, it } from 'vitest'
import { splitIntoChunks } from '@main/llm/chunking'
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

describe('chunking', () => {
  it('splits bugs into chunks of specified size', () => {
    const bugs = [makeBug(1), makeBug(2), makeBug(3), makeBug(4), makeBug(5)]
    const chunks = splitIntoChunks(bugs, 2)
    expect(chunks).toHaveLength(3)
    expect(chunks[0]).toHaveLength(2)
    expect(chunks[1]).toHaveLength(2)
    expect(chunks[2]).toHaveLength(1)
  })

  it('returns single chunk when bugs fit within chunk size', () => {
    const bugs = [makeBug(1), makeBug(2)]
    const chunks = splitIntoChunks(bugs, 10)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toHaveLength(2)
  })

  it('returns all bugs in one chunk if chunkSize is 0 or negative', () => {
    const bugs = [makeBug(1), makeBug(2), makeBug(3)]
    expect(splitIntoChunks(bugs, 0)).toEqual([bugs])
    expect(splitIntoChunks(bugs, -1)).toEqual([bugs])
  })

  it('handles empty array', () => {
    const chunks = splitIntoChunks([], 5)
    expect(chunks).toHaveLength(0)
  })
})
