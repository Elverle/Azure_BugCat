import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'events'

const resolveMcpServerPathMock = vi.fn()
const extractOrgNameMock = vi.fn()
const encodePatMock = vi.fn()

vi.mock('@main/agent/mcp-config-writer', () => ({
  resolveMcpServerPath: (...args: unknown[]) => resolveMcpServerPathMock(...args),
  extractOrgName: (...args: unknown[]) => extractOrgNameMock(...args),
  encodePat: (...args: unknown[]) => encodePatMock(...args)
}))

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter()
  stderr = new EventEmitter()
  kill = vi.fn()
}

let spawnedChild: MockChildProcess

const spawnMock = vi.fn(() => {
  spawnedChild = new MockChildProcess()
  return spawnedChild
})

vi.mock('child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args)
}))

import { checkMcpHealth } from '@main/agent/mcp-health-check'

beforeEach(() => {
  vi.clearAllMocks()
  resolveMcpServerPathMock.mockReturnValue('/fake/mcp/dist/index.js')
  extractOrgNameMock.mockReturnValue('testorg')
  encodePatMock.mockReturnValue('base64pat')
})

describe('checkMcpHealth', () => {
  it('returns available: true when process writes to stdout and stays alive', async () => {
    vi.useFakeTimers()
    const promise = checkMcpHealth({ orgUrl: 'https://dev.azure.com/testorg', pat: 'my-pat' })

    // Simulate stdout data
    await vi.waitFor(() => expect(spawnedChild).toBeDefined())
    spawnedChild.stdout.emit('data', Buffer.from('Server started'))

    // Advance past the 500ms readiness window
    vi.advanceTimersByTime(500)

    const result = await promise
    expect(result).toEqual({ available: true })
    vi.useRealTimers()
  })

  it('returns timeout when process does not write anything', async () => {
    const promise = checkMcpHealth({
      orgUrl: 'https://dev.azure.com/testorg',
      pat: 'my-pat',
      timeoutMs: 50
    })

    const result = await promise
    expect(result).toEqual({ available: false, reason: 'Health check timeout' })
  })

  it('returns error when process exits with non-zero code', async () => {
    const promise = checkMcpHealth({ orgUrl: 'https://dev.azure.com/testorg', pat: 'my-pat' })

    await vi.waitFor(() => expect(spawnedChild).toBeDefined())
    spawnedChild.emit('close', 1)

    const result = await promise
    expect(result).toEqual({ available: false, reason: 'MCP server exited with code 1' })
  })

  it('returns error when spawn fails (binary not found)', async () => {
    const promise = checkMcpHealth({ orgUrl: 'https://dev.azure.com/testorg', pat: 'my-pat' })

    await vi.waitFor(() => expect(spawnedChild).toBeDefined())
    spawnedChild.emit('error', new Error('spawn ENOENT'))

    const result = await promise
    expect(result).toEqual({ available: false, reason: 'Spawn error: spawn ENOENT' })
  })

  it('returns binary not found when resolveMcpServerPath throws', async () => {
    resolveMcpServerPathMock.mockImplementation(() => {
      throw new Error('MODULE_NOT_FOUND')
    })

    const result = await checkMcpHealth({
      orgUrl: 'https://dev.azure.com/testorg',
      pat: 'my-pat'
    })

    expect(result).toEqual({ available: false, reason: 'MCP server binary not found' })
    expect(spawnMock).not.toHaveBeenCalled()
  })

  it('returns available: true when stderr emits data and process stays alive', async () => {
    vi.useFakeTimers()
    const promise = checkMcpHealth({ orgUrl: 'https://dev.azure.com/testorg', pat: 'my-pat' })

    await vi.waitFor(() => expect(spawnedChild).toBeDefined())
    spawnedChild.stderr.emit('data', Buffer.from('{"level":"info","message":"Starting"}'))

    // Advance past the 500ms readiness window
    vi.advanceTimersByTime(500)

    const result = await promise
    expect(result).toEqual({ available: true })
    vi.useRealTimers()
  })

  it('returns unavailable when process writes output then exits with error', async () => {
    vi.useFakeTimers()
    const promise = checkMcpHealth({ orgUrl: 'https://dev.azure.com/testorg', pat: 'my-pat' })

    await vi.waitFor(() => expect(spawnedChild).toBeDefined())
    // Server outputs something then crashes within the 500ms window
    spawnedChild.stderr.emit('data', Buffer.from('auth error'))
    spawnedChild.emit('close', 1)

    vi.advanceTimersByTime(500)

    const result = await promise
    expect(result).toEqual({ available: false, reason: 'MCP server exited with code 1' })
    vi.useRealTimers()
  })

  it('never throws — always resolves', async () => {
    resolveMcpServerPathMock.mockImplementation(() => {
      throw new Error('unexpected')
    })

    // Should not throw
    const result = await checkMcpHealth({
      orgUrl: 'https://dev.azure.com/org',
      pat: 'x'
    })
    expect(result.available).toBe(false)
  })

  it('returns invalid org URL error when extractOrgName throws', async () => {
    extractOrgNameMock.mockImplementation(() => {
      throw new Error('Cannot extract organization name from URL: bad')
    })

    const result = await checkMcpHealth({
      orgUrl: 'bad',
      pat: 'my-pat'
    })

    expect(result).toEqual({
      available: false,
      reason: 'Invalid org URL: Cannot extract organization name from URL: bad'
    })
    expect(spawnMock).not.toHaveBeenCalled()
  })
})
