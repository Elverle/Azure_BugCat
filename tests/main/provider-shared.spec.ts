import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  openAiCompatibleChat,
  throwAppError,
  type OpenAiCompatibleProfile
} from '../../src/main/llm/providers/provider-shared'

/**
 * The behaviour every OpenAI-compatible provider shares is exercised here,
 * directly against the core, so it is asserted once instead of once per
 * provider. `openrouter-provider.spec.ts` and `generic-provider.spec.ts` only
 * cover what is genuinely theirs (routing, headers, base URL, defaults).
 */

function makeProfile(overrides: Partial<OpenAiCompatibleProfile> = {}): OpenAiCompatibleProfile {
  return {
    baseUrl: 'https://api.example.com/v1',
    apiKey: 'test-key',
    model: 'test-model',
    timeoutMs: 60000,
    displayName: 'the test provider',
    errorPrefix: 'Test provider error',
    ...overrides
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

function contentResponse(content: unknown): Response {
  return jsonResponse({ choices: [{ message: { content } }] })
}

function stubFetch(response: Response | (() => Promise<Response>)): ReturnType<typeof vi.fn> {
  const mock =
    typeof response === 'function' ? vi.fn(response) : vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', mock)
  return mock
}

/** Rejects with an AbortError as soon as the request signal aborts, like fetch does. */
function stubAbortableFetch(): ReturnType<typeof vi.fn> {
  const mock = vi.fn(
    (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const error = new Error('The operation was aborted.')
          error.name = 'AbortError'
          reject(error)
        })
      })
  )
  vi.stubGlobal('fetch', mock)
  return mock as unknown as ReturnType<typeof vi.fn>
}

function bodyOf(mock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  return JSON.parse(mock.mock.calls[0][1].body as string) as Record<string, unknown>
}

