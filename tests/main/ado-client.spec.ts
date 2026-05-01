import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWiqlQuery, fetchWorkItemsBatch } from '@main/ado/ado-client'
import type { AdoConnectionConfig } from '@main/ado/types'

const config: AdoConnectionConfig = {
  orgUrl: 'https://dev.azure.com/gversino',
  projectName: 'BugCat',
  queryId: 'query-id',
  pat: 'secret-pat',
  topN: 20
}

describe('ado-client', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('fetches a WIQL query with PAT basic auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ workItems: [{ id: 1, url: 'u1' }] })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchWiqlQuery(config)

    expect(result.workItems).toEqual([{ id: 1, url: 'u1' }])
    expect(fetchMock).toHaveBeenCalledWith(
      'https://dev.azure.com/gversino/BugCat/_apis/wit/wiql/query-id?api-version=7.0',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from(':secret-pat').toString('base64')}`,
          Accept: 'application/json'
        })
      })
    )
  })

  it('maps HTTP auth failures to typed app errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' })
    )

    await expect(fetchWiqlQuery(config)).rejects.toMatchObject({
      code: 'ADO_AUTH_ERROR',
      message: 'Autenticazione fallita: 401 Unauthorized'
    })
  })

  it('maps HTTP 403 and 404 responses to typed app errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 403, statusText: 'Forbidden' })
        .mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' })
    )

    await expect(fetchWiqlQuery(config)).rejects.toMatchObject({
      code: 'ADO_AUTH_ERROR',
      message: 'Autenticazione fallita: 403 Forbidden'
    })
    await expect(fetchWiqlQuery(config)).rejects.toMatchObject({
      code: 'ADO_NOT_FOUND',
      message: 'Risorsa non trovata: 404 Not Found'
    })
  })

  it('returns a network timeout error for failed batch requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('socket hang up')))

    await expect(fetchWorkItemsBatch(config, [1, 2])).rejects.toMatchObject({
      code: 'ADO_TIMEOUT',
      message: 'Errore di rete: socket hang up'
    })
  })

  it('maps AbortError and non-https org urls before or during fetch', async () => {
    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))

    await expect(fetchWiqlQuery(config)).rejects.toMatchObject({
      code: 'ADO_TIMEOUT',
      message: 'Timeout nella connessione ad Azure DevOps'
    })

    await expect(
      fetchWiqlQuery({ ...config, orgUrl: 'http://dev.azure.com/gversino' })
    ).rejects.toMatchObject({
      code: 'ADO_AUTH_ERROR',
      message: 'URL organizzazione non valido: deve iniziare con https://'
    })
  })
})
