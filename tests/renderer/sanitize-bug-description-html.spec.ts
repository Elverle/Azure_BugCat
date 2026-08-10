// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { sanitizeBugDescriptionHtml } from '@renderer/lib/sanitize-bug-description-html'

describe('sanitizeBugDescriptionHtml', () => {
  it('removes third-party https images (only data:image and ADO attachments allowed)', () => {
    const html =
      '<img src="https://evil.example/pixel.gif">' +
      '<img src="data:image/png;base64,AAA=">' +
      '<img src="https://dev.azure.com/org/proj/_apis/wit/attachments/abc?fileName=a.png">'

    const out = sanitizeBugDescriptionHtml(html)

    expect(out).not.toContain('evil.example')
    expect(out).toContain('data:image/png')
    expect(out).toContain('/_apis/wit/attachments/')
  })

  it('drops an img entirely when its only source is a blocked third-party url', () => {
    const html = '<p>Text</p><img src="https://evil.example/pixel.gif" alt="tracker">'

    const out = sanitizeBugDescriptionHtml(html)

    expect(out).not.toContain('<img')
    expect(out).toContain('<p>Text</p>')
  })

  it('still allows non-image urls (links) validated by the generic safe-url check', () => {
    const html = '<a href="https://evil.example/page">link</a>'

    const out = sanitizeBugDescriptionHtml(html)

    expect(out).toContain('href="https://evil.example/page"')
  })

  it('blocks javascript: urls on images as before', () => {
    const html = '<img src="javascript:alert(1)" alt="Blocked">'

    const out = sanitizeBugDescriptionHtml(html)

    expect(out).not.toContain('<img')
  })
})
