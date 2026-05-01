import { describe, expect, it } from 'vitest'
import { createLLMProvider } from '@main/llm/provider-factory'

describe('provider-factory', () => {
  it('creates OpenAI provider', () => {
    const provider = createLLMProvider('openai', { apiKey: 'sk-test' })
    expect(provider.name).toBe('openai')
  })

  it('creates Anthropic provider', () => {
    const provider = createLLMProvider('anthropic', { apiKey: 'sk-ant-test' })
    expect(provider.name).toBe('anthropic')
  })

  it('creates Generic provider', () => {
    const provider = createLLMProvider('generic', {
      apiKey: 'key',
      baseUrl: 'https://api.example.com/v1'
    })
    expect(provider.name).toBe('generic')
  })

  it('throws for Generic without API key', () => {
    expect(() => createLLMProvider('generic', { baseUrl: 'https://api.example.com/v1' })).toThrow()
  })

  it('throws for Generic without baseUrl', () => {
    expect(() => createLLMProvider('generic', { apiKey: 'key' })).toThrow()
  })

  it('creates Gemini provider', () => {
    const provider = createLLMProvider('gemini', { apiKey: 'AIza-test' })
    expect(provider.name).toBe('gemini')
  })

  it('throws for OpenAI without API key', () => {
    expect(() => createLLMProvider('openai', {})).toThrow()
  })

  it('throws for Anthropic without API key', () => {
    expect(() => createLLMProvider('anthropic', { apiKey: '' })).toThrow()
  })

  it('throws for Gemini without API key', () => {
    expect(() => createLLMProvider('gemini', { apiKey: '  ' })).toThrow()
  })
})
