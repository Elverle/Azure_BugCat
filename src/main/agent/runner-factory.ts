import type { AppSettings } from '@shared/types'
import type { AgentRunner } from './types'
import { ClaudeSDKRunner } from './runners/claude-sdk-runner'
import { CodexSDKRunner } from './runners/codex-sdk-runner'
import { CopilotSDKRunner } from './runners/copilot-sdk-runner'

export class AgentNotConfiguredError extends Error {
  constructor(message: string = 'Nessun provider Agent Sessions configurato. Vai in Settings.') {
    super(message)
    this.name = 'AgentNotConfiguredError'
  }
}

export function createRunner(settings: AppSettings): AgentRunner {
  if (settings.llmProvider === 'anthropic') {
    return new ClaudeSDKRunner()
  }

  if (settings.llmProvider === 'openai') {
    return new CodexSDKRunner()
  }

  switch (settings.agentProvider) {
    case 'claude-sdk':
      return new ClaudeSDKRunner()
    case 'codex-sdk':
      return new CodexSDKRunner()
    case 'copilot-sdk':
      return new CopilotSDKRunner()
    case 'none':
    default:
      throw new AgentNotConfiguredError()
  }
}
