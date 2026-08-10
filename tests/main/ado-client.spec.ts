import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAdoAttachmentDataUrl, fetchWiqlQuery, fetchWorkItemsBatch } from '@main/ado/ado-client'
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
      message: 'Authentication failed: 401 Unauthorized'
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
      message: 'Authentication failed: 403 Forbidden'
    })
    await expect(fetchWiqlQuery(config)).rejects.toMatchObject({
      code: 'ADO_NOT_FOUND',
      message: 'Resource not found: 404 Not Found'
    })
  })

  it('returns a network timeout error for failed batch requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('socket hang up')))

    await expect(fetchWorkItemsBatch(config, [1, 2])).rejects.toMatchObject({
      code: 'ADO_TIMEOUT',
      message: 'Network error: socket hang up'
    })
  })

  it('maps AbortError and non-https org urls before or during fetch', async () => {
    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))

    await expect(fetchWiqlQuery(config)).rejects.toMatchObject({
      code: 'ADO_TIMEOUT',
      message: 'Azure DevOps connection timed out'
    })

    await expect(
      fetchWiqlQuery({ ...config, orgUrl: 'http://dev.azure.com/gversino' })
    ).rejects.toMatchObject({
      code: 'ADO_AUTH_ERROR',
      message: 'Invalid organization URL: it must start with https://'
    })
  })

  it('downloads ADO attachments with PAT auth and converts them to data urls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('image/png')
      },
      arrayBuffer: async () => Uint8Array.from([137, 80, 78, 71]).buffer
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchAdoAttachmentDataUrl(
      config,
      'https://dev.azure.com/gversino/834b6bb6-7aa6-4920-95f9-940c95460830/_apis/wit/attachments/image-id?fileName=image.png'
    )

    expect(result).toBe(`data:image/png;base64,${Buffer.from([137, 80, 78, 71]).toString('base64')}`)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://dev.azure.com/gversino/834b6bb6-7aa6-4920-95f9-940c95460830/_apis/wit/attachments/image-id?fileName=image.png',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from(':secret-pat').toString('base64')}`,
          Accept: '*/*'
        })
      })
    )
  })

  it('whitelists non-image content types to image/png in the data url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('text/html; charset=utf-8')
      },
      arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchAdoAttachmentDataUrl(
      config,
      'https://dev.azure.com/gversino/834b6bb6-7aa6-4920-95f9-940c95460830/_apis/wit/attachments/image-id?fileName=image.png'
    )

    expect(result).toBe(`data:image/png;base64,${Buffer.from([1, 2, 3]).toString('base64')}`)
  })

  it('strips charset parameters from an allowed image content type', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn().mockReturnValue('image/jpeg; charset=binary')
      },
      arrayBuffer: async () => Uint8Array.from([4, 5, 6]).buffer
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchAdoAttachmentDataUrl(
      config,
      'https://dev.azure.com/gversino/834b6bb6-7aa6-4920-95f9-940c95460830/_apis/wit/attachments/image-id?fileName=image.jpg'
    )

    expect(result).toBe(`data:image/jpeg;base64,${Buffer.from([4, 5, 6]).toString('base64')}`)
  })

  it('rejects attachment urls outside the configured ADO organization', async () => {
    await expect(
      fetchAdoAttachmentDataUrl(
        config,
        'https://example.com/_apis/wit/attachments/image-id?fileName=image.png'
      )
    ).rejects.toMatchObject({
      code: 'ADO_NOT_FOUND',
      message: 'Invalid Azure DevOps attachment URL'
    })
  })
})
