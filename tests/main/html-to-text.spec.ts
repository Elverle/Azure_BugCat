import { describe, expect, it } from 'vitest'
import { htmlToText } from '@main/utils/html-to-text'

describe('htmlToText', () => {
  it('converts block elements, lists, tables and entities into readable text', () => {
    const html = [
      '<div><p>Hello&nbsp;<strong>world</strong></p>',
      '<ul><li>One</li><li>Two</li></ul>',
      '<table><tr><th>Name</th><th>Value</th></tr><tr><td>A</td><td>1</td></tr></table>',
      '<p>&amp; done</p></div>'
    ].join('')

    expect(htmlToText(html)).toBe('Hello world\n\n- One\n- Two\nName | Value\nA | 1\n\n& done')
  })

  it('preserves code blocks verbatim while stripping surrounding markup', () => {
    const html = '<p>Before</p><pre>if (a &lt; b) {\n  return true;\n}</pre><p>After</p>'

    expect(htmlToText(html)).toBe('Before\n\nif (a < b) {\n  return true;\n}\n\nAfter')
  })
})
