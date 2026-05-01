import { describe, expect, it } from 'vitest'
import { CATEGORIZATION_SCHEMA, SIMILAR_BUGS_SCHEMA, getSchema } from '@main/llm/schemas'

describe('schemas', () => {
  describe('CATEGORIZATION_SCHEMA', () => {
    it('has correct top-level structure', () => {
      expect(CATEGORIZATION_SCHEMA.type).toBe('object')
      expect(CATEGORIZATION_SCHEMA.required).toContain('results')
      expect(CATEGORIZATION_SCHEMA.additionalProperties).toBe(false)
    })

    it('defines results as array of objects with required fields', () => {
      const items = CATEGORIZATION_SCHEMA.properties.results.items
      expect(items.type).toBe('object')
      expect(items.required).toEqual(['bugId', 'macroCategory', 'subCategory', 'categoryReason'])
      expect(items.additionalProperties).toBe(false)
    })

    it('defines correct property types for result items', () => {
      const props = CATEGORIZATION_SCHEMA.properties.results.items.properties
      expect(props.bugId.type).toBe('number')
      expect(props.macroCategory.type).toBe('string')
      expect(props.subCategory.type).toBe('string')
      expect(props.categoryReason.type).toBe('string')
    })
  })

  describe('SIMILAR_BUGS_SCHEMA', () => {
    it('has correct top-level structure', () => {
      expect(SIMILAR_BUGS_SCHEMA.type).toBe('object')
      expect(SIMILAR_BUGS_SCHEMA.required).toContain('groups')
      expect(SIMILAR_BUGS_SCHEMA.additionalProperties).toBe(false)
    })

    it('defines groups as array of objects with required fields', () => {
      const items = SIMILAR_BUGS_SCHEMA.properties.groups.items
      expect(items.type).toBe('object')
      expect(items.required).toEqual(['similarityScore', 'reason', 'bugIds'])
      expect(items.additionalProperties).toBe(false)
    })

    it('defines correct property types for group items', () => {
      const props = SIMILAR_BUGS_SCHEMA.properties.groups.items.properties
      expect(props.similarityScore.type).toBe('number')
      expect(props.reason.type).toBe('string')
      expect(props.bugIds.type).toBe('array')
      expect(props.bugIds.items.type).toBe('number')
    })
  })

  describe('getSchema', () => {
    it('returns CATEGORIZATION_SCHEMA for "categorization"', () => {
      expect(getSchema('categorization')).toBe(CATEGORIZATION_SCHEMA)
    })

    it('returns SIMILAR_BUGS_SCHEMA for "similar-bugs"', () => {
      expect(getSchema('similar-bugs')).toBe(SIMILAR_BUGS_SCHEMA)
    })
  })
})
