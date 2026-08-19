import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnthropicProvider } from '../../src/main/llm/providers/anthropic-provider'

const { mockCreate, MockAnthropicAPIError } = vi.hoisted(() => {
  class MockAnthropicAPIError extends Error {
    constructor(
      public status: number,
      message: string
    ) {
      super(message)
    }
  }

  return {
    mockCreate: vi.fn(),
    MockAnthropicAPIError
  }
})

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class Anthropic {
      static APIError = MockAnthropicAPIError
      messages = {
        create: mockCreate
      }
    }
  }
})

describe('anthropic-provider', () => {
  beforeEach(() => {
    vi.useRealTimers()
    mockCreate.mockReset()
  })

  it('throws LLM_AUTH_ERROR when API key is missing', () => {
    expect(() => new AnthropicProvider({})).toThrow()
    try {
      new AnthropicProvider({})
    } catch (error) {
      expect(error).toMatchObject({ code: 'LLM_AUTH_ERROR' })
    }
  })

  it('returns tool_use payload as JSON string for structured output', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', input: { results: [{ bugId: 1 }] } }]
    })

    const provider = new AnthropicProvider({ apiKey: 'sk-ant-test' })
    await expect(
      provider.chat('system', 'user', { responseSchema: 'categorization' })
    ).resolves.toBe('{"results":[{"bugId":1}]}')

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4.6',
        system: 'system',
        messages: [{ role: 'user', content: 'user' }],
        tool_choice: {
          type: 'tool',
          name: 'save_triage_results'
        },
        tools: [
          expect.objectContaining({
            name: 'save_triage_results',
            description: 'Save the categorized bugs',
            input_schema: expect.any(Object)
          })
        ]
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it('returns text content when no tool_use block is present', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"results":[]}' }]
    })

    const provider = new AnthropicProvider({ apiKey: 'sk-ant-test' })
    await expect(provider.chat('system', 'user')).resolves.toBe('{"results":[]}')
  })

  it('maps API status codes to shared app errors', async () => {
    mockCreate.mockRejectedValueOnce(new MockAnthropicAPIError(429, 'Rate limit exceeded'))
    mockCreate.mockRejectedValueOnce(new MockAnthropicAPIError(403, 'Forbidden'))

    const provider = new AnthropicProvider({ apiKey: 'sk-ant-test' })

    await expect(provider.chat('system', 'user')).rejects.toMatchObject({
      code: 'LLM_RATE_LIMIT'
    })
    await expect(provider.chat('system', 'user')).rejects.toMatchObject({
      code: 'LLM_AUTH_ERROR'
    })
  })

  it('maps missing content to LLM_PARSE_ERROR', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'image' }]
    })

    const provider = new AnthropicProvider({ apiKey: 'sk-ant-test' })
    await expect(provider.chat('system', 'user')).rejects.toMatchObject({
      code: 'LLM_PARSE_ERROR'
    })
  })

  it('maps timeout to LLM_TIMEOUT even when the SDK abort error name is not AbortError', async () => {
    vi.useFakeTimers()
    mockCreate.mockImplementation(
      (_request, options: { signal: AbortSignal }) =>
        new Promise((_, reject) => {
          options.signal.addEventListener('abort', () => {
            reject(new Error('Request was aborted.')) // come il vero APIUserAbortError: name === 'Error'
          })
        })
    )

    const provider = new AnthropicProvider({ apiKey: 'sk-ant-test', timeout: 30 })
    const pending = expect(provider.chat('system', 'user')).rejects.toMatchObject({
      code: 'LLM_TIMEOUT'
    })
    await vi.advanceTimersByTimeAsync(30)
    await pending
  })

  it('maps user cancellation to OPERATION_CANCELLED even when the SDK abort error name is not AbortError', async () => {
    const controller = new AbortController()
    mockCreate.mockImplementation(
      (_request, options: { signal: AbortSignal }) =>
        new Promise((_, reject) => {
          options.signal.addEventListener('abort', () => {
            reject(new Error('Request was aborted.'))
          })
        })
    )

    const provider = new AnthropicProvider({ apiKey: 'sk-ant-test' })
    const pending = expect(
      provider.chat('system', 'user', { signal: controller.signal })
    ).rejects.toMatchObject({ code: 'OPERATION_CANCELLED' })
    controller.abort()
    await pending
  })
})
