import { createRequire } from 'node:module'

import type { AgentRunner, RunParams } from '../types'

const require = createRequire(import.meta.url)
const COPILOT_SEND_AND_WAIT_TIMEOUT_MS = 10 * 60 * 1000

type CopilotLaunchRuntime = {
  platform: NodeJS.Platform
  arch: string
  isElectron: boolean
}

type CopilotClientOptions = {
  cwd: string
  useLoggedInUser: boolean
  cliPath?: string
  env?: NodeJS.ProcessEnv
}

function getCopilotNativeCliPackageName(
  platform: NodeJS.Platform,
  arch: string
): string | undefined {
  switch (platform) {
    case 'win32':
      if (arch === 'x64') {
        return '@github/copilot-win32-x64'
      }
      if (arch === 'arm64') {
        return '@github/copilot-win32-arm64'
      }
      return undefined
    case 'darwin':
      if (arch === 'x64') {
        return '@github/copilot-darwin-x64'
      }
      if (arch === 'arm64') {
        return '@github/copilot-darwin-arm64'
      }
      return undefined
    case 'linux':
      if (arch === 'x64') {
        return '@github/copilot-linux-x64'
      }
      if (arch === 'arm64') {
        return '@github/copilot-linux-arm64'
      }
      return undefined
    default:
      return undefined
  }
}

export function resolvePackagedCopilotCliPath(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
  resolver: (moduleId: string) => string = (moduleId) => require.resolve(moduleId)
): string | undefined {
  const packageName = getCopilotNativeCliPackageName(platform, arch)

  if (!packageName) {
    return undefined
  }

  try {
    return resolver(packageName)
  } catch {
    return undefined
  }
}

export function buildCopilotClientOptions(
  primaryPath: string,
  useLoggedInUser: boolean,
  runtime: CopilotLaunchRuntime = {
    platform: process.platform,
    arch: process.arch,
    isElectron: Boolean(process.versions.electron)
  },
  resolver?: (moduleId: string) => string
): CopilotClientOptions {
  const cliPath = resolvePackagedCopilotCliPath(runtime.platform, runtime.arch, resolver)

  if (cliPath) {
    return {
      cwd: primaryPath,
      cliPath,
      useLoggedInUser
    }
  }

  return {
    cwd: primaryPath,
    env: runtime.isElectron ? { ...process.env, ELECTRON_RUN_AS_NODE: '1' } : undefined,
    useLoggedInUser
  }
}

function resolveCopilotProviderType(
  providerType: RunParams['providerType']
): 'openai' | 'anthropic' | undefined {
  switch (providerType) {
    case 'anthropic':
      return 'anthropic'
    case 'openai':
    case 'generic':
    case 'gemini':
    case 'openrouter':
      return 'openai'
    default:
      return undefined
  }
}

function resolveCopilotModel(params: RunParams): string {
  if (params.model?.trim()) {
    return params.model.trim()
  }

  switch (params.providerType) {
    case 'anthropic':
      return 'claude-sonnet-4.5'
    default:
      return 'gpt-4.1'
  }
}

function buildReadOnlyPermissionHandler(): (request: {
  kind?: string
}) => { kind: 'approve-once' } | { kind: 'reject'; feedback: string } {
  return (request) => {
    if (request.kind === 'shell' || request.kind === 'write') {
      return { kind: 'reject', feedback: 'BugCat consente solo analisi read-only in FT-14B' }
    }

    return { kind: 'approve-once' }
  }
}

function normalizeCopilotError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error('Errore durante la sessione Copilot')
  }

  if (error.message.includes('waiting for session.idle')) {
    return new Error(
      `GitHub Copilot non ha raggiunto lo stato idle entro ${COPILOT_SEND_AND_WAIT_TIMEOUT_MS}ms. Il timeout BugCat per Copilot e stato alzato a 10 minuti; se il problema si ripresenta, la sessione sta continuando a lavorare troppo a lungo oppure si e bloccata su un tool.`
    )
  }

  if (error.message.includes('too many arguments. Expected 0 arguments but got 1')) {
    return new Error(
      'GitHub Copilot CLI e stato avviato con un launcher incompatibile. BugCat ora preferisce il binario nativo del pacchetto @github/copilot per evitare il passaggio attraverso electron.exe. Se il problema persiste, verifica che le optional dependencies di @github/copilot siano installate correttamente per questa piattaforma.'
    )
  }

  if (error.message.includes('CLI server exited unexpectedly with code 0')) {
    return new Error(
      "GitHub Copilot CLI si e chiusa subito durante l'avvio. Il runner usa il CLI bundlato del SDK e, in Electron, forza ELECTRON_RUN_AS_NODE per avviarlo correttamente. Se il problema persiste, verifica che il processo possa spawnare subprocess locali e che @github/copilot sia installato correttamente."
    )
  }

  return error
}

