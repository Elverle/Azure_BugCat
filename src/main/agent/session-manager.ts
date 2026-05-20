import { randomUUID } from 'crypto'
import type {
  AgentSession,
  AgentChunk,
  AgentUsageStats,
  AppError,
  SessionMode,
  AgentProviderType
} from '@shared/types'
import type { AgentRunner, RunParams } from './types'

interface SecondaryProjectInfo {
  name: string
  path: string
}

/**
 * Tags a chunk's content with the secondary project name if its content
 * references a path under one of the secondary projects.
 */
export function tagSecondaryChunk(
  chunk: AgentChunk,
  secondaryProjects: SecondaryProjectInfo[]
): AgentChunk {
  if (chunk.type !== 'tool_result') return chunk

  for (const project of secondaryProjects) {
    if (chunk.content.includes(project.path)) {
      return {
        ...chunk,
        content: `[secondary:${project.name}] ${chunk.content}`
      }
    }
  }
  return chunk
}

export class SessionManager {
  private currentSession: AgentSession | null = null
  private abortController: AbortController | null = null
  private secondaryProjects: SecondaryProjectInfo[] = []

  getSession(): AgentSession | null {
    return this.currentSession
  }

  isRunning(): boolean {
    return this.currentSession?.status === 'running'
  }

  start(
    bugId: number,
    mode: SessionMode,
    primaryProjectId: string,
    agentProvider: AgentProviderType,
    runner: AgentRunner,
    prompt: string,
    runParams: Omit<RunParams, 'prompt' | 'abortSignal' | 'onChunk'>,
    onChunk: (chunk: AgentChunk) => void,
    onCompleted: (sessionId: string, report: string, usage?: AgentUsageStats) => void,
    onError: (sessionId: string, error: AppError) => void,
    secondaryProjectIds?: string[],
    secondaryProjectInfos?: SecondaryProjectInfo[]
  ): string {
    // Auto-clear finished sessions so a new one can start
    if (this.currentSession && this.currentSession.status !== 'running') {
      this.currentSession = null
      this.abortController = null
    }

    if (this.isRunning()) {
      throw new Error('Sessione già in corso')
    }

    const sessionId = randomUUID()
    this.abortController = new AbortController()
    this.secondaryProjects = secondaryProjectInfos ?? []

    this.currentSession = {
      id: sessionId,
      bugId,
      mode,
      primaryProjectId,
      secondaryProjectIds: secondaryProjectIds ?? [],
      agentProvider,
      status: 'running',
      startedAt: new Date().toISOString(),
      chunks: []
    }

    const controller = this.abortController
    this.runSession(sessionId, controller, runner, prompt, runParams, onChunk, onCompleted, onError)

    return sessionId
  }

  abort(sessionId: string): boolean {
    if (!this.currentSession || this.currentSession.id !== sessionId) {
      return false
    }
    if (this.currentSession.status !== 'running') {
      return false
    }

    this.abortController?.abort()
    this.currentSession.status = 'aborted'
    this.currentSession.completedAt = new Date().toISOString()
    return true
  }

  clear(): void {
    if (this.currentSession?.status === 'running') {
      this.abort(this.currentSession.id)
    }
    this.currentSession = null
    this.abortController = null
  }

  private async runSession(
    sessionId: string,
    controller: AbortController,
    runner: AgentRunner,
    prompt: string,
    runParams: Omit<RunParams, 'prompt' | 'abortSignal' | 'onChunk'>,
    onChunk: (chunk: AgentChunk) => void,
    onCompleted: (sessionId: string, report: string, usage?: AgentUsageStats) => void,
    onError: (sessionId: string, error: AppError) => void
  ): Promise<void> {
    try {
      const result = await runner.run({
        ...runParams,
        prompt,
        abortSignal: controller.signal,
        onChunk: (chunk) => {
          if (this.currentSession?.id !== sessionId) return
          const taggedChunk = tagSecondaryChunk(chunk, this.secondaryProjects)
          const enrichedChunk: AgentChunk = { ...taggedChunk, sessionId }
          // Cap stored chunks to prevent unbounded memory growth
          if (this.currentSession.chunks.length >= 500) {
            this.currentSession.chunks.shift()
          }
          this.currentSession.chunks.push(enrichedChunk)
          onChunk(enrichedChunk)
        }
      })

      if (this.currentSession?.id === sessionId && this.currentSession?.status === 'running') {
        this.currentSession.status = 'completed'
        this.currentSession.completedAt = new Date().toISOString()
        this.currentSession.report = result.report
        this.currentSession.usage = result.usage
        onCompleted(sessionId, result.report, result.usage)
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return
      if (this.currentSession?.id !== sessionId) return

      const appError: AppError = {
        code: 'UNKNOWN_ERROR',
        message: err instanceof Error ? err.message : 'Errore durante la sessione agente',
        details: err
      }

      if (this.currentSession?.status === 'running') {
        this.currentSession.status = 'error'
        this.currentSession.completedAt = new Date().toISOString()
        this.currentSession.error = appError
        onError(sessionId, appError)
      }
    }
  }
}
