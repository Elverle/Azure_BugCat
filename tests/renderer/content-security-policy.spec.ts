import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

describe('renderer content security policy', () => {
  it('allows remote https images for ADO attachment rendering', () => {
    const indexHtml = readFileSync(resolve(__dirname, '../../src/renderer/index.html'), 'utf-8')

    expect(indexHtml).toContain("img-src 'self' data: https: blob:")
  })
})