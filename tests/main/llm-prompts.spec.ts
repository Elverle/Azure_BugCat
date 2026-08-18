import { describe, expect, it } from 'vitest'
import {
  buildSystemPrompt,
  buildUserMessage,
  buildSimilarBugsSystemPrompt,
  buildSimilarBugsUserMessage
} from '@main/llm/prompts'
import { TECHNICAL_LAYER_VALUES } from '@shared/technical-layer'

describe('prompts', () => {
  describe('buildSystemPrompt', () => {
    it('includes base instructions', () => {
      const prompt = buildSystemPrompt([])
      expect(prompt).toContain('expert software quality analyst')
      expect(prompt).toContain('Return ONLY valid JSON')
      expect(prompt).toContain('bugId (number)')
      expect(prompt).toContain('technical ownership layer')
    })

    it('includes semantic analysis instructions', () => {
      const prompt = buildSystemPrompt([])
      expect(prompt).toContain('semantic meaning')
      expect(prompt).toContain('tag and title as the primary signals')
      expect(prompt).toContain('Use description as an additional signal')
      expect(prompt).toContain('3. The bug tags')
      expect(prompt).toContain('Validazioni')
      expect(prompt).toContain('Costo extra - errore apertura modale')
      expect(prompt).toContain('Best category: "Costi"')
      expect(prompt).toContain(`Use exactly one of: ${TECHNICAL_LAYER_VALUES.join(', ')}`)
    })

    it('includes category constraint when categories provided', () => {
      const prompt = buildSystemPrompt(['UI', 'Backend', 'Database'])
      expect(prompt).toContain('Available categories')
      expect(prompt).toContain('- UI')
      expect(prompt).toContain('- Backend')
      expect(prompt).toContain('- Database')
      expect(prompt).toContain('Copy the chosen macroCategory exactly as written below')
      expect(prompt).toContain('Always choose the closest valid category')
      expect(prompt).not.toContain('Assign categories freely')
    })

    it('allows free categorization when no categories provided', () => {
      const prompt = buildSystemPrompt([])
      expect(prompt).toContain('Assign categories freely based on content')
      expect(prompt).not.toContain('Available Categories')
    })
  })

  describe('buildUserMessage', () => {
    it('formats bugs as JSON with id, title, description, and tags', () => {
      const message = buildUserMessage([
        {
          id: 1,
          title: 'Bug 1',
          description: 'Description 1',
          tags: ['Validazioni', 'Management']
        },
        { id: 2, title: 'Bug 2', description: 'Description 2', tags: [] }
      ])
      expect(message).toContain('Analyze each bug below and assign the most appropriate category')
      expect(message).toContain('Use tag and title as the primary signals')
      expect(message).toContain(
        `Set technicalLayer to exactly one technical layer: ${TECHNICAL_LAYER_VALUES.join(', ')}`
      )
      const json = message.replace(/^[^\[]*/, '')
      const parsed = JSON.parse(json)
      expect(parsed).toHaveLength(2)
      expect(parsed[0]).toEqual({
        id: 1,
        title: 'Bug 1',
        description: 'Description 1',
        tags: ['Validazioni', 'Management']
      })
      expect(parsed[1]).toEqual({ id: 2, title: 'Bug 2', description: 'Description 2', tags: [] })
    })

    it('handles empty description with fallback', () => {
      const message = buildUserMessage([{ id: 1, title: 'Bug 1', description: '' }])
      expect(message).toContain('(nessuna descrizione)')
      expect(message).toContain('"tags": []')
    })

    it('handles empty array', () => {
      const message = buildUserMessage([])
      expect(message).toContain('Analyze each bug')
      expect(message).toContain('[]')
    })
  })

  describe('buildSimilarBugsSystemPrompt', () => {
    it('includes similarity detection instructions', () => {
      const prompt = buildSimilarBugsSystemPrompt()
      expect(prompt).toContain('similar or duplicates')
      expect(prompt).toContain('similarityScore')
      expect(prompt).toContain('bugIds')
      expect(prompt).toContain('reason (string)')
    })

    it('includes scoring criteria', () => {
      const prompt = buildSimilarBugsSystemPrompt()
      expect(prompt).toContain('0.9-1.0')
      expect(prompt).toContain('Below 0.5')
    })
  })

  describe('buildSimilarBugsUserMessage', () => {
    it('formats bugs with category information', () => {
      const message = buildSimilarBugsUserMessage([
        { id: 1, title: 'Bug 1', description: 'Desc 1', macroCategory: 'Validazioni' },
        { id: 2, title: 'Bug 2', description: 'Desc 2', macroCategory: 'Pricing' }
      ])
      expect(message).toContain('similar or potentially duplicate')
      expect(message).toContain('Validazioni')
      expect(message).toContain('Pricing')
    })

    it('handles missing category', () => {
      const message = buildSimilarBugsUserMessage([
        { id: 1, title: 'Bug 1', description: 'Desc 1' }
      ])
      expect(message).toContain('(non categorizzato)')
    })
  })
})
