import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

function extractCspContent(indexHtml: string): string {
  const match = indexHtml.match(
    /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/
  )
  if (!match) {
    throw new Error('Content-Security-Policy meta tag not found in index.html')
  }
  return match[1]
}

function parseDirectives(csp: string): Map<string, Set<string>> {
  const directives = new Map<string, Set<string>>()
  for (const rawDirective of csp.split(';')) {
    const trimmed = rawDirective.trim()
    if (!trimmed) continue
    const [name, ...tokens] = trimmed.split(/\s+/)
    directives.set(name, new Set(tokens))
  }
  return directives
}

describe('renderer content security policy', () => {
  const indexHtml = readFileSync(resolve(__dirname, '../../src/renderer/index.html'), 'utf-8')
  const directives = parseDirectives(extractCspContent(indexHtml))

  // Pin the exact token set of every directive, not just a substring: a policy
  // like "img-src 'self' data: blob: https:;" would satisfy a loose
  // `toContain("img-src 'self' data: blob:")` check while still allowing
  // remote https images, silently defeating the guarantee this test exists to
  // enforce.
  it('pins the exact default-src directive', () => {
    expect(directives.get('default-src')).toEqual(new Set(["'self'"]))
  })

  it('pins the exact script-src directive', () => {
    expect(directives.get('script-src')).toEqual(new Set(["'self'"]))
  })

  it('pins the exact style-src directive', () => {
    expect(directives.get('style-src')).toEqual(new Set(["'self'", "'unsafe-inline'"]))
  })

  it('pins the exact font-src directive', () => {
    expect(directives.get('font-src')).toEqual(new Set(["'self'"]))
  })

  it('pins the exact img-src directive: no remote https images, only self/data/blob', () => {
    expect(directives.get('img-src')).toEqual(new Set(["'self'", 'data:', 'blob:']))
  })
})
