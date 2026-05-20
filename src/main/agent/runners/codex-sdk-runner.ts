import type { AgentRunner, RunParams } from '../types'
import { encodePat } from '../mcp-config-writer'

export class CodexSDKRunner implements AgentRunner {
  readonly supportsFixMode = false
  readonly supportsMcp = true

  async run(params: RunParams): Promise<string> {
    const { Codex } = await import('@openai/codex-sdk')

    // Set MCP env var so the spawned process can authenticate with Azure DevOps MCP server.
    // Snapshot previous value to restore it exactly in finally.
    const mcpEnvSet = !!(params.mcpAvailable && params.adoPat)
    const previousPatValue = process.env.PERSONAL_ACCESS_TOKEN
    if (mcpEnvSet) {
      process.env.PERSONAL_ACCESS_TOKEN = encodePat(params.adoPat!)
    }

    try {
      const codex = new Codex({
        apiKey: params.apiKey
      })

      const thread = codex.startThread({
        model: params.model ?? 'codex-mini-latest',
        sandboxMode: 'read-only',
        workingDirectory: params.primaryPath,
        skipGitRepoCheck: true
      })

      let report = ''
      const { events } = await thread.runStreamed(params.prompt)

      for await (const event of events) {
        if (params.abortSignal.aborted) break

        const eventType = (event as any).type ?? ''
        const eventContent = (event as any).content ?? (event as any).text ?? ''

        if (
          eventType.includes('message') ||
          eventType.includes('text') ||
          eventType.includes('response')
        ) {
          const text = typeof eventContent === 'string' ? eventContent : JSON.stringify(event)
          params.onChunk({
            sessionId: '',
            type: 'text',
            content: text,
            timestamp: new Date().toISOString()
          })
          report += text
        } else if (
          eventType.includes('tool') ||
          eventType.includes('command') ||
          eventType.includes('exec')
        ) {
          params.onChunk({
            sessionId: '',
            type: 'tool_use',
            content: JSON.stringify(event),
            timestamp: new Date().toISOString(),
            toolName: (event as any).name ?? (event as any).tool ?? 'tool'
          })
        } else if (
          eventType.includes('completed') ||
          eventType.includes('done') ||
          eventType.includes('finish')
        ) {
          report = (event as any).finalResponse ?? (event as any).content ?? report
        }
      }

      return report
    } finally {
      if (mcpEnvSet) {
        if (previousPatValue === undefined) {
          delete process.env.PERSONAL_ACCESS_TOKEN
        } else {
          process.env.PERSONAL_ACCESS_TOKEN = previousPatValue
        }
      }
    }
  }
}
