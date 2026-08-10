// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import {
  resolveAdoAttachmentImages,
  sanitizeBugDescriptionHtml,
  stripAdoAttachmentImages
} from '@renderer/lib/sanitize-bug-description-html'

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

  it('overwrites an explicit target="_self" with _blank so the link still opens externally', () => {
    // With the navigation guard installed, an untouched target="_self" would
    // be a dead end: will-navigate now cancels any attempt to navigate the SPA
    // away, so a same-window link click would silently do nothing.
    const html = '<a href="https://dev.azure.com/org/proj" target="_self">link</a>'

    const out = sanitizeBugDescriptionHtml(html)

    expect(out).toContain('target="_blank"')
    expect(out).not.toContain('target="_self"')
    expect(out).toContain('rel="noopener noreferrer"')
  })
})

describe('stripAdoAttachmentImages hostile-host regression', () => {
  // isAdoAttachmentUrl (and therefore isSafeImageUrl) never inspects the host: it
  // only decides whether an https img[src] is a *candidate* for main-process
  // resolution. The real authority is the main process, which validates the
  // resolved attachment url against the user's configured org origin
  // (isAllowedAttachmentUrl in src/main/ado/ado-client.ts). Until that
  // resolution happens, the renderer must never render the candidate url
  // as-is: stripAdoAttachmentImages removes every ADO-shaped candidate,
  // regardless of host, so a hostile host disguised as an attachment url can
  // never reach the DOM through the drawer's pending-render branch.
  it.each([
    ['plain hostile host', 'https://evil.example/_apis/wit/attachments/track.png'],
    ['uppercase scheme', 'HTTPS://evil.example/_apis/wit/attachments/track.png'],
    ['userinfo masquerading as the real org', 'https://dev.azure.com@evil.example/_apis/wit/attachments/x'],
    ['leading whitespace', '   https://evil.example/_apis/wit/attachments/track.png']
  ])('treats %s as an attachment candidate and strips it', (_label, src) => {
    const html = `<p>Text</p><img src="${src}">`

    const out = stripAdoAttachmentImages(html)

    expect(out).not.toContain('<img')
    expect(out).toContain('<p>Text</p>')
  })
})

describe('resolveAdoAttachmentImages write-path guard', () => {
  it('writes the resolved src when the IPC layer returns a data:image url', async () => {
    const html = '<img src="https://dev.azure.com/org/proj/_apis/wit/attachments/abc">'

    const out = await resolveAdoAttachmentImages(html, async () => 'data:image/png;base64,AAA=')

    expect(out).toContain('src="data:image/png;base64,AAA="')
  })

  it('removes the image when the IPC layer resolves to something that is not a data:image url', async () => {
    const html = '<img src="https://dev.azure.com/org/proj/_apis/wit/attachments/abc">'

    // Simulates a bug/regression in the IPC layer that echoes back the original
    // remote url (or any non-data-url value) instead of throwing: the write
    // path must not trust it, since the sanitizer's job is to guarantee only
    // data: image sources ever reach img[src].
    const out = await resolveAdoAttachmentImages(
      html,
      async () => 'https://evil.example/_apis/wit/attachments/abc'
    )

    expect(out).not.toContain('<img')
  })
})
