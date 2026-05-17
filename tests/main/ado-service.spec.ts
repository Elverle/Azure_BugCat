import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSettings } from '@shared/types'
import type { WorkItemRaw } from '@main/ado/types'

const { fetchWiqlQuery, fetchWorkItemsBatch } = vi.hoisted(() => ({
  fetchWiqlQuery: vi.fn(),
  fetchWorkItemsBatch: vi.fn()
}))

vi.mock('@main/ado/ado-client', () => ({
  fetchWiqlQuery,
  fetchWorkItemsBatch
}))

import { fetchBugsFromQuery, testAdoConnection } from '@main/ado/ado-service'

const baseSettings: AppSettings = {
  orgUrl: 'https://dev.azure.com/gversino',
  projectName: 'BugCat',
  queryId: '123e4567-e89b-12d3-a456-426614174000',
  topN: 205,
  chunkSize: 15,
  llmProvider: 'openai',
  apiKey: 'sk-test',
  pat: 'secret',
  categories: [],
  agentProvider: 'none',
  projects: [],
  architectureContext: '',
  maxConcurrentSessions: 1
}

function makeWorkItem(id: number): WorkItemRaw {
  return {
    id,
    fields: {
      'System.Id': id,
      'System.Title': `Bug ${id}`,
      'System.State': 'Active',
      'System.AssignedTo': { displayName: 'Mario Rossi' },
      'System.AreaPath': 'BugCat\\UI',
      'System.Description': '<p>Hello <strong>world</strong></p>',
      'Microsoft.VSTS.Common.Priority': 2,
      'System.CreatedDate': '2026-04-30T09:00:00Z',
      'System.ChangedDate': '2026-04-30T10:00:00Z',
      'System.Tags': 'ui; regression'
    }
  }
}

