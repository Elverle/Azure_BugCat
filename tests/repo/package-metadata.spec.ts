import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// The public identity of the project lives in package.json: the license shown
// by GitHub, the repository URL the OpenRouter HTTP-Referer is derived from,
// the homepage the README links back to. A refactor that drops one of these
// fields degrades the public page silently, so it fails the suite instead.
const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'))

describe('package.json identity', () => {
  it('declares the author and the license', () => {
    expect(pkg.author).toBe('Gabriele Versino')
    expect(pkg.license).toBe('MIT')
  })

  it('points at the public repository', () => {
    expect(pkg.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/Elverle/Azure_BugCat.git'
    })
    expect(pkg.homepage).toBe('https://github.com/Elverle/Azure_BugCat')
    expect(pkg.bugs).toEqual({ url: 'https://github.com/Elverle/Azure_BugCat/issues' })
  })

  it('describes the product in english, by its product name', () => {
    expect(pkg.description).toMatch(/BugCat/)
    expect(pkg.description).not.toMatch(/Bug classification tool/)
  })

  it('declares the node floor the workflows install with', () => {
    expect(pkg.engines?.node).toBe('>=22')
  })
})
