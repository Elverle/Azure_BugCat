import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OpenRouterProvider } from '../../src/main/llm/providers/openrouter-provider'

/**
 * Only what is genuinely OpenRouter's is asserted here: the hardcoded API root,
 * the attribution headers, the namespaced default model, `require_parameters`
 * and the routing-mismatch reading of a failing response. The fetch, parse,
 * status-mapping and timeout behaviour it shares with every other
 * OpenAI-compatible provider is covered once in `provider-shared.spec.ts`.
 */

const URL = 'https://openrouter.ai/api/v1/chat/completions'

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

describe('openrouter-provider', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('constructor', () => {
    it('throws LLM_AUTH_ERROR when the API key is missing', () => {
      expect(() => new OpenRouterProvider({})).toThrow()
      try {
        new OpenRouterProvider({})
      } catch (err) {
        expect(err).toMatchObject({ code: 'LLM_AUTH_ERROR' })
      }
    })

    it('throws LLM_AUTH_ERROR when the API key is blank', () => {
      expect(() => new OpenRouterProvider({ apiKey: '   ' })).toThrow()
      try {
        new OpenRouterProvider({ apiKey: '   ' })
      } catch (err) {
        expect(err).toMatchObject({ code: 'LLM_AUTH_ERROR' })
      }
    })

    it('creates the provider with a valid API key', () => {
      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      expect(provider.name).toBe('openrouter')
    })
  })

  describe('chat()', () => {
    it('posts to the OpenRouter API root with the attribution headers', async () => {
      const mock = stubFetch(contentResponse('ok'))

      await new OpenRouterProvider({ apiKey: 'sk-or-test' }).chat('sys prompt', 'usr msg')

      const [url, init] = mock.mock.calls[0]
      expect(url).toBe(URL)
      expect(init.headers).toMatchObject({
        Authorization: 'Bearer sk-or-test',
        'HTTP-Referer': expect.any(String),
        'X-Title': expect.any(String)
      })
    })

    it('sends the messages with the correct roles and temperature', async () => {
      const mock = stubFetch(contentResponse('ok'))

      await new OpenRouterProvider({ apiKey: 'sk-or-test' }).chat('sys prompt', 'usr msg')

      expect(bodyOf(mock)).toMatchObject({
        temperature: 0.1,
        messages: [
          { role: 'system', content: 'sys prompt' },
          { role: 'user', content: 'usr msg' }
        ]
      })
    })

    it('defaults to the namespaced model openai/gpt-4o', async () => {
      const mock = stubFetch(contentResponse('ok'))

      await new OpenRouterProvider({ apiKey: 'sk-or-test' }).chat('s', 'u')

      expect(bodyOf(mock).model).toBe('openai/gpt-4o')
    })

    it('uses the model from config when one is set', async () => {
      const mock = stubFetch(contentResponse('ok'))

      await new OpenRouterProvider({
        apiKey: 'sk-or-test',
        model: 'anthropic/claude-sonnet-4-20250514'
      }).chat('s', 'u')

      expect(bodyOf(mock).model).toBe('anthropic/claude-sonnet-4-20250514')
    })

    it('honours the timeout from config', async () => {
      vi.useFakeTimers()
      vi.stubGlobal(
        'fetch',
        vi.fn(
          (_url: string, init: RequestInit) =>
            new Promise<Response>((_resolve, reject) => {
              init.signal?.addEventListener('abort', () => {
                const error = new Error('The operation was aborted.')
                error.name = 'AbortError'
                reject(error)
              })
            })
        )
      )

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test', timeout: 35 })
      const pending = expect(provider.chat('s', 'u')).rejects.toMatchObject({
        code: 'LLM_TIMEOUT',
        message: 'Request to OpenRouter timed out'
      })

      await vi.advanceTimersByTimeAsync(35)
      await pending
    })

    it('requires the router to honour the request parameters when a schema is active', async () => {
      const mock = stubFetch(contentResponse('{"results":[]}'))

      await new OpenRouterProvider({ apiKey: 'sk-or-test' }).chat('s', 'u', {
        responseSchema: 'categorization'
      })

      const body = bodyOf(mock)
      expect(body.provider).toEqual({ require_parameters: true })
      expect(body.response_format).toMatchObject({
        type: 'json_schema',
        json_schema: { name: 'bug_categorization', strict: true }
      })
    })

    it('names the schema similar_bugs_detection for similar-bugs', async () => {
      const mock = stubFetch(contentResponse('{"groups":[]}'))

      await new OpenRouterProvider({ apiKey: 'sk-or-test' }).chat('s', 'u', {
        responseSchema: 'similar-bugs'
      })

      expect(bodyOf(mock).response_format).toMatchObject({
        json_schema: { name: 'similar_bugs_detection' }
      })
    })

    it('does not send the provider routing field when no schema is requested', async () => {
      const mock = stubFetch(contentResponse('ok'))

      await new OpenRouterProvider({ apiKey: 'sk-or-test' }).chat('s', 'u')

      expect(bodyOf(mock)).not.toHaveProperty('provider')
    })

    it('reports a routing mismatch when no endpoint supports structured outputs', async () => {
      stubFetch(
        new Response(
          JSON.stringify({
            error: { message: 'No endpoints found that support structured outputs' }
          }),
          { status: 404 }
        )
      )

      await expect(
        new OpenRouterProvider({ apiKey: 'sk-or-test' }).chat('s', 'u', {
          responseSchema: 'categorization'
        })
      ).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR',
        message:
          'OpenRouter routed the request to a provider or model that does not properly support structured outputs with json_schema. Select a compatible model, or change the routing/provider.',
        details: expect.objectContaining({
          provider: 'openrouter',
          responseSchema: 'categorization',
          status: 404,
          reason: 'structured-output-routing-mismatch'
        })
      })
    })

    it('reports a routing mismatch when the upstream downgraded response_format to plain json', async () => {
      stubFetch(
        new Response(
          JSON.stringify({
            error: {
              message:
                'ConnectionError: {\'error\': {\'message\': "validation errors on response_format with input: json, expected json_schema"}} POST /v1/completions {"response_format":{"type":"json"}}'
            }
          }),
          { status: 400 }
        )
      )

      await expect(
        new OpenRouterProvider({ apiKey: 'sk-or-test' }).chat('s', 'u', {
          responseSchema: 'categorization'
        })
      ).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR',
        details: expect.objectContaining({ reason: 'structured-output-routing-mismatch' })
      })
    })

    it('reports a routing mismatch when a 200 carries an upstream error envelope', async () => {
      stubFetch(
        new Response(
          JSON.stringify({
            error: {
              message: 'validation errors on response_format with input: json, expected json_schema'
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )

      await expect(
        new OpenRouterProvider({ apiKey: 'sk-or-test' }).chat('s', 'u', {
          responseSchema: 'categorization'
        })
      ).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR',
        details: expect.objectContaining({
          status: 200,
          reason: 'structured-output-routing-mismatch'
        })
      })
    })

    it('reads an unknown model slug as a plain failure, not a routing mismatch', async () => {
      stubFetch(
        new Response(
          JSON.stringify({ error: { message: 'No endpoints found for openai/typo-model.' } }),
          { status: 404 }
        )
      )

      await expect(
        new OpenRouterProvider({ apiKey: 'sk-or-test' }).chat('s', 'u', {
          responseSchema: 'categorization'
        })
      ).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
        message: expect.stringContaining('No endpoints found for openai/typo-model.')
      })
    })

    it('reads a data-policy refusal as a plain failure, not a routing mismatch', async () => {
      stubFetch(
        new Response(
          JSON.stringify({
            error: { message: 'No endpoints found matching your data policy.' }
          }),
          { status: 404 }
        )
      )

      await expect(
        new OpenRouterProvider({ apiKey: 'sk-or-test' }).chat('s', 'u', {
          responseSchema: 'categorization'
        })
      ).rejects.toMatchObject({ code: 'UNKNOWN_ERROR' })
    })

    it('does not read a missing endpoint as a routing mismatch when no schema was requested', async () => {
      stubFetch(
        new Response(JSON.stringify({ error: { message: 'No endpoints found for this model' } }), {
          status: 404
        })
      )

      await expect(
        new OpenRouterProvider({ apiKey: 'sk-or-test' }).chat('s', 'u')
      ).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
        message: expect.stringContaining('OpenRouter error: HTTP 404')
      })
    })

    it('does not read an unrelated failure as a routing mismatch', async () => {
      stubFetch(
        new Response(JSON.stringify({ error: { message: 'model is temporarily unavailable' } }), {
          status: 503
        })
      )

      await expect(
        new OpenRouterProvider({ apiKey: 'sk-or-test' }).chat('s', 'u', {
          responseSchema: 'categorization'
        })
      ).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
        message: expect.stringContaining('OpenRouter error: HTTP 503')
      })
    })

    it('names OpenRouter in the authentication error', async () => {
      stubFetch(new Response('{"error":"nope"}', { status: 401 }))

      await expect(
        new OpenRouterProvider({ apiKey: 'sk-or-test' }).chat('s', 'u')
      ).rejects.toMatchObject({
        code: 'LLM_AUTH_ERROR',
        message: 'Invalid authentication for OpenRouter'
      })
    })

    it('names OpenRouter in the rate-limit error', async () => {
      stubFetch(new Response('{"error":"slow down"}', { status: 429 }))

      await expect(
        new OpenRouterProvider({ apiKey: 'sk-or-test' }).chat('s', 'u')
      ).rejects.toMatchObject({
        code: 'LLM_RATE_LIMIT',
        message: 'Rate limit reached for OpenRouter'
      })
    })

    it('throws LLM_PARSE_ERROR when the choices array is empty', async () => {
      stubFetch(
        new Response(JSON.stringify({ choices: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )

      await expect(
        new OpenRouterProvider({ apiKey: 'sk-or-test' }).chat('s', 'u')
      ).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR',
        message: 'Empty response from OpenRouter'
      })
    })

    it('concatenates the text parts when the router returns content as an array', async () => {
      stubFetch(
        contentResponse([
          { type: 'text', text: '{"results":' },
          { type: 'text', text: '[]}' }
        ])
      )

      await expect(
        new OpenRouterProvider({ apiKey: 'sk-or-test' }).chat('s', 'u')
      ).resolves.toBe('{"results":[]}')
    })
  })

  describe('testConnection()', () => {
    it('sends a single chat request with the test prompt', async () => {
      const mock = stubFetch(contentResponse('{"status":"ok"}'))

      await expect(
        new OpenRouterProvider({ apiKey: 'sk-or-test' }).testConnection()
      ).resolves.toBeUndefined()

      expect(mock).toHaveBeenCalledTimes(1)
      expect(bodyOf(mock).messages).toEqual([
        { role: 'system', content: 'You are a test assistant. Respond with: {"status":"ok"}' },
        { role: 'user', content: 'Test connection' }
      ])
    })
  })
})
