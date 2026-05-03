import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OpenRouterProvider } from '../../src/main/llm/providers/openrouter-provider'

const mockSend = vi.fn()

vi.mock('@openrouter/sdk', () => {
  return {
    OpenRouter: class OpenRouter {
      chat = { send: mockSend }
    }
  }
})

describe('openrouter-provider', () => {
  beforeEach(() => {
    vi.useRealTimers()
    mockSend.mockReset()
  })

  describe('constructor', () => {
    it('throws LLM_AUTH_ERROR when API key is missing', () => {
      expect(() => new OpenRouterProvider({})).toThrow()
      try {
        new OpenRouterProvider({})
      } catch (err) {
        expect(err).toMatchObject({ code: 'LLM_AUTH_ERROR' })
      }
    })

    it('throws LLM_AUTH_ERROR when API key is blank', () => {
      expect(() => new OpenRouterProvider({ apiKey: '   ' })).toThrow()
      try {
        new OpenRouterProvider({ apiKey: '   ' })
      } catch (err) {
        expect(err).toMatchObject({ code: 'LLM_AUTH_ERROR' })
      }
    })

    it('creates provider successfully with valid API key', () => {
      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      expect(provider.name).toBe('openrouter')
    })
  })

  describe('chat()', () => {
    it('returns content from successful response', async () => {
      mockSend.mockResolvedValue({
        choices: [{ message: { content: '{"results":[]}' } }]
      })

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      const result = await provider.chat('system prompt', 'user message')
      expect(result).toBe('{"results":[]}')
    })

    it('recovers content from rawValue when the SDK raises ResponseValidationError', async () => {
      mockSend.mockRejectedValue(
        Object.assign(new Error('Response validation failed'), {
          name: 'ResponseValidationError',
          rawValue: {
            choices: [{ message: { content: '{"results":[{"bugId":1}]}' } }]
          },
          body: '{"choices":[{"message":{"content":"ignored"}}]}'
        })
      )

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      await expect(provider.chat('system', 'user')).resolves.toBe('{"results":[{"bugId":1}]}')
    })

    it('recovers content from body when rawValue is not usable', async () => {
      const responseBody = JSON.stringify({
        choices: [{ message: { content: '{"results":[]}' } }]
      })

      mockSend.mockRejectedValue(
        Object.assign(new Error('Response validation failed'), {
          name: 'ResponseValidationError',
          rawValue: { notChoices: true },
          body: responseBody
        })
      )

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      await expect(provider.chat('system', 'user')).resolves.toBe('{"results":[]}')
    })

    it('throws LLM_PARSE_ERROR when ResponseValidationError cannot be recovered', async () => {
      mockSend.mockRejectedValue(
        Object.assign(new Error('Response validation failed'), {
          name: 'ResponseValidationError',
          pretty: () => 'Response validation failed\nchoices[0].message.content: expected string',
          rawValue: { notChoices: true },
          body: 'not-json'
        })
      )

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      await expect(
        provider.chat('system', 'user', { responseSchema: 'categorization' })
      ).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR',
        message: 'Risposta OpenRouter non valida secondo SDK',
        details: expect.objectContaining({
          provider: 'openrouter',
          responseSchema: 'categorization',
          request: expect.objectContaining({
            requestBody: expect.objectContaining({
              provider: expect.objectContaining({
                require_parameters: true
              }),
              response_format: expect.objectContaining({
                type: 'json_schema',
                json_schema: expect.objectContaining({
                  name: 'bug_categorization',
                  strict: true
                })
              })
            }),
            requestBodyPreview: expect.stringContaining('"type":"json_schema"')
          }),
          sdkErrorName: 'ResponseValidationError',
          sdkMessage: 'Response validation failed',
          sdkPrettyMessage:
            'Response validation failed\nchoices[0].message.content: expected string',
          responseBodyPreview: 'not-json'
        })
      })
    })

    it('throws a specific error when OpenRouter routing downgrades structured outputs', async () => {
      mockSend.mockRejectedValue(
        Object.assign(new Error('Response validation failed'), {
          name: 'ResponseValidationError',
          pretty: () => 'Response validation failed\nInvalid input',
          rawValue: { notChoices: true },
          body: JSON.stringify({
            error: {
              message:
                'ConnectionError: {\'error\': {\'message\': "validation errors on response_format with input: json, expected json_schema"}} POST /v1/completions {"response_format":{"type":"json"}}'
            }
          })
        })
      )

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      await expect(
        provider.chat('system', 'user', { responseSchema: 'categorization' })
      ).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR',
        message:
          'OpenRouter ha instradato la richiesta verso un provider o modello che non supporta correttamente structured outputs con json_schema. Seleziona un modello compatibile oppure cambia routing/provider.',
        details: expect.objectContaining({
          provider: 'openrouter',
          responseSchema: 'categorization',
          reason: 'structured-output-routing-mismatch'
        })
      })
    })

    it('uses default model openai/gpt-4o when none specified', async () => {
      mockSend.mockResolvedValue({
        choices: [{ message: { content: 'ok' } }]
      })

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      await provider.chat('system', 'user')

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          chatRequest: expect.objectContaining({ model: 'openai/gpt-4o' })
        }),
        expect.objectContaining({ timeoutMs: 60000 })
      )
    })

    it('uses custom model from config', async () => {
      mockSend.mockResolvedValue({
        choices: [{ message: { content: 'ok' } }]
      })

      const provider = new OpenRouterProvider({
        apiKey: 'sk-or-test',
        model: 'anthropic/claude-sonnet-4-20250514'
      })
      await provider.chat('system', 'user')

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          chatRequest: expect.objectContaining({ model: 'anthropic/claude-sonnet-4-20250514' })
        }),
        expect.anything()
      )
    })

    it('uses custom timeout from config', async () => {
      mockSend.mockResolvedValue({
        choices: [{ message: { content: 'ok' } }]
      })

      const provider = new OpenRouterProvider({
        apiKey: 'sk-or-test',
        timeout: 12345
      })
      await provider.chat('system', 'user')

      expect(mockSend).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ timeoutMs: 12345 })
      )
    })

    it('passes responseFormat when responseSchema is provided', async () => {
      mockSend.mockResolvedValue({
        choices: [{ message: { content: '{"results":[]}' } }]
      })

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      await provider.chat('system', 'user', { responseSchema: 'categorization' })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          chatRequest: expect.objectContaining({
            provider: expect.objectContaining({
              requireParameters: true
            }),
            responseFormat: expect.objectContaining({
              type: 'json_schema',
              jsonSchema: expect.objectContaining({
                name: 'bug_categorization',
                strict: true
              })
            })
          })
        }),
        expect.anything()
      )
    })

    it('passes similar_bugs_detection schema name for similar-bugs', async () => {
      mockSend.mockResolvedValue({
        choices: [{ message: { content: '{"groups":[]}' } }]
      })

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      await provider.chat('system', 'user', { responseSchema: 'similar-bugs' })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          chatRequest: expect.objectContaining({
            responseFormat: expect.objectContaining({
              jsonSchema: expect.objectContaining({
                name: 'similar_bugs_detection'
              })
            })
          })
        }),
        expect.anything()
      )
    })

    it('wraps messages in chatRequest with correct roles', async () => {
      mockSend.mockResolvedValue({
        choices: [{ message: { content: 'ok' } }]
      })

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      await provider.chat('sys prompt', 'usr msg')

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          chatRequest: expect.objectContaining({
            messages: [
              { role: 'system', content: 'sys prompt' },
              { role: 'user', content: 'usr msg' }
            ],
            stream: false,
            temperature: 0.1
          })
        }),
        expect.anything()
      )
    })

    it('throws LLM_PARSE_ERROR when response content is empty', async () => {
      mockSend.mockResolvedValue({
        choices: [{ message: { content: null } }]
      })

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      await expect(provider.chat('system', 'user')).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR',
        message: 'Risposta vuota da OpenRouter'
      })
    })

    it('throws LLM_PARSE_ERROR when choices array is empty', async () => {
      mockSend.mockResolvedValue({ choices: [] })

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      await expect(provider.chat('system', 'user')).rejects.toMatchObject({
        code: 'LLM_PARSE_ERROR'
      })
    })

    it('throws LLM_RATE_LIMIT for statusCode 429 (TooManyRequestsResponseError)', async () => {
      mockSend.mockRejectedValue(
        Object.assign(new Error('Rate limit exceeded'), { statusCode: 429 })
      )

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      await expect(provider.chat('system', 'user')).rejects.toMatchObject({
        code: 'LLM_RATE_LIMIT'
      })
    })

    it('throws LLM_AUTH_ERROR for statusCode 401 (UnauthorizedResponseError)', async () => {
      mockSend.mockRejectedValue(Object.assign(new Error('Unauthorized'), { statusCode: 401 }))

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      await expect(provider.chat('system', 'user')).rejects.toMatchObject({
        code: 'LLM_AUTH_ERROR'
      })
    })

    it('throws LLM_AUTH_ERROR for statusCode 403', async () => {
      mockSend.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }))

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      await expect(provider.chat('system', 'user')).rejects.toMatchObject({
        code: 'LLM_AUTH_ERROR'
      })
    })

    it('throws LLM_TIMEOUT for RequestTimeoutError', async () => {
      const err = new Error('Request timed out')
      err.name = 'RequestTimeoutError'
      mockSend.mockRejectedValue(err)

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      await expect(provider.chat('system', 'user')).rejects.toMatchObject({
        code: 'LLM_TIMEOUT'
      })
    })

    it('throws LLM_TIMEOUT for RequestAbortedError', async () => {
      const err = new Error('Request aborted')
      err.name = 'RequestAbortedError'
      mockSend.mockRejectedValue(err)
      details: expect.objectContaining({
        provider: 'openrouter',
        responseSchema: null,
        sdkErrorName: 'ResponseValidationError',
        sdkMessage: 'Response validation failed',
        sdkPrettyMessage: 'Response validation failed\nchoices[0].message.content: expected string',
        responseBodyPreview: 'not-json'
      })

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      await expect(provider.chat('system', 'user')).rejects.toMatchObject({
        code: 'LLM_TIMEOUT'
      })
    })

    it('throws UNKNOWN_ERROR for other errors', async () => {
      mockSend.mockRejectedValue(new Error('Something went wrong'))

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      await expect(provider.chat('system', 'user')).rejects.toMatchObject({
        code: 'UNKNOWN_ERROR',
        message: 'Errore OpenRouter: Something went wrong'
      })
    })
  })

  describe('testConnection()', () => {
    it('calls chat with test prompt', async () => {
      mockSend.mockResolvedValue({
        choices: [{ message: { content: '{"status":"ok"}' } }]
      })

      const provider = new OpenRouterProvider({ apiKey: 'sk-or-test' })
      await expect(provider.testConnection()).resolves.toBeUndefined()
      expect(mockSend).toHaveBeenCalledTimes(1)
    })
  })
})
