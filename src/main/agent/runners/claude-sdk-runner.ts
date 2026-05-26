import type { AgentRunner, AgentRunResult, RunParams } from '../types'
import type { AgentUsageStats } from '@shared/types'
import { encodePat } from '../mcp-config-writer'
import { mergeAgentUsage, toFiniteNumber } from '../usage'

function normalizeClaudeUsage(rawUsage: unknown, model?: string): AgentUsageStats | undefined {
  const usage = rawUsage as Record<string, unknown> | undefined

  return mergeAgentUsage(undefined, {
    inputTokens: toFiniteNumber(usage?.input_tokens ?? usage?.inputTokens),
    outputTokens: toFiniteNumber(usage?.output_tokens ?? usage?.outputTokens),
    cacheReadTokens: toFiniteNumber(
      usage?.cache_read_input_tokens ?? usage?.cacheReadTokens ?? usage?.cacheReadInputTokens
    ),
    cacheWriteTokens: toFiniteNumber(
      usage?.cache_creation_input_tokens ??
        usage?.cacheWriteTokens ??
        usage?.cacheCreationInputTokens
    ),
    model
  })
}

export class ClaudeSDKRunner implements AgentRunner {
  readonly supportsFixMode = false
  readonly supportsMcp = true

  async run(params: RunParams): Promise<AgentRunResult> {
    const { query } = await import('@anthropic-ai/claude-agent-sdk')

    let report = ''
    let usage: AgentUsageStats | undefined

    // The SDK expects AbortController, not AbortSignal — create a linked one
    const ac = new AbortController()
    const onExternalAbort = (): void => ac.abort()
    params.abortSignal.addEventListener('abort', onExternalAbort, { once: true })

    try {
      const env: Record<string, string> = {}
      if (params.apiKey) env.ANTHROPIC_API_KEY = params.apiKey
      if (params.mcpAvailable && params.adoPat) {
        env.PERSONAL_ACCESS_TOKEN = encodePat(params.adoPat)
      }

      let allowedTools: string[]
      if (params.codeSource === 'mcp-repos') {
        allowedTools = ['mcp__azure-devops']
      } else if (params.mcpAvailable) {
        allowedTools = ['Read', 'Glob', 'Grep', 'mcp__azure-devops']
      } else {
        allowedTools = ['Read', 'Glob', 'Grep']
      }

      const messages = query({
        prompt: params.prompt,
        options: {
          cwd: params.primaryPath,
          allowedTools,
          maxTurns: params.maxTurns ?? 50,
          model: params.model,
          ...(Object.keys(env).length > 0 ? { env } : {}),
          abortController: ac,
          permissionMode: 'default'
        }
      })

      console.log('Claude SDK session started with params:', {
        primaryPath: params.primaryPath,
        model: params.model,
        mcpAvailable: params.mcpAvailable,
        allowedTools,
        prompt: params.prompt.length > 100 ? params.prompt.slice(0, 100) + '...' : params.prompt,
        ...(Object.keys(env).length > 0 ? { envKeys: Object.keys(env) } : {})
      })

      for await (const message of messages) {
        if (params.abortSignal.aborted) break

        const msg = message as any

        if (msg.type === 'system') {
          if (msg.subtype === 'init') {
            params.onChunk({
              sessionId: '',
              type: 'status',
              content: `Sessione Claude avviata (modello: ${msg.model ?? 'default'})`,
              timestamp: new Date().toISOString()
            })
          }
        } else if (msg.type === 'assistant') {
          // The SDK wraps the API response in msg.message
          const apiMessage = msg.message
          usage = mergeAgentUsage(
            usage,
            normalizeClaudeUsage(
              apiMessage?.usage,
              typeof msg.model === 'string' ? msg.model : params.model
            )
          )
          const contentBlocks = Array.isArray(apiMessage?.content) ? apiMessage.content : []

          for (const block of contentBlocks) {
            if (block.type === 'text' && block.text) {
              params.onChunk({
                sessionId: '',
                type: 'text',
                content: block.text,
                timestamp: new Date().toISOString()
              })
              report = block.text
            } else if (block.type === 'tool_use') {
              params.onChunk({
                sessionId: '',
                type: 'tool_use',
                content: `${block.name}(${JSON.stringify(block.input ?? {})})`,
                timestamp: new Date().toISOString(),
                toolName: block.name
              })
            }
          }
        } else if (msg.type === 'user') {
          // Tool results returned to the model
          const toolResult = msg.tool_use_result
          if (toolResult) {
            const resultText =
              typeof toolResult.content === 'string'
                ? toolResult.content
                : Array.isArray(toolResult.content)
                  ? toolResult.content
                      .filter((b: any) => b.type === 'text')
                      .map((b: any) => b.text)
                      .join('')
                  : ''
            if (resultText) {
              params.onChunk({
                sessionId: '',
                type: 'tool_result',
                content: resultText,
                timestamp: new Date().toISOString()
              })
            }
          }
        } else if (msg.type === 'result') {
          report = typeof msg.result === 'string' ? msg.result : JSON.stringify(msg.result)
          usage = mergeAgentUsage(
            usage,
            normalizeClaudeUsage(
              typeof msg.result === 'object' && msg.result !== null
                ? (msg.result as any).usage
                : undefined,
              params.model
            )
          )
          params.onChunk({
            sessionId: '',
            type: 'status',
            content: 'Analisi completata',
            timestamp: new Date().toISOString()
          })
        }
      }

      return { report, usage }
    } finally {
      params.abortSignal.removeEventListener('abort', onExternalAbort)
    }
  }
}