export class CopilotSDKRunner implements AgentRunner {
  readonly supportsFixMode = false
  readonly supportsMcp = false

  async run(params: RunParams): Promise<string> {
    const { CopilotClient } = await import('@github/copilot-sdk')

    const providerType = resolveCopilotProviderType(params.providerType)
    const provider =
      providerType && params.baseUrl
        ? {
            type: providerType,
            baseUrl: params.baseUrl,
            apiKey: params.apiKey
          }
        : undefined

    const client = new CopilotClient(buildCopilotClientOptions(params.primaryPath, !provider))

    let report = ''
    let session:
      | {
          on: (eventName: string, handler: (event: any) => void) => void
          sendAndWait: (payload: { prompt: string }, timeout?: number) => Promise<any>
          abort?: () => Promise<void>
          disconnect?: () => Promise<void>
        }
      | undefined

    try {
      await client.start()
      session = await client.createSession({
        model: resolveCopilotModel(params),
        provider,
        workingDirectory: params.primaryPath,
        streaming: true,
        onPermissionRequest: buildReadOnlyPermissionHandler()
      })

      const abortHandler = (): void => {
        session?.abort?.().catch(() => {})
        client.forceStop().catch(() => {})
      }
      params.abortSignal.addEventListener('abort', abortHandler, { once: true })

      try {
        session.on('assistant.message_delta', (event: any) => {
          const content = event.data?.deltaContent ?? ''
          if (!content) {
            return
          }

          params.onChunk({
            sessionId: '',
            type: 'text',
            content,
            timestamp: new Date().toISOString()
          })
          report += content
        })

        session.on('assistant.message', (event: any) => {
          const content = event.data?.content ?? ''
          if (typeof content === 'string' && content.trim()) {
            report = content
          }
        })

        session.on('tool.execution_start', (event: any) => {
          const toolName = event.data?.toolName ?? event.data?.name ?? 'tool'
          const toolArgs = event.data?.arguments ?? event.data?.input ?? event.data ?? {}
          params.onChunk({
            sessionId: '',
            type: 'tool_use',
            content: `${toolName}(${JSON.stringify(toolArgs)})`,
            timestamp: new Date().toISOString(),
            toolName
          })
        })

        session.on('tool.execution_complete', (event: any) => {
          const result = event.data?.result
          const content =
            typeof result === 'string'
              ? result
              : (result?.textResultForLlm ??
                result?.sessionLog ??
                result?.error ??
                JSON.stringify(result ?? event.data ?? ''))

          if (!content) {
            return
          }

          params.onChunk({
            sessionId: '',
            type: 'tool_result',
            content,
            timestamp: new Date().toISOString()
          })
        })

        params.onChunk({
          sessionId: '',
          type: 'status',
          content: 'Sessione Copilot avviata',
          timestamp: new Date().toISOString()
        })

        const response = await session.sendAndWait(
          { prompt: params.prompt },
          COPILOT_SEND_AND_WAIT_TIMEOUT_MS
        )
        const fallbackContent = response?.data?.content

        if (typeof fallbackContent === 'string' && fallbackContent.trim() && !report.trim()) {
          report = fallbackContent
          params.onChunk({
            sessionId: '',
            type: 'text',
            content: report,
            timestamp: new Date().toISOString()
          })
        }

        params.onChunk({
          sessionId: '',
          type: 'status',
          content: 'Analisi completata',
          timestamp: new Date().toISOString()
        })

        return report
      } finally {
        params.abortSignal.removeEventListener('abort', abortHandler)
        await session.disconnect?.().catch(() => {})
      }
    } catch (error: unknown) {
      throw normalizeCopilotError(error)
    } finally {
      await client.stop().catch(() => {})
    }
  }
}
