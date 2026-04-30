import { describe, expect, it } from 'vitest'
import { buildSystemPrompt, buildUserMessage } from '@main/llm/prompts'

describe('prompts', () => {
  describe('buildSystemPrompt', () => {
    it('includes base instructions', () => {
      const prompt = buildSystemPrompt([])
      expect(prompt).toContain('You are a software quality analyst')
      expect(prompt).toContain('Return ONLY valid JSON')
      expect(prompt).toContain('"bugId": number')
    })

    it('includes category constraint when categories provided', () => {
      const prompt = buildSystemPrompt(['UI', 'Backend', 'Database'])
      expect(prompt).toContain('Use ONLY these categories: UI, Backend, Database')
      expect(prompt).not.toContain('Assign categories freely')
    })

    it('allows free categorization when no categories provided', () => {
      const prompt = buildSystemPrompt([])
      expect(prompt).toContain('Assign categories freely based on content')
      expect(prompt).not.toContain('Use ONLY these categories')
    })
  })

  describe('buildUserMessage', () => {
    it('formats bugs as JSON with only id, title, description', () => {
      const message = buildUserMessage([
        { id: 1, title: 'Bug 1', description: 'Description 1' },
        { id: 2, title: 'Bug 2', description: 'Description 2' }
      ])
      expect(message).toContain('Categorize these bugs:')
      const json = message.replace('Categorize these bugs:\n', '')
      const parsed = JSON.parse(json)
      expect(parsed).toHaveLength(2)
      expect(parsed[0]).toEqual({ id: 1, title: 'Bug 1', description: 'Description 1' })
      expect(parsed[1]).toEqual({ id: 2, title: 'Bug 2', description: 'Description 2' })
    })

    it('handles empty array', () => {
      const message = buildUserMessage([])
      expect(message).toContain('Categorize these bugs:')
      expect(message).toContain('[]')
    })
  })
})
