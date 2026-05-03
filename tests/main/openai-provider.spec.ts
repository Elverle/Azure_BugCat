import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OpenAIProvider } from '../../src/main/llm/providers/openai-provider'

const { mockCreate, MockOpenAIAPIError } = vi.hoisted(() => {
  class MockOpenAIAPIError extends Error {
    constructor(
      public status: number,
      message: string
    ) {
      super(message)
    }
  }

  return {
    mockCreate: vi.fn(),
    MockOpenAIAPIError
  }
})

vi.mock('openai', () => {
  return {
    default: class OpenAI {
      static APIError = MockOpenAIAPIError
      chat = {
        completions: {
          create: mockCreate
        }
      }
    }
  }
})

describe('openai-provider', () => {
  beforeEach(() => {
    vi.useRealTimers()
    mockCreate.mockReset()
  })

  it('throws LLM_AUTH_ERROR when API key is missing', () => {
    expect(() => new OpenAIProvider({})).toThrow()
    try {
      new OpenAIProvider({})
    } catch (error) {
      expect(error).toMatchObject({ code: 'LLM_AUTH_ERROR' })
    }
  })

  it('returns content from successful response and uses default model', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"results":[]}' } }]
    })

    const provider = new OpenAIProvider({ apiKey: 'sk-test' })
    await expect(provider.chat('system', 'user')).resolves.toBe('{"results":[]}')

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'system' },
          { role: 'user', content: 'user' }
        ],
        temperature: 0.1
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it('passes json_schema response format when responseSchema is provided', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"groups":[]}' } }]
    })

    const provider = new OpenAIProvider({ apiKey: 'sk-test' })
    await provider.chat('system', 'user', { responseSchema: 'similar-bugs' })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: expect.objectContaining({
          type: 'json_schema',
          json_schema: expect.objectContaining({
            name: 'similar_bugs_detection',
            strict: true,
            schema: expect.any(Object)
          })
        })
      }),
      expect.anything()
    )
  })

  it('maps API status codes to shared app errors', async () => {
    mockCreate.mockRejectedValueOnce(new MockOpenAIAPIError(429, 'Rate limit exceeded'))
    mockCreate.mockRejectedValueOnce(new MockOpenAIAPIError(401, 'Unauthorized'))

    const provider = new OpenAIProvider({ apiKey: 'sk-test' })

    await expect(provider.chat('system', 'user')).rejects.toMatchObject({
      code: 'LLM_RATE_LIMIT'
    })
    await expect(provider.chat('system', 'user')).rejects.toMatchObject({
      code: 'LLM_AUTH_ERROR'
    })
  })

  it('maps empty content to LLM_PARSE_ERROR', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '' } }]
    })

    const provider = new OpenAIProvider({ apiKey: 'sk-test' })
    await expect(provider.chat('system', 'user')).rejects.toMatchObject({
      code: 'LLM_PARSE_ERROR'
    })
  })

  it('aborts the request using configured timeout', async () => {
    vi.useFakeTimers()
    mockCreate.mockImplementation(
      (_request, options: { signal: AbortSignal }) =>
        new Promise((_, reject) => {
          options.signal.addEventListener('abort', () => {
            const error = new Error('Aborted')
            error.name = 'AbortError'
            reject(error)
          })
        })
    )

    const provider = new OpenAIProvider({ apiKey: 'sk-test', timeout: 25 })
    const result = provider.chat('system', 'user')
    const pendingExpectation = expect(result).rejects.toMatchObject({
      code: 'LLM_TIMEOUT'
    })

    await vi.advanceTimersByTimeAsync(25)

    await pendingExpectation
  })
})
