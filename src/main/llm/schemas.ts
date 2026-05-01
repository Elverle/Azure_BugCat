export const CATEGORIZATION_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          bugId: { type: 'number' },
          macroCategory: { type: 'string' },
          subCategory: { type: 'string' },
          categoryReason: { type: 'string' }
        },
        required: ['bugId', 'macroCategory', 'subCategory', 'categoryReason'],
        additionalProperties: false
      }
    }
  },
  required: ['results'],
  additionalProperties: false
} as const

export const SIMILAR_BUGS_SCHEMA = {
  type: 'object',
  properties: {
    groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          similarityScore: { type: 'number' },
          reason: { type: 'string' },
          bugIds: { type: 'array', items: { type: 'number' } }
        },
        required: ['similarityScore', 'reason', 'bugIds'],
        additionalProperties: false
      }
    }
  },
  required: ['groups'],
  additionalProperties: false
} as const

export type SchemaType = 'categorization' | 'similar-bugs'

export function getSchema(
  type: SchemaType
): typeof CATEGORIZATION_SCHEMA | typeof SIMILAR_BUGS_SCHEMA {
  switch (type) {
    case 'categorization':
      return CATEGORIZATION_SCHEMA
    case 'similar-bugs':
      return SIMILAR_BUGS_SCHEMA
  }
}
