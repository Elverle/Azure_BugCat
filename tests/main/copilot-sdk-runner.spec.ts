import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  startMock,
  stopMock,
  forceStopMock,
  createSessionMock,
  sendAndWaitMock,
  disconnectMock,
  onMock
} = vi.hoisted(() => ({
  startMock: vi.fn().mockResolvedValue(undefined),
  stopMock: vi.fn().mockResolvedValue([]),
  forceStopMock: vi.fn().mockResolvedValue(undefined),
  createSessionMock: vi.fn(),
  sendAndWaitMock: vi.fn().mockResolvedValue({ data: { content: 'final report' } }),
  disconnectMock: vi.fn().mockResolvedValue(undefined),
  onMock: vi.fn()
}))

vi.mock('@github/copilot-sdk', () => ({
  CopilotClient: class MockCopilotClient {
    start = startMock
    stop = stopMock
    forceStop = forceStopMock
    createSession = createSessionMock
  }
}))

import {
  CopilotSDKRunner,
  buildCopilotClientOptions,
  resolvePackagedCopilotCliPath
} from '@main/agent/runners/copilot-sdk-runner'

beforeEach(() => {
  startMock.mockClear().mockResolvedValue(undefined)
  stopMock.mockClear().mockResolvedValue([])
  forceStopMock.mockClear().mockResolvedValue(undefined)
  sendAndWaitMock.mockClear().mockResolvedValue({ data: { content: 'final report' } })
  disconnectMock.mockClear().mockResolvedValue(undefined)
  onMock.mockClear()
  createSessionMock.mockReset().mockResolvedValue({
    on: onMock,
    sendAndWait: sendAndWaitMock,
    disconnect: disconnectMock
  })
})

describe('resolvePackagedCopilotCliPath', () => {
  it('resolves the native Windows Copilot executable package when available', () => {
    const resolvedPath = resolvePackagedCopilotCliPath('win32', 'x64', (moduleId) => {
      expect(moduleId).toBe('@github/copilot-win32-x64')
      return 'C:/copilot/copilot.exe'
    })

    expect(resolvedPath).toBe('C:/copilot/copilot.exe')
  })

  it('returns undefined when no native executable package matches the platform', () => {
    const resolvedPath = resolvePackagedCopilotCliPath('freebsd', 'x64', () => {
      throw new Error('should not resolve')
    })

    expect(resolvedPath).toBeUndefined()
  })
})

describe('buildCopilotClientOptions', () => {
  it('prefers the native packaged CLI in Electron', () => {
    const options = buildCopilotClientOptions(
      'C:/repo',
      true,
      { platform: 'win32', arch: 'x64', isElectron: true },
      () => 'C:/copilot/copilot.exe'
    )

    expect(options).toEqual({
      cwd: 'C:/repo',
      cliPath: 'C:/copilot/copilot.exe',
      useLoggedInUser: true
    })
  })

  it('falls back to the Electron node-mode environment when the native CLI package is unavailable', () => {
    const options = buildCopilotClientOptions(
      'C:/repo',
      false,
      { platform: 'win32', arch: 'x64', isElectron: true },
      () => {
        throw new Error('not found')
      }
    )

    expect(options.cwd).toBe('C:/repo')
    expect(options.useLoggedInUser).toBe(false)
    expect(options.cliPath).toBeUndefined()
    expect(options.env?.ELECTRON_RUN_AS_NODE).toBe('1')
  })
})

describe('CopilotSDKRunner', () => {
  it('passes an explicit 10 minute timeout to sendAndWait', async () => {
    const runner = new CopilotSDKRunner()

    const report = await runner.run({
      prompt: 'Analyze this bug',
      primaryPath: 'C:/repo',
      mode: 'analyze',
      abortSignal: new AbortController().signal,
      onChunk: vi.fn()
    })

    expect(sendAndWaitMock).toHaveBeenCalledWith({ prompt: 'Analyze this bug' }, 600000)
    expect(report).toBe('final report')
  })
})
