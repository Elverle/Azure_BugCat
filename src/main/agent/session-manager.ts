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
  private sessions: Map<string, AgentSession> = new Map()
  private abortControllers: Map<string, AbortController> = new Map()
  private sessionSecondaries: Map<string, SecondaryProjectInfo[]> = new Map()
  private maxConcurrent: number

  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent
  }

  setMaxConcurrent(n: number): void {
    this.maxConcurrent = n
  }

  getSession(id?: string): AgentSession | null {
    if (id) {
      return this.sessions.get(id) ?? null
    }
    for (const session of this.sessions.values()) {
      if (session.status === 'running') return session
    }
    return null
  }

  getAllSessions(): AgentSession[] {
    return Array.from(this.sessions.values())
  }

  getRunningCount(): number {
    let count = 0
    for (const session of this.sessions.values()) {
      if (session.status === 'running') count++
    }
    return count
  }

  isRunning(): boolean {
    return this.getRunningCount() > 0
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
    if (this.getRunningCount() >= this.maxConcurrent) {
      throw new Error('Numero massimo di sessioni concorrenti raggiunto')
    }

    const sessionId = randomUUID()
    const controller = new AbortController()

    const session: AgentSession = {
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

    this.sessions.set(sessionId, session)
    this.abortControllers.set(sessionId, controller)
    this.sessionSecondaries.set(sessionId, secondaryProjectInfos ?? [])

    this.runSession(sessionId, controller, runner, prompt, runParams, onChunk, onCompleted, onError)

    return sessionId
  }

  abort(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false
    if (session.status !== 'running') return false

    this.abortControllers.get(sessionId)?.abort()
    session.status = 'aborted'
    session.completedAt = new Date().toISOString()
    return true
  }

  clearCompleted(): void {
    for (const [id, session] of this.sessions) {
      if (session.status !== 'running') {
        this.sessions.delete(id)
        this.abortControllers.delete(id)
        this.sessionSecondaries.delete(id)
      }
    }
  }

  removeSession(id: string): void {
    const session = this.sessions.get(id)
    if (session?.status === 'running') {
      this.abort(id)
    }
    this.sessions.delete(id)
    this.abortControllers.delete(id)
    this.sessionSecondaries.delete(id)
  }

  restoreSessions(sessions: AgentSession[]): void {
    for (const session of sessions) {
      this.sessions.set(session.id, session)
    }
  }

  markStaleAsAborted(): void {
    const now = new Date().toISOString()
    for (const session of this.sessions.values()) {
      if (session.status === 'running') {
        session.status = 'aborted'
        session.completedAt = now
      }
    }
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
    const secondaries = this.sessionSecondaries.get(sessionId) ?? []

    try {
      const result = await runner.run({
        ...runParams,
        prompt,
        abortSignal: controller.signal,
        onChunk: (chunk) => {
          const session = this.sessions.get(sessionId)
          if (!session || session.status !== 'running') return
          const taggedChunk = tagSecondaryChunk(chunk, secondaries)
          const enrichedChunk: AgentChunk = { ...taggedChunk, sessionId }
          // Cap stored chunks to prevent unbounded memory growth
          if (session.chunks.length >= 500) {
            session.chunks.shift()
          }
          session.chunks.push(enrichedChunk)
          onChunk(enrichedChunk)
        }
      })

      const session = this.sessions.get(sessionId)
      if (session && session.status === 'running') {
        session.status = 'completed'
        session.completedAt = new Date().toISOString()
        session.report = result.report
        session.usage = result.usage
        onCompleted(sessionId, result.report, result.usage)
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return

      const session = this.sessions.get(sessionId)
      if (!session || session.status !== 'running') return

      const appError: AppError = {
        code: 'UNKNOWN_ERROR',
        message: err instanceof Error ? err.message : 'Errore durante la sessione agente',
        details: err
      }

      session.status = 'error'
      session.completedAt = new Date().toISOString()
      session.error = appError
      onError(sessionId, appError)
    }
  }
}
