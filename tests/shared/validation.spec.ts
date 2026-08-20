import { describe, expect, it } from 'vitest'
import type { AppSettings } from '@shared/types'
import { assertValidSettings } from '@shared/validation'

const validSettings: AppSettings = {
  orgUrl: 'https://dev.azure.com/contoso',
  projectName: 'BugCat',
  queryId: '123e4567-e89b-12d3-a456-426614174000',
  topN: 20,
  chunkSize: 15,
  llmProvider: 'openai',
  apiKey: 'sk-test',
  pat: 'pat-token',
  categories: ['UI']
}

describe('assertValidSettings', () => {
  it('returns the settings unchanged when they are valid', () => {
    expect(assertValidSettings(validSettings)).toEqual(validSettings)
  })

  it('throws a STORE_ERROR AppError for a non-object payload', () => {
    expect(() => assertValidSettings(null)).toThrow(
      expect.objectContaining({ code: 'STORE_ERROR' })
    )
    expect(() => assertValidSettings('not-an-object')).toThrow(
      expect.objectContaining({ code: 'STORE_ERROR' })
    )
    expect(() => assertValidSettings(undefined)).toThrow(
      expect.objectContaining({ code: 'STORE_ERROR' })
    )
  })

  it('throws a STORE_ERROR AppError when a field has the wrong primitive type', () => {
    expect(() => assertValidSettings({ ...validSettings, orgUrl: 123 })).toThrow(
      expect.objectContaining({ code: 'STORE_ERROR' })
    )
    expect(() => assertValidSettings({ ...validSettings, topN: '20' })).toThrow(
      expect.objectContaining({ code: 'STORE_ERROR' })
    )
    expect(() => assertValidSettings({ ...validSettings, categories: 'UI' })).toThrow(
      expect.objectContaining({ code: 'STORE_ERROR' })
    )
  })

  // FIX 5: apiKey, baseUrl, llmModel and llmProvider used to reach
  // validateApiKey/validateBaseUrl unchecked — a non-string apiKey would hit
  // `(123).trim()` and surface as a raw TypeError (UNKNOWN_ERROR) instead of the
  // intended STORE_ERROR. categories' elements were only Array.isArray-checked,
  // not string-checked.
  it('throws a STORE_ERROR AppError when apiKey is not a string or undefined', () => {
    expect(() => assertValidSettings({ ...validSettings, apiKey: 123 })).toThrow(
      expect.objectContaining({ code: 'STORE_ERROR' })
    )
  })

  it('treats an omitted apiKey as the optional field it is at the primitive gate, not a type error', () => {
    // apiKey is unconditionally required by validateApiKey, so an omitted one
    // still fails overall validation — but it must fail with that specific,
    // semantic message, not with the primitive-gate's "unexpected field types".
    const { apiKey: _apiKey, ...withoutApiKey } = validSettings
    expect(() => assertValidSettings(withoutApiKey)).toThrow(
      expect.objectContaining({
        code: 'STORE_ERROR',
        message: expect.stringContaining('API Key is required')
      })
    )
  })

  it('throws a STORE_ERROR AppError when baseUrl is not a string or undefined', () => {
    expect(() => assertValidSettings({ ...validSettings, baseUrl: 123 })).toThrow(
      expect.objectContaining({ code: 'STORE_ERROR' })
    )
  })

  it('throws a STORE_ERROR AppError when llmModel is not a string or undefined', () => {
    expect(() => assertValidSettings({ ...validSettings, llmModel: 123 })).toThrow(
      expect.objectContaining({ code: 'STORE_ERROR' })
    )
  })

  it('throws a STORE_ERROR AppError when llmProvider is not one of the known providers', () => {
    expect(() => assertValidSettings({ ...validSettings, llmProvider: 'not-a-provider' })).toThrow(
      expect.objectContaining({ code: 'STORE_ERROR' })
    )
    expect(() => assertValidSettings({ ...validSettings, llmProvider: 123 })).toThrow(
      expect.objectContaining({ code: 'STORE_ERROR' })
    )
  })

  it('accepts every known llmProvider value', () => {
    for (const llmProvider of ['openai', 'anthropic', 'generic', 'gemini', 'openrouter'] as const) {
      // 'generic' additionally requires a baseUrl (validateBaseUrl) — unrelated
      // to the llmProvider primitive/membership check this test targets.
      const candidate = {
        ...validSettings,
        llmProvider,
        baseUrl: llmProvider === 'generic' ? 'https://api.example.com' : undefined
      }
      expect(assertValidSettings(candidate)).toEqual(candidate)
    }
  })

  it('throws a STORE_ERROR AppError when a categories element is not a string', () => {
    expect(() =>
      assertValidSettings({ ...validSettings, categories: ['UI', 123] })
    ).toThrow(expect.objectContaining({ code: 'STORE_ERROR' }))
  })

  // review B5: clearing Top N/Chunk Size in the UI now sends NaN instead of 0.
  // typeof NaN === 'number', so the primitive-type check alone would accept it —
  // only validateIntRange (reached via validateSettings/isSettingsValid) rejects it.
  it('throws a STORE_ERROR AppError for a NaN numeric field', () => {
    expect(() => assertValidSettings({ ...validSettings, topN: Number.NaN })).toThrow(
      expect.objectContaining({ code: 'STORE_ERROR', message: expect.stringContaining('Top N') })
    )
    expect(() => assertValidSettings({ ...validSettings, chunkSize: Number.NaN })).toThrow(
      expect.objectContaining({
        code: 'STORE_ERROR',
        message: expect.stringContaining('Chunk Size')
      })
    )
  })

  it('throws a STORE_ERROR AppError with the collected field errors for an out-of-range value', () => {
    expect(() => assertValidSettings({ ...validSettings, topN: 0 })).toThrow(
      expect.objectContaining({
        code: 'STORE_ERROR',
        message: expect.stringContaining('Top N must be between 1 and 200')
      })
    )
  })
})