describe('ado-service', () => {
  beforeEach(() => {
    fetchWiqlQuery.mockReset()
    fetchWorkItemsBatch.mockReset()
  })

  it('splits work item fetches into batches and maps ADO fields to bug items', async () => {
    const ids = Array.from({ length: 205 }, (_, index) => ({ id: index + 1, url: `u${index + 1}` }))
    fetchWiqlQuery.mockResolvedValue({ workItems: ids })
    fetchWorkItemsBatch
      .mockResolvedValueOnce(Array.from({ length: 200 }, (_, index) => makeWorkItem(index + 1)))
      .mockResolvedValueOnce(Array.from({ length: 5 }, (_, index) => makeWorkItem(index + 201)))

    const bugs = await fetchBugsFromQuery(baseSettings)

    expect(fetchWorkItemsBatch).toHaveBeenCalledTimes(2)
    expect(fetchWorkItemsBatch).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ topN: 205 }),
      Array.from({ length: 200 }, (_, index) => index + 1)
    )
    expect(fetchWorkItemsBatch).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      [201, 202, 203, 204, 205]
    )
    expect(bugs).toHaveLength(205)
    expect(bugs[0]).toMatchObject({
      id: 1,
      title: 'Bug 1',
      assignee: 'Mario Rossi',
      description: 'Hello world',
      descriptionHtml: '<p>Hello <strong>world</strong></p>',
      tags: ['ui', 'regression']
    })
  })

  it('returns a typed empty-result error when the query has no bugs', async () => {
    fetchWiqlQuery.mockResolvedValue({ workItems: [] })

    await expect(fetchBugsFromQuery(baseSettings)).rejects.toMatchObject({
      code: 'ADO_EMPTY',
      message: 'Nessun bug trovato nella query'
    })
  })

  it('respects topN before batching and fetches only the configured number of ids', async () => {
    const ids = Array.from({ length: 500 }, (_, index) => ({ id: index + 1, url: `u${index + 1}` }))
    fetchWiqlQuery.mockResolvedValue({ workItems: ids })
    fetchWorkItemsBatch.mockResolvedValue(
      Array.from({ length: 20 }, (_, index) => makeWorkItem(index + 1))
    )

    const bugs = await fetchBugsFromQuery({ ...baseSettings, topN: 20 })

    expect(fetchWorkItemsBatch).toHaveBeenCalledTimes(1)
    expect(fetchWorkItemsBatch).toHaveBeenCalledWith(
      expect.objectContaining({ topN: 20 }),
      Array.from({ length: 20 }, (_, index) => index + 1)
    )
    expect(bugs).toHaveLength(20)
  })

  it('fetches 450 ids in three batches of 200, 200, and 50', async () => {
    const ids = Array.from({ length: 450 }, (_, index) => ({ id: index + 1, url: `u${index + 1}` }))
    fetchWiqlQuery.mockResolvedValue({ workItems: ids })
    fetchWorkItemsBatch
      .mockResolvedValueOnce(Array.from({ length: 200 }, (_, index) => makeWorkItem(index + 1)))
      .mockResolvedValueOnce(Array.from({ length: 200 }, (_, index) => makeWorkItem(index + 201)))
      .mockResolvedValueOnce(Array.from({ length: 50 }, (_, index) => makeWorkItem(index + 401)))

    const bugs = await fetchBugsFromQuery({ ...baseSettings, topN: 450 })

    expect(fetchWorkItemsBatch).toHaveBeenCalledTimes(3)
    expect(fetchWorkItemsBatch).toHaveBeenNthCalledWith(
      1,
      expect.any(Object),
      Array.from({ length: 200 }, (_, index) => index + 1)
    )
    expect(fetchWorkItemsBatch).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      Array.from({ length: 200 }, (_, index) => index + 201)
    )
    expect(fetchWorkItemsBatch).toHaveBeenNthCalledWith(
      3,
      expect.any(Object),
      Array.from({ length: 50 }, (_, index) => index + 401)
    )
    expect(bugs).toHaveLength(450)
  })

  it('maps description, tags and assignee edge cases gracefully', async () => {
    fetchWiqlQuery.mockResolvedValue({
      workItems: [
        { id: 1, url: 'u1' },
        { id: 2, url: 'u2' }
      ]
    })
    fetchWorkItemsBatch.mockResolvedValue([
      {
        id: 1,
        fields: {
          'System.Id': 1,
          'System.Title': 'String assignee bug',
          'System.State': 'Active',
          'System.AssignedTo': 'Mario Rossi',
          'System.AreaPath': 'BugCat\\API',
          'System.Description': null,
          'Microsoft.VSTS.Common.Priority': 1,
          'System.CreatedDate': '2026-04-30T09:00:00Z',
          'System.ChangedDate': '2026-04-30T10:00:00Z',
          'System.Tags': ''
        }
      },
      {
        id: 2,
        fields: {
          'System.Id': 2,
          'System.Title': 'Unassigned bug',
          'System.State': 'Resolved',
          'System.AssignedTo': null,
          'System.AreaPath': 'BugCat\\UI',
          'System.Description': '<p><strong></strong></p>',
          'Microsoft.VSTS.Common.Priority': 3,
          'System.CreatedDate': '2026-04-30T11:00:00Z',
          'System.ChangedDate': '2026-04-30T12:00:00Z',
          'System.Tags': null
        }
      }
    ])

    const bugs = await fetchBugsFromQuery({ ...baseSettings, topN: 2 })

    expect(bugs[0]).toMatchObject({
      assignee: 'Mario Rossi',
      description: '',
      descriptionHtml: '',
      tags: []
    })
    expect(bugs[1]).toMatchObject({
      assignee: null,
      description: '',
      descriptionHtml: '<p><strong></strong></p>',
      tags: []
    })
  })

  it('returns success and error messages from testAdoConnection', async () => {
    fetchWiqlQuery.mockResolvedValueOnce({
      workItems: [
        { id: 1, url: 'u1' },
        { id: 2, url: 'u2' }
      ]
    })

    await expect(testAdoConnection(baseSettings)).resolves.toEqual({
      success: true,
      message: 'Connessione riuscita — 2 bug trovati'
    })

    fetchWiqlQuery.mockRejectedValueOnce({
      code: 'ADO_TIMEOUT',
      message: 'Errore di rete: socket hang up'
    })

    await expect(testAdoConnection(baseSettings)).resolves.toEqual({
      success: false,
      message: 'Errore di rete: socket hang up'
    })
  })

  it('surfaces missing required fields through the connection test result', async () => {
    const result = await testAdoConnection({ ...baseSettings, queryId: '' })

    expect(result).toEqual({
      success: false,
      message: 'Query ID mancante'
    })
  })
})
