import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GenericProvider } from '../../src/main/llm/providers/generic-provider'

describe('generic-provider', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('reports a likely baseUrl mistake when the provider returns an HTML page', async () => {
    const provider = new GenericProvider({
      apiKey: 'key',
      baseUrl: 'https://api.example.com/v1'
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html>proxy error</html>', {
          status: 200,
          headers: {
            'Content-Type': 'text/html'
          }
        })
      )
    )

    await expect(provider.chat('system', 'user')).rejects.toMatchObject({
      code: 'LLM_PARSE_ERROR',
      message:
        'The generic provider base URL is likely wrong: https://api.example.com/v1/chat/completions returned HTML instead of JSON. Make sure baseUrl points to an OpenAI-compatible API root, not a web page.'
    })
  })
})
