import type { AgentRunner, RunParams } from '../types'

export class ClaudeSDKRunner implements AgentRunner {
  readonly supportsFixMode = false
  readonly supportsMcp = false

  async run(params: RunParams): Promise<string> {
    const { query } = await import('@anthropic-ai/claude-agent-sdk')

    let report = ''

    // The SDK expects AbortController, not AbortSignal — create a linked one
    const ac = new AbortController()
    const onExternalAbort = (): void => ac.abort()
    params.abortSignal.addEventListener('abort', onExternalAbort, { once: true })

    try {
      const messages = query({
        prompt: params.prompt,
        options: {
          cwd: params.primaryPath,
          allowedTools: ['Read', 'Glob', 'Grep'],
          maxTurns: params.maxTurns ?? 50,
          model: params.model,
          ...(params.apiKey ? { env: { ANTHROPIC_API_KEY: params.apiKey } } : {}),
          abortController: ac,
          permissionMode: 'default'
        }
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
          params.onChunk({
            sessionId: '',
            type: 'status',
            content: 'Analisi completata',
            timestamp: new Date().toISOString()
          })
        }
      }

      return report
    } finally {
      params.abortSignal.removeEventListener('abort', onExternalAbort)
    }
  }
}
