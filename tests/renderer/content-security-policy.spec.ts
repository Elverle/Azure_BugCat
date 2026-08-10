import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

describe('renderer content security policy', () => {
  it('does not allow remote https images: ADO attachments are fetched as data urls', () => {
    const indexHtml = readFileSync(resolve(__dirname, '../../src/renderer/index.html'), 'utf-8')

    expect(indexHtml).toContain("img-src 'self' data: blob:")
    expect(indexHtml).not.toContain("img-src 'self' data: https: blob:")
  })
})