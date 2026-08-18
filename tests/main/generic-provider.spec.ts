import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GenericProvider } from '../../src/main/llm/providers/generic-provider'

/**
 * Only what is genuinely the generic provider's is asserted here: the base URL
 * it validates at construction (because the user types it), the plain default
 * model, and the HTML reading of an unparseable body. The fetch, parse,
 * status-mapping and timeout behaviour it shares with every other
 * OpenAI-compatible provider is covered once in `provider-shared.spec.ts`.
 */

function stubFetch(response: Response): ReturnType<typeof vi.fn> {
  const mock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', mock)
  return mock
}

function contentResponse(content: unknown): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

function bodyOf(mock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  return JSON.parse(mock.mock.calls[0][1].body as string) as Record<string, unknown>
}

describe('generic-provider', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('constructor', () => {
    it('throws LLM_AUTH_ERROR when the API key is missing', () => {
      expect(() => new GenericProvider({ baseUrl: 'https://api.example.com/v1' })).toThrow(
        expect.objectContaining({ code: 'LLM_AUTH_ERROR' })
      )
    })

    it('rejects a missing base URL', () => {
      expect(() => new GenericProvider({ apiKey: 'key' })).toThrow(
        expect.objectContaining({
          code: 'UNKNOWN_ERROR',
          message: 'Base URL is missing for the generic provider'
        })
      )
    })

    it('rejects a base URL that is not a URL at all', () => {
      expect(() => new GenericProvider({ apiKey: 'key', baseUrl: 'not a url' })).toThrow(
        expect.objectContaining({ message: 'Invalid base URL for the generic provider' })
      )
    })

    it('rejects plain http for a remote host', () => {
      expect(() => new GenericProvider({ apiKey: 'key', baseUrl: 'http://api.example.com/v1' })).toThrow(
        expect.objectContaining({
          message: 'Base URL must use HTTPS (http is allowed only for localhost)'
        })
      )
    })

    it('allows plain http for localhost', () => {
      expect(
        () => new GenericProvider({ apiKey: 'key', baseUrl: 'http://localhost:1234/v1' })
      ).not.toThrow()
      expect(
        () => new GenericProvider({ apiKey: 'key', baseUrl: 'http://127.0.0.1:1234/v1' })
      ).not.toThrow()
    })
  })

  describe('chat()', () => {
    it('posts to the configured base URL', async () => {
      const mock = stubFetch(contentResponse('ok'))

      await new GenericProvider({ apiKey: 'key', baseUrl: 'https://api.example.com/v1' }).chat(
        's',
        'u'
      )

      expect(mock.mock.calls[0][0]).toBe('https://api.example.com/v1/chat/completions')
      expect(mock.mock.calls[0][1].headers).toMatchObject({ Authorization: 'Bearer key' })
    })

    it('defaults to the un-namespaced model gpt-4o', async () => {
      const mock = stubFetch(contentResponse('ok'))

      await new GenericProvider({ apiKey: 'key', baseUrl: 'https://api.example.com/v1' }).chat(
        's',
        'u'
      )

      expect(bodyOf(mock).model).toBe('gpt-4o')
    })

    it('never sends the OpenRouter routing field, even with a schema active', async () => {
      const mock = stubFetch(contentResponse('{"results":[]}'))

      await new GenericProvider({ apiKey: 'key', baseUrl: 'https://api.example.com/v1' }).chat(
        's',
        'u',
        { responseSchema: 'categorization' }
      )

      const body = bodyOf(mock)
      expect(body).not.toHaveProperty('provider')
      expect(body.response_format).toMatchObject({
        json_schema: { name: 'bug_categorization', strict: true }
      })
    })

    it('concatenates the text parts when the content comes back as an array', async () => {
      stubFetch(
        contentResponse([
          { type: 'text', text: '{"results":' },
          { type: 'text', text: '[]}' }
        ])
      )

      await expect(
        new GenericProvider({ apiKey: 'key', baseUrl: 'https://api.example.com/v1' }).chat('s', 'u')
      ).resolves.toBe('{"results":[]}')
    })

    it('reports a likely baseUrl mistake when the provider returns an HTML page', async () => {
      const provider = new GenericProvider({
        apiKey: 'key',
        baseUrl: 'https://api.example.com/v1'
      })

      stubFetch(
        new Response('<html>proxy error</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        })
      )

      await expect(provider.chat('system', 'user')).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR',
        message:
          'The generic provider base URL is likely wrong: https://api.example.com/v1/chat/completions returned HTML instead of JSON. Make sure baseUrl points to an OpenAI-compatible API root, not a web page.'
      })
    })

    it('reports the same mistake when the page has no HTML content-type', async () => {
      const provider = new GenericProvider({
        apiKey: 'key',
        baseUrl: 'https://api.example.com/v1'
      })

      stubFetch(new Response('<!DOCTYPE html><html><body>hi</body></html>', { status: 200 }))

      await expect(provider.chat('system', 'user')).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR',
        message: expect.stringContaining('returned HTML instead of JSON')
      })
    })

    it('falls back to the plain non-JSON error when the body is not a web page', async () => {
      const provider = new GenericProvider({
        apiKey: 'key',
        baseUrl: 'https://api.example.com/v1'
      })

      stubFetch(new Response('gateway timeout', { status: 200 }))

      await expect(provider.chat('system', 'user')).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR',
        message: 'Non-JSON response from the generic provider'
      })
    })

    it('names the generic provider in the authentication error', async () => {
      const provider = new GenericProvider({
        apiKey: 'key',
        baseUrl: 'https://api.example.com/v1'
      })

      stubFetch(new Response('{"error":"nope"}', { status: 401 }))

      await expect(provider.chat('s', 'u')).rejects.toMatchObject({
        code: 'LLM_AUTH_ERROR',
        message: 'Invalid authentication for the generic provider'
      })
    })
  })

  describe('testConnection()', () => {
    it('sends a single chat request with the test prompt', async () => {
      const mock = stubFetch(contentResponse('{"status":"ok"}'))

      await expect(
        new GenericProvider({
          apiKey: 'key',
          baseUrl: 'https://api.example.com/v1'
        }).testConnection()
      ).resolves.toBeUndefined()

      expect(mock).toHaveBeenCalledTimes(1)
      expect(bodyOf(mock).messages).toEqual([
        { role: 'system', content: 'You are a test assistant. Respond with: {"status":"ok"}' },
        { role: 'user', content: 'Test connection' }
      ])
    })
  })
})
