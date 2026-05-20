import { beforeEach, describe, expect, it, vi } from 'vitest'

const readFileMock = vi.fn()
const writeFileMock = vi.fn().mockResolvedValue(undefined)

vi.mock('fs/promises', () => ({
  readFile: (...args: unknown[]) => readFileMock(...args),
  writeFile: (...args: unknown[]) => writeFileMock(...args)
}))

const requireResolveMock = vi.fn()

vi.mock('module', () => ({
  createRequire: () => ({
    resolve: (...args: unknown[]) => requireResolveMock(...args)
  })
}))

import {
  extractOrgName,
  encodePat,
  resolveMcpServerPath,
  writeMcpConfig
} from '@main/agent/mcp-config-writer'

beforeEach(() => {
  vi.clearAllMocks()
  requireResolveMock.mockReturnValue('/fake/node_modules/@azure-devops/mcp/dist/index.js')
})

describe('extractOrgName', () => {
  it('extracts org from https://dev.azure.com/myorg', () => {
    expect(extractOrgName('https://dev.azure.com/myorg')).toBe('myorg')
  })

  it('extracts org from URL with trailing slash', () => {
    expect(extractOrgName('https://dev.azure.com/myorg/')).toBe('myorg')
  })

  it('throws on empty/invalid URL', () => {
    expect(() => extractOrgName('')).toThrow()
  })

  it('throws on URL with no org path', () => {
    expect(() => extractOrgName('https://dev.azure.com/')).toThrow(
      'Cannot extract organization name'
    )
  })
})

describe('encodePat', () => {
  it('produces valid base64 with colon prefix', () => {
    const encoded = encodePat('my-pat')
    expect(Buffer.from(encoded, 'base64').toString()).toBe(':my-pat')
  })

  it('encodes complex PAT correctly', () => {
    const pat = 'abc123XYZ!@#'
    const encoded = encodePat(pat)
    expect(Buffer.from(encoded, 'base64').toString()).toBe(':' + pat)
  })
})

describe('resolveMcpServerPath', () => {
  it('returns the resolved path when package is found', () => {
    requireResolveMock.mockReturnValue('/path/to/mcp/dist/index.js')
    expect(resolveMcpServerPath()).toBe('/path/to/mcp/dist/index.js')
  })

  it('throws when package is not found', () => {
    requireResolveMock.mockImplementation(() => {
      throw new Error('MODULE_NOT_FOUND')
    })
    expect(() => resolveMcpServerPath()).toThrow(
      'Could not resolve @azure-devops/mcp/dist/index.js'
    )
  })
})

describe('writeMcpConfig', () => {
  it('creates fresh config when .mcp.json does not exist', async () => {
    const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    readFileMock.mockRejectedValue(enoent)

    await writeMcpConfig('/project', 'https://dev.azure.com/testorg')

    expect(writeFileMock).toHaveBeenCalledTimes(1)
    const [path, content] = writeFileMock.mock.calls[0]
    expect(path).toContain('.mcp.json')

    const config = JSON.parse(content)
    expect(config.mcpServers['azure-devops']).toBeDefined()
    expect(config.mcpServers['azure-devops'].command).toBe('node')
    expect(config.mcpServers['azure-devops'].args).toContain('testorg')
    expect(config.mcpServers['azure-devops'].env.PERSONAL_ACCESS_TOKEN).toBe(
      '${PERSONAL_ACCESS_TOKEN}'
    )
  })

  it('merges azure-devops key when .mcp.json has other servers', async () => {
    const existingConfig = {
      mcpServers: {
        'other-server': { command: 'other', args: [] }
      }
    }
    readFileMock.mockResolvedValue(JSON.stringify(existingConfig))

    await writeMcpConfig('/project', 'https://dev.azure.com/myorg')

    const [, content] = writeFileMock.mock.calls[0]
    const config = JSON.parse(content)
    expect(config.mcpServers['other-server']).toEqual({ command: 'other', args: [] })
    expect(config.mcpServers['azure-devops']).toBeDefined()
    expect(config.mcpServers['azure-devops'].args).toContain('myorg')
  })

  it('overwrites entirely when .mcp.json contains invalid JSON', async () => {
    readFileMock.mockResolvedValue('not valid json {{{')

    await writeMcpConfig('/project', 'https://dev.azure.com/badorg')

    const [, content] = writeFileMock.mock.calls[0]
    const config = JSON.parse(content)
    expect(config.mcpServers['azure-devops']).toBeDefined()
    expect(config.mcpServers['azure-devops'].args).toContain('badorg')
  })

  it('never writes cleartext PAT — uses placeholder', async () => {
    const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    readFileMock.mockRejectedValue(enoent)

    await writeMcpConfig('/project', 'https://dev.azure.com/org1')

    const [, content] = writeFileMock.mock.calls[0]
    expect(content).toContain('${PERSONAL_ACCESS_TOKEN}')
    expect(content).not.toMatch(/pat[A-Za-z0-9]/)
  })

  it('includes correct args with org name and authentication flag', async () => {
    const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    readFileMock.mockRejectedValue(enoent)

    await writeMcpConfig('/project', 'https://dev.azure.com/acme')

    const [, content] = writeFileMock.mock.calls[0]
    const config = JSON.parse(content)
    const args = config.mcpServers['azure-devops'].args
    expect(args).toContain('acme')
    expect(args).toContain('--authentication')
    expect(args).toContain('pat')
  })
})
