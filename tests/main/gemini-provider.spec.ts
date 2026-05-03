import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GeminiProvider } from '../../src/main/llm/providers/gemini-provider'

const mockGenerateContent = vi.fn()

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class GoogleGenAI {
      models = {
        generateContent: mockGenerateContent
      }
    }
  }
})

describe('gemini-provider', () => {
  beforeEach(() => {
    vi.useRealTimers()
    mockGenerateContent.mockReset()
  })

  it('throws LLM_AUTH_ERROR when API key is missing', () => {
    expect(() => new GeminiProvider({})).toThrow()
    try {
      new GeminiProvider({})
    } catch (error) {
      expect(error).toMatchObject({ code: 'LLM_AUTH_ERROR' })
    }
  })

  it('returns content from successful response and uses default model', async () => {
    mockGenerateContent.mockResolvedValue({ text: '{"results":[]}' })

    const provider = new GeminiProvider({ apiKey: 'AIza-test' })
    await expect(provider.chat('system', 'user')).resolves.toBe('{"results":[]}')

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash',
        contents: 'user',
        config: expect.objectContaining({
          systemInstruction: 'system',
          temperature: 0.1,
          abortSignal: expect.any(AbortSignal)
        })
      })
    )
  })

  it('passes structured output config when responseSchema is provided', async () => {
    mockGenerateContent.mockResolvedValue({ text: '{"groups":[]}' })

    const provider = new GeminiProvider({ apiKey: 'AIza-test' })
    await provider.chat('system', 'user', { responseSchema: 'similar-bugs' })

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          responseMimeType: 'application/json',
          responseSchema: expect.any(Object)
        })
      })
    )
  })

  it('maps string-based provider errors to shared app errors', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('429 RESOURCE_EXHAUSTED'))
    mockGenerateContent.mockRejectedValueOnce(new Error('403 API_KEY_INVALID'))

    const provider = new GeminiProvider({ apiKey: 'AIza-test' })

    await expect(provider.chat('system', 'user')).rejects.toMatchObject({
      code: 'LLM_RATE_LIMIT'
    })
    await expect(provider.chat('system', 'user')).rejects.toMatchObject({
      code: 'LLM_AUTH_ERROR'
    })
  })

  it('maps empty content to LLM_PARSE_ERROR', async () => {
    mockGenerateContent.mockResolvedValue({ text: '' })

    const provider = new GeminiProvider({ apiKey: 'AIza-test' })
    await expect(provider.chat('system', 'user')).rejects.toMatchObject({
      code: 'LLM_PARSE_ERROR'
    })
  })

  it('aborts the request using configured timeout', async () => {
    vi.useFakeTimers()
    mockGenerateContent.mockImplementation(
      ({ config }: { config: { abortSignal: AbortSignal } }) =>
        new Promise((_, reject) => {
          config.abortSignal.addEventListener('abort', () => {
            const error = new Error('Aborted')
            error.name = 'AbortError'
            reject(error)
          })
        })
    )

    const provider = new GeminiProvider({ apiKey: 'AIza-test', timeout: 35 })
    const result = provider.chat('system', 'user')
    const pendingExpectation = expect(result).rejects.toMatchObject({
      code: 'LLM_TIMEOUT'
    })

    await vi.advanceTimersByTimeAsync(35)

    await pendingExpectation
  })
})
