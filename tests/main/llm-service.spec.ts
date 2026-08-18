import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSettings, BugItem } from '@shared/types'

const mockChat = vi.fn()
const mockTestConnection = vi.fn()

vi.mock('@main/llm/provider-factory', () => ({
  createLLMProvider: vi.fn(() => ({
    name: 'openai',
    displayName: 'OpenAI',
    chat: mockChat,
    testConnection: mockTestConnection
  }))
}))

import { categorizeBugs, testLLMConnection } from '@main/llm/llm-service'

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

const baseSettings: AppSettings = {
  orgUrl: 'https://dev.azure.com/test',
  projectName: 'Test',
  queryId: 'query-id',
  topN: 20,
  chunkSize: 2,
  llmProvider: 'openai',
  apiKey: 'sk-test',
  pat: 'pat-test',
  categories: ['UI', 'Backend']
}

describe('llm-service', () => {
  beforeEach(() => {
    mockChat.mockReset()
    mockTestConnection.mockReset()
  })

  describe('categorizeBugs', () => {
    it('categorizes bugs across multiple chunks and calls progress', async () => {
      mockChat
        .mockResolvedValueOnce(
          JSON.stringify({
            results: [
              { bugId: 1, macroCategory: 'UI', technicalLayer: 'Layout', categoryReason: 'Visual' },
              { bugId: 2, macroCategory: 'Backend', technicalLayer: 'API', categoryReason: 'Server' }
            ]
          })
        )
        .mockResolvedValueOnce(
          JSON.stringify({
            results: [
              { bugId: 3, macroCategory: 'UI', technicalLayer: 'Form', categoryReason: 'Input' }
            ]
          })
        )

      const bugs = [makeBug(1), makeBug(2), makeBug(3)]
      const progressCalls: unknown[] = []
      const result = await categorizeBugs(baseSettings, bugs, (p) => progressCalls.push(p))

      expect(result).toHaveLength(3)
      expect(result[0].macroCategory).toBe('UI')
      expect(result[1].macroCategory).toBe('Backend')
      expect(result[2].macroCategory).toBe('UI')
      expect(progressCalls).toHaveLength(2)
      expect(mockChat).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
        responseSchema: 'categorization'
      })
    })

    it('retries on rate limit error', async () => {
      const rateLimitError = { code: 'LLM_RATE_LIMIT', message: 'Rate limited' }
      mockChat.mockRejectedValueOnce(rateLimitError).mockResolvedValueOnce(
        JSON.stringify({
          results: [{ bugId: 1, macroCategory: 'UI', technicalLayer: 'X', categoryReason: 'Y' }]
        })
      )

      const bugs = [makeBug(1)]
      const settings = { ...baseSettings, chunkSize: 10 }
      const result = await categorizeBugs(settings, bugs)

      expect(result).toHaveLength(1)
      expect(result[0].macroCategory).toBe('UI')
      expect(mockChat).toHaveBeenCalledTimes(2)
    })

    it('marks chunk as failed on non-auth/timeout error and continues', async () => {
      const genericError = { code: 'UNKNOWN_ERROR', message: 'Something went wrong' }
      mockChat.mockRejectedValueOnce(genericError).mockResolvedValueOnce(
        JSON.stringify({
          results: [{ bugId: 3, macroCategory: 'OK', technicalLayer: 'Fine', categoryReason: 'Good' }]
        })
      )

      const bugs = [makeBug(1), makeBug(2), makeBug(3)]
      const settings = { ...baseSettings, chunkSize: 2 }
      const result = await categorizeBugs(settings, bugs)

      expect(result).toHaveLength(3)
      expect(result[0].macroCategory).toBe('Non categorizzato')
      expect(result[1].macroCategory).toBe('Non categorizzato')
      expect(result[2].macroCategory).toBe('OK')

      // Fallback results must stay eligible for retry — no categorizedAt — while a
      // genuinely successful chunk is stamped as categorized.
      expect(result[0].categorizedAt).toBe('')
      expect(result[1].categorizedAt).toBe('')
      expect(result[2].categorizedAt).not.toBe('')
    })

    it('throws immediately on auth error', async () => {
      const authError = { code: 'LLM_AUTH_ERROR', message: 'Auth failed' }
      mockChat.mockRejectedValueOnce(authError)

      const bugs = [makeBug(1)]
      await expect(categorizeBugs(baseSettings, bugs)).rejects.toMatchObject({
        code: 'LLM_AUTH_ERROR'
      })
    })

    it('throws immediately on timeout error', async () => {
      const timeoutError = { code: 'LLM_TIMEOUT', message: 'Timeout' }
      mockChat.mockRejectedValueOnce(timeoutError)

      const bugs = [makeBug(1)]
      await expect(categorizeBugs(baseSettings, bugs)).rejects.toMatchObject({
        code: 'LLM_TIMEOUT'
      })
    })

    it('throws immediately on structured-output routing mismatch parse error', async () => {
      const parseError = {
        code: 'LLM_PARSE_ERROR',
        message:
          'OpenRouter routed the request to a provider or model that does not properly support structured outputs with json_schema. Select a compatible model, or change the routing/provider.',
        details: {
          reason: 'structured-output-routing-mismatch'
        }
      }
      mockChat.mockRejectedValueOnce(parseError)

      const bugs = [makeBug(1)]
      await expect(categorizeBugs(baseSettings, bugs)).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR',
        details: { reason: 'structured-output-routing-mismatch' }
      })
    })

    it('normalizes abort-like provider errors to timeout', async () => {
      mockChat.mockRejectedValueOnce({
        name: 'AbortError',
        message: 'This operation was aborted'
      })

      const bugs = [makeBug(1)]

      await expect(categorizeBugs(baseSettings, bugs)).rejects.toMatchObject({
        code: 'LLM_TIMEOUT'
      })
    })

    it('names the provider by its display name in the timeout message, not its internal id', async () => {
      mockChat.mockRejectedValueOnce({
        name: 'AbortError',
        message: 'This operation was aborted'
      })

      const bugs = [makeBug(1)]

      await expect(categorizeBugs(baseSettings, bugs)).rejects.toMatchObject({
        code: 'LLM_TIMEOUT',
        message: 'Request to OpenAI timed out',
        details: { provider: 'openai' }
      })
    })

    it('stops before the next chunk when cancellation is requested', async () => {
      const controller = new AbortController()

      mockChat.mockImplementationOnce(async () => {
        controller.abort()
        return JSON.stringify({
          results: [{ bugId: 1, macroCategory: 'UI', technicalLayer: 'X', categoryReason: 'Y' }]
        })
      })

      const bugs = [makeBug(1), makeBug(2)]
      const settings = { ...baseSettings, chunkSize: 1 }

      await expect(
        categorizeBugs(settings, bugs, undefined, controller.signal)
      ).rejects.toMatchObject({
        code: 'OPERATION_CANCELLED'
      })
      expect(mockChat).toHaveBeenCalledTimes(1)
    })
  })

  describe('testLLMConnection', () => {
    it('calls provider testConnection', async () => {
      mockTestConnection.mockResolvedValue(undefined)
      await expect(testLLMConnection(baseSettings)).resolves.toBeUndefined()
      expect(mockTestConnection).toHaveBeenCalledOnce()
    })

    it('propagates errors from provider', async () => {
      mockTestConnection.mockRejectedValue({ code: 'LLM_AUTH_ERROR', message: 'bad key' })
      await expect(testLLMConnection(baseSettings)).rejects.toMatchObject({
        code: 'LLM_AUTH_ERROR'
      })
    })
  })
})