describe('openAiCompatibleChat', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('request', () => {
    it('posts an OpenAI-compatible body to {baseUrl}/chat/completions', async () => {
      const mock = stubFetch(contentResponse('ok'))

      await openAiCompatibleChat(makeProfile(), 'sys prompt', 'usr msg')

      const [url, init] = mock.mock.calls[0]
      expect(url).toBe('https://api.example.com/v1/chat/completions')
      expect(init.method).toBe('POST')
      expect(init.headers).toMatchObject({
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json'
      })
      expect(bodyOf(mock)).toMatchObject({
        model: 'test-model',
        temperature: 0.1,
        messages: [
          { role: 'system', content: 'sys prompt' },
          { role: 'user', content: 'usr msg' }
        ]
      })
    })

    it('strips trailing slashes from the base URL', async () => {
      const mock = stubFetch(contentResponse('ok'))

      await openAiCompatibleChat(makeProfile({ baseUrl: 'https://api.example.com/v1//' }), 's', 'u')

      expect(mock.mock.calls[0][0]).toBe('https://api.example.com/v1/chat/completions')
    })

    it('merges the profile headers into the request', async () => {
      const mock = stubFetch(contentResponse('ok'))

      await openAiCompatibleChat(
        makeProfile({ headers: { 'HTTP-Referer': 'https://app.example', 'X-Title': 'App' } }),
        's',
        'u'
      )

      expect(mock.mock.calls[0][1].headers).toMatchObject({
        Authorization: 'Bearer test-key',
        'HTTP-Referer': 'https://app.example',
        'X-Title': 'App'
      })
    })

    it('omits response_format when no schema is requested', async () => {
      const mock = stubFetch(contentResponse('ok'))

      await openAiCompatibleChat(makeProfile(), 's', 'u')

      expect(bodyOf(mock)).not.toHaveProperty('response_format')
    })

    it('sends a strict json_schema response_format named after the schema', async () => {
      const mock = stubFetch(contentResponse('{"results":[]}'))

      await openAiCompatibleChat(makeProfile(), 's', 'u', { responseSchema: 'categorization' })

      expect(bodyOf(mock).response_format).toMatchObject({
        type: 'json_schema',
        json_schema: {
          name: 'bug_categorization',
          strict: true,
          schema: expect.objectContaining({ type: 'object' })
        }
      })
    })

    it('names the schema similar_bugs_detection for similar-bugs', async () => {
      const mock = stubFetch(contentResponse('{"groups":[]}'))

      await openAiCompatibleChat(makeProfile(), 's', 'u', { responseSchema: 'similar-bugs' })

      expect(bodyOf(mock).response_format).toMatchObject({
        json_schema: { name: 'similar_bugs_detection' }
      })
    })

    it('merges structuredOutputBody into the body when a schema is active', async () => {
      const mock = stubFetch(contentResponse('{"results":[]}'))

      await openAiCompatibleChat(
        makeProfile({ structuredOutputBody: { provider: { require_parameters: true } } }),
        's',
        'u',
        { responseSchema: 'categorization' }
      )

      expect(bodyOf(mock).provider).toEqual({ require_parameters: true })
    })

    it('leaves structuredOutputBody out when no schema is active', async () => {
      const mock = stubFetch(contentResponse('ok'))

      await openAiCompatibleChat(
        makeProfile({ structuredOutputBody: { provider: { require_parameters: true } } }),
        's',
        'u'
      )

      expect(bodyOf(mock)).not.toHaveProperty('provider')
    })
  })

  describe('response', () => {
    it('returns the assistant content', async () => {
      stubFetch(contentResponse('{"results":[]}'))

      await expect(openAiCompatibleChat(makeProfile(), 's', 'u')).resolves.toBe('{"results":[]}')
    })

    it('concatenates the text parts when the content is an array', async () => {
      stubFetch(
        contentResponse([
          { type: 'text', text: '{"results":' },
          { type: 'text', text: '[]}' }
        ])
      )

      await expect(openAiCompatibleChat(makeProfile(), 's', 'u')).resolves.toBe('{"results":[]}')
    })

    it('throws LLM_PARSE_ERROR when the content is empty', async () => {
      stubFetch(contentResponse(null))

      await expect(openAiCompatibleChat(makeProfile(), 's', 'u')).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR',
        message: 'Empty response from the test provider'
      })
    })

    it('throws LLM_PARSE_ERROR when the choices array is empty', async () => {
      stubFetch(jsonResponse({ choices: [] }))

      await expect(openAiCompatibleChat(makeProfile(), 's', 'u')).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR'
      })
    })

    it('throws LLM_PARSE_ERROR when the body is not JSON', async () => {
      stubFetch(new Response('not json at all', { status: 200 }))

      await expect(openAiCompatibleChat(makeProfile(), 's', 'u')).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR',
        message: 'Non-JSON response from the test provider'
      })
    })
  })

  describe('failing status codes', () => {
    it.each([401, 403])('maps %i to LLM_AUTH_ERROR', async (status) => {
      stubFetch(jsonResponse({ error: 'nope' }, status))

      await expect(openAiCompatibleChat(makeProfile(), 's', 'u')).rejects.toMatchObject({
        code: 'LLM_AUTH_ERROR',
        message: 'Invalid authentication for the test provider'
      })
    })

    it('maps 429 to LLM_RATE_LIMIT', async () => {
      stubFetch(jsonResponse({ error: 'slow down' }, 429))

      await expect(openAiCompatibleChat(makeProfile(), 's', 'u')).rejects.toMatchObject({
        code: 'LLM_RATE_LIMIT',
        message: 'Rate limit reached for the test provider'
      })
    })

    it('maps any other failing status to UNKNOWN_ERROR behind the profile prefix', async () => {
      stubFetch(new Response('', { status: 500 }))

      await expect(openAiCompatibleChat(makeProfile(), 's', 'u')).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
        message: expect.stringContaining('Test provider error: HTTP 500')
      })
    })

    it('carries the reason out of an error envelope into the message', async () => {
      stubFetch(jsonResponse({ error: { message: 'Insufficient credits' } }, 402))

      await expect(openAiCompatibleChat(makeProfile(), 's', 'u')).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
        message: expect.stringContaining('Insufficient credits')
      })
    })

    it('falls back to a bounded excerpt when the body is not an error envelope', async () => {
      stubFetch(new Response('upstream exploded', { status: 502 }))

      await expect(openAiCompatibleChat(makeProfile(), 's', 'u')).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
        message: expect.stringContaining('upstream exploded')
      })
    })

    it('keeps the failing body out of the message once it grows unreasonable', async () => {
      stubFetch(new Response('x'.repeat(5000), { status: 500 }))

      const error = await openAiCompatibleChat(makeProfile(), 's', 'u').catch((e) => e)
      expect(error.message.length).toBeLessThan(400)
    })
  })

  describe('provider hooks', () => {
    it('lets onUnusableResponse classify a failing response before the shared mapping', async () => {
      stubFetch(jsonResponse({ error: { message: 'No endpoints found' } }, 404))
      const onUnusableResponse = vi.fn(() => {
        throwAppError('LLM_PARSE_ERROR', 'routed wrong', {
          reason: 'structured-output-routing-mismatch'
        })
      })

      await expect(
        openAiCompatibleChat(makeProfile({ onUnusableResponse }), 's', 'u', {
          responseSchema: 'categorization'
        })
      ).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR',
        details: { reason: 'structured-output-routing-mismatch' }
      })
    })

    it('hands onUnusableResponse the status, the body and the active schema', async () => {
      stubFetch(new Response('the raw body', { status: 404 }))
      const onUnusableResponse = vi.fn()

      await expect(
        openAiCompatibleChat(makeProfile({ onUnusableResponse }), 's', 'u', {
          responseSchema: 'categorization'
        })
      ).rejects.toMatchObject({ code: 'UNKNOWN_ERROR' })

      expect(onUnusableResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 404,
          bodyText: 'the raw body',
          responseSchema: 'categorization'
        })
      )
    })

    it('also consults onUnusableResponse when a successful response carries no content', async () => {
      stubFetch(jsonResponse({ error: { message: 'upstream refused the schema' } }))
      const onUnusableResponse = vi.fn()

      await expect(
        openAiCompatibleChat(makeProfile({ onUnusableResponse }), 's', 'u', {
          responseSchema: 'categorization'
        })
      ).rejects.toMatchObject({ code: 'LLM_PARSE_ERROR' })

      expect(onUnusableResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          bodyText: '{"error":{"message":"upstream refused the schema"}}',
          responseSchema: 'categorization'
        })
      )
    })

    it('lets onNonJsonResponse classify an unparseable body before the shared mapping', async () => {
      stubFetch(
        new Response('<html>proxy error</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        })
      )
      const onNonJsonResponse = vi.fn(() => {
        throwAppError('LLM_PARSE_ERROR', 'that base URL returns a web page')
      })

      await expect(
        openAiCompatibleChat(makeProfile({ onNonJsonResponse }), 's', 'u')
      ).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR',
        message: 'that base URL returns a web page'
      })
      expect(onNonJsonResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          bodyText: '<html>proxy error</html>',
          url: 'https://api.example.com/v1/chat/completions'
        })
      )
    })

    it('falls through to the shared mapping when a hook returns without throwing', async () => {
      stubFetch(new Response('not json', { status: 200 }))

      await expect(
        openAiCompatibleChat(makeProfile({ onNonJsonResponse: vi.fn() }), 's', 'u')
      ).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR',
        message: 'Non-JSON response from the test provider'
      })
    })
  })

  describe('timeout and cancellation', () => {
    it('aborts the request with LLM_TIMEOUT once the profile timeout elapses', async () => {
      vi.useFakeTimers()
      stubAbortableFetch()

      const pending = expect(
        openAiCompatibleChat(makeProfile({ timeoutMs: 35 }), 's', 'u')
      ).rejects.toMatchObject({
        code: 'LLM_TIMEOUT',
        message: 'Request to the test provider timed out'
      })

      await vi.advanceTimersByTimeAsync(35)
      await pending
    })

    it('reports OPERATION_CANCELLED when the caller aborts the request', async () => {
      const controller = new AbortController()
      stubAbortableFetch()

      const pending = expect(
        openAiCompatibleChat(makeProfile(), 's', 'u', { signal: controller.signal })
      ).rejects.toMatchObject({ code: 'OPERATION_CANCELLED' })

      controller.abort()
      await pending
    })

    it('clears the timeout once the request has answered', async () => {
      vi.useFakeTimers()
      stubFetch(contentResponse('ok'))

      await openAiCompatibleChat(makeProfile({ timeoutMs: 60000 }), 's', 'u')

      expect(vi.getTimerCount()).toBe(0)
    })

    it('wraps an unexpected transport failure in UNKNOWN_ERROR behind the profile prefix', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('socket hang up')))

      await expect(openAiCompatibleChat(makeProfile(), 's', 'u')).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
        message: 'Test provider error: socket hang up'
      })
    })
  })
})
