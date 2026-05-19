import { describe, expect, it, vi } from 'vitest'
import type { AppSettings } from '@shared/types'

// Create mock runner classes in hoisted scope
const { MockClaudeSDKRunner, MockCodexSDKRunner, MockCopilotSDKRunner } = vi.hoisted(() => {
  class MockClaudeSDKRunner {
    readonly supportsFixMode = false
    readonly supportsMcp = false
    async run(): Promise<string> {
      return ''
    }
  }
  class MockCodexSDKRunner {
    readonly supportsFixMode = false
    readonly supportsMcp = false
    async run(): Promise<string> {
      return ''
    }
  }
  class MockCopilotSDKRunner {
    readonly supportsFixMode = false
    readonly supportsMcp = false
    async run(): Promise<string> {
      return ''
    }
  }
  return { MockClaudeSDKRunner, MockCodexSDKRunner, MockCopilotSDKRunner }
})

// Mock the runner modules to avoid SDK resolution
vi.mock('@main/agent/runners/claude-sdk-runner', () => ({
  ClaudeSDKRunner: MockClaudeSDKRunner
}))
vi.mock('@main/agent/runners/codex-sdk-runner', () => ({
  CodexSDKRunner: MockCodexSDKRunner
}))
vi.mock('@main/agent/runners/copilot-sdk-runner', () => ({
  CopilotSDKRunner: MockCopilotSDKRunner
}))

import { createRunner, AgentNotConfiguredError } from '@main/agent/runner-factory'

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    orgUrl: 'https://dev.azure.com/test',
    projectName: 'Test',
    queryId: '00000000-0000-0000-0000-000000000000',
    topN: 10,
    chunkSize: 5,
    llmProvider: 'generic',
    pat: 'test-pat',
    categories: [],
    agentProvider: 'none',
    projects: [],
    architectureContext: '',
    maxConcurrentSessions: 1,
    ...overrides
  }
}

describe('createRunner', () => {
  it('returns ClaudeSDKRunner when llmProvider is anthropic regardless of agentProvider', () => {
    const runner = createRunner(
      makeSettings({ llmProvider: 'anthropic', agentProvider: 'codex-sdk' })
    )
    expect(runner).toBeInstanceOf(MockClaudeSDKRunner)
  })

  it('returns CodexSDKRunner when llmProvider is openai regardless of agentProvider', () => {
    const runner = createRunner(
      makeSettings({ llmProvider: 'openai', agentProvider: 'claude-sdk' })
    )
    expect(runner).toBeInstanceOf(MockCodexSDKRunner)
  })

  it('returns ClaudeSDKRunner when agentProvider is claude-sdk and llmProvider is generic', () => {
    const runner = createRunner(
      makeSettings({ llmProvider: 'generic', agentProvider: 'claude-sdk' })
    )
    expect(runner).toBeInstanceOf(MockClaudeSDKRunner)
  })

  it('returns CodexSDKRunner when agentProvider is codex-sdk', () => {
    const runner = createRunner(
      makeSettings({ llmProvider: 'generic', agentProvider: 'codex-sdk' })
    )
    expect(runner).toBeInstanceOf(MockCodexSDKRunner)
  })

  it('returns CopilotSDKRunner when agentProvider is copilot-sdk', () => {
    const runner = createRunner(
      makeSettings({ llmProvider: 'generic', agentProvider: 'copilot-sdk' })
    )
    expect(runner).toBeInstanceOf(MockCopilotSDKRunner)
  })

  it('throws AgentNotConfiguredError when agentProvider is none and llmProvider is not anthropic/openai', () => {
    expect(() =>
      createRunner(makeSettings({ llmProvider: 'generic', agentProvider: 'none' }))
    ).toThrow(AgentNotConfiguredError)
  })

  it('throws AgentNotConfiguredError with correct name', () => {
    try {
      createRunner(makeSettings({ llmProvider: 'gemini', agentProvider: 'none' }))
    } catch (err) {
      expect(err).toBeInstanceOf(AgentNotConfiguredError)
      expect((err as AgentNotConfiguredError).name).toBe('AgentNotConfiguredError')
    }
  })
})
