import { ipcMain, IpcMainInvokeEvent, shell, dialog, BrowserWindow } from 'electron'
import { execFile } from 'child_process'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { store } from './store'
import {
  AppError,
  AppSettings,
  BinaryCheckResult,
  BugCatalog,
  BugItem,
  CatalogMetadata,
  ClosedCatalogSnapshot,
  ProjectEntry,
  SessionData,
  TestConnectionResult
} from '../shared/types'
import { fetchBugsFromQuery, testAdoConnection } from './ado/ado-service'
import { fetchAdoAttachmentDataUrl } from './ado/ado-client'
import { categorizeBugs, testLLMConnection, findSimilarBugs } from './llm'
import {
  mergeFetchIntoCatalog,
  mergeCategorization,
  updateCatalogSimilarityMetadata
} from './utils/catalog-merge'
import {
  SessionManager,
  createRunner,
  buildAnalyzePrompt,
  buildMcpPrompt,
  AgentNotConfiguredError,
  writeMcpConfig,
  checkMcpHealth,
  selectPrimaryProject,
  suggestSecondaryProjects
} from './agent'
import {
  persistSession,
  loadPersistedSessions,
  pruneExpiredSessions,
  markStaleRunning
} from './agent/session-persistence'
import type {
  AgentStartPayload,
  AgentAbortPayload,
  AgentSessionSummary,
  AgentSessionUpdatedPayload,
  AgentSaveReportPayload,
  CategorizedBug,
  AgentChunk,
  McpStatus,
  AppError as AppErrorType
} from '../shared/types'

function isAppError(error: unknown): error is AppError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    typeof (error as AppError).message === 'string'
  )
}

function toRendererError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  if (isAppError(error)) {
    return Object.assign(new Error(error.message), {
      code: error.code,
      details: error.details
    })
  }

  if (error !== null && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message)
    const rendererError = new Error(message)

    if ('code' in error) {
      return Object.assign(rendererError, {
        code: (error as { code?: unknown }).code
      })
    }

    return rendererError
  }

  return new Error(typeof error === 'string' && error.trim() ? error : 'Errore sconosciuto')
}

function resolveAgentApiKey(settings: AppSettings): string | undefined {
  // If using main LLM provider's key (Anthropic or OpenAI auto-mapping)
  if (settings.llmProvider === 'anthropic' || settings.llmProvider === 'openai') {
    return settings.apiKey
  }
  // For explicit agent provider selection
  if (settings.agentProvider === 'copilot-sdk') {
    return settings.copilotByokEnabled ? settings.copilotByokApiKey : undefined
  }
  return settings.agentApiKey || settings.apiKey
}

function resolveCopilotByokProvider(settings: AppSettings): AppSettings['llmProvider'] | undefined {
  if (settings.agentProvider !== 'copilot-sdk' || !settings.copilotByokEnabled) {
    return undefined
  }

  return settings.copilotByokProvider
}

function resolveCopilotByokBaseUrl(settings: AppSettings): string | undefined {
  if (settings.agentProvider !== 'copilot-sdk' || !settings.copilotByokEnabled) {
    return undefined
  }

  const explicitBaseUrl = settings.copilotByokBaseUrl?.trim()
  if (explicitBaseUrl) {
    return explicitBaseUrl
  }

  if (settings.copilotByokProvider === settings.llmProvider && settings.baseUrl?.trim()) {
    return settings.baseUrl.trim()
  }

  switch (settings.copilotByokProvider) {
    case 'openai':
      return 'https://api.openai.com/v1'
    case 'anthropic':
      return 'https://api.anthropic.com'
    case 'openrouter':
      return 'https://openrouter.ai/api/v1'
    default:
      return undefined
  }
}

function resolveAgentProviderType(
  settings: AppSettings
): import('../shared/types').AgentProviderType {
  if (settings.llmProvider === 'anthropic') return 'claude-sdk'
  if (settings.llmProvider === 'openai') return 'codex-sdk'
  return settings.agentProvider
}

export function registerIPCHandlers(): void {
  const categorizeControllers = new Map<number, AbortController>()

  // Ping
  ipcMain.handle(IPC_CHANNELS.PING, () => 'pong')

  // Settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return store.get('settings')
  })
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event, settings: unknown) => {
    store.set('settings', settings)
  })

  // Session
  ipcMain.handle(IPC_CHANNELS.SESSION_GET, () => {
    return store.get('session')
  })
  ipcMain.handle(IPC_CHANNELS.SESSION_CLEAR, () => {
    store.set('session', null)
  })

  // Catalog
  ipcMain.handle(IPC_CHANNELS.CATALOG_CLEAR, () => {
    store.set('bugCatalog', null)
    store.set('catalogMetadata', { lastClearedAt: new Date().toISOString() })
  })

  ipcMain.handle(IPC_CHANNELS.CATALOG_GET_CLOSED, () => {
    const catalog = store.get('bugCatalog') as BugCatalog | null
    const catalogMetadata = store.get('catalogMetadata') as CatalogMetadata | null
    const snapshot: ClosedCatalogSnapshot = {
      closedBugs: [],
      fetchedAt: null,
      lastClearedAt: catalogMetadata?.lastClearedAt ?? null
    }

    if (!catalog) return snapshot

    const session = store.get('session') as SessionData | null
    const closedBugs = Object.values(catalog).filter((b) => b.closedAt !== null)
    return {
      closedBugs,
      fetchedAt: session?.fetchedAt ?? null,
      lastClearedAt: snapshot.lastClearedAt
    }
  })

  // Azure DevOps
  ipcMain.handle(IPC_CHANNELS.ADO_FETCH_BUGS, async () => {
    const settings = store.get('settings') as AppSettings | null
    if (!settings) throw { code: 'STORE_ERROR', message: 'Settings non configurate' }

    try {
      const fetchedBugs = await fetchBugsFromQuery(settings)
      const now = new Date().toISOString()
      const catalog = store.get('bugCatalog') as BugCatalog | null
      const { updatedCatalog, sessionBugs, newBugCount } = mergeFetchIntoCatalog(
        fetchedBugs,
        catalog,
        now
      )

      store.set('bugCatalog', updatedCatalog)

      const updatedSession: SessionData = {
        bugs: sessionBugs,
        fetchedAt: now,
        lastFetchNewCount: newBugCount
      }
      store.set('session', updatedSession)

      return updatedSession.bugs
    } catch (error: unknown) {
      throw error
    }
  })
  ipcMain.handle(
    IPC_CHANNELS.ADO_TEST_CONNECTION,
    async (_event, settingsOverride?: AppSettings) => {
      const settings = settingsOverride ?? (store.get('settings') as AppSettings | null) ?? null
      if (!settings) return { success: false, message: 'Settings non configurate' }
      return testAdoConnection(settings)
    }
  )
  ipcMain.handle(IPC_CHANNELS.ADO_FETCH_ATTACHMENT_DATA_URL, async (_event, url: unknown) => {
    if (typeof url !== 'string' || !url.trim()) {
      throw { code: 'ADO_NOT_FOUND', message: 'URL attachment mancante' }
    }

    const settings = store.get('settings') as AppSettings | null
    if (!settings) throw { code: 'STORE_ERROR', message: 'Settings non configurate' }

    return fetchAdoAttachmentDataUrl(settings, url)
  })

  // LLM
  ipcMain.handle(IPC_CHANNELS.LLM_CATEGORIZE, async (event: IpcMainInvokeEvent) => {
    const webContentsId = event.sender.id
    let abortController: AbortController | null = null

    try {
      const settings = store.get('settings') as AppSettings | null
      if (!settings) throw { code: 'STORE_ERROR', message: 'Settings non configurate' }

      const session = store.get('session') as SessionData | null
      if (!session?.bugs?.length) throw { code: 'STORE_ERROR', message: 'Nessun bug in sessione' }

      if (categorizeControllers.has(webContentsId)) {
        throw { code: 'UNKNOWN_ERROR', message: 'Categorizzazione gia in corso' }
      }

      const bugsToSend: BugItem[] = session.bugs.filter((b) => !b.categorizedAt)
      const now = new Date().toISOString()

      if (bugsToSend.length === 0) {
        // All bugs already categorized — preserve existing categorizedAt to avoid false stale
        if (!session.categorizedAt) {
          const updatedSession: SessionData = {
            ...session,
            categorizedAt: now
          }
          store.set('session', updatedSession)
        }
        return session.bugs
      }

      abortController = new AbortController()
      categorizeControllers.set(webContentsId, abortController)

      const categorized = await categorizeBugs(
        settings,
        bugsToSend,
        (progress) => {
          event.sender.send(IPC_CHANNELS.LLM_CATEGORIZE_PROGRESS, progress)
        },
        abortController.signal
      )

      // Merge LLM results back into full session bug list
      const llmMap = new Map(categorized.map((b) => [b.id, b]))
      const updatedSessionBugs = session.bugs.map((bug) => {
        const llmResult = llmMap.get(bug.id)
        if (llmResult) {
          return {
            ...bug,
            macroCategory: llmResult.macroCategory,
            subCategory: llmResult.subCategory,
            categoryReason: llmResult.categoryReason,
            categorizedAt: now
          }
        }
        return bug
      })

      const catalog = store.get('bugCatalog') as BugCatalog | null
      if (catalog) {
        const { updatedCatalog } = mergeCategorization(session.bugs, categorized, catalog, now)
        store.set('bugCatalog', updatedCatalog)
      }

      const updatedSession: SessionData = {
        bugs: updatedSessionBugs,
        fetchedAt: session.fetchedAt,
        categorizedAt: now
      }
      store.set('session', updatedSession)
      return updatedSessionBugs
    } catch (error: unknown) {
      throw toRendererError(error)
    } finally {
      if (abortController && categorizeControllers.get(webContentsId) === abortController) {
        categorizeControllers.delete(webContentsId)
      }
    }
  })
  ipcMain.handle(IPC_CHANNELS.LLM_CATEGORIZE_CANCEL, async (event: IpcMainInvokeEvent) => {
    const controller = categorizeControllers.get(event.sender.id)
    if (!controller) {
      return { cancelled: false }
    }

    controller.abort()
    return { cancelled: true }
  })
  ipcMain.handle(IPC_CHANNELS.LLM_CATEGORIZE_STATUS, async (event: IpcMainInvokeEvent) => {
    return { active: categorizeControllers.has(event.sender.id) }
  })
  ipcMain.handle(
    IPC_CHANNELS.LLM_TEST_CONNECTION,
    async (_event, settingsOverride?: AppSettings) => {
      const settings = settingsOverride ?? (store.get('settings') as AppSettings | null) ?? null
      if (!settings)
        return { success: false, message: 'Settings non configurate' } as TestConnectionResult

      if (!settings.apiKey?.trim()) {
        return { success: false, message: 'API Key mancante' } as TestConnectionResult
      }

      try {
        await testLLMConnection(settings)
        return { success: true, message: 'Connessione LLM riuscita' } as TestConnectionResult
      } catch (error: unknown) {
        const message =
          error !== null && typeof error === 'object' && 'message' in error
            ? (error as { message: string }).message
            : 'Errore sconosciuto'
        return { success: false, message } as TestConnectionResult
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.LLM_FIND_SIMILAR, async (event: IpcMainInvokeEvent) => {
    const settings = store.get('settings') as AppSettings | null
    if (!settings) throw { code: 'STORE_ERROR', message: 'Settings non configurate' }

    const session = store.get('session') as SessionData | null
    if (!session?.categorizedAt)
      throw { code: 'STORE_ERROR', message: 'Categorizzazione non eseguita' }

    const result = await findSimilarBugs(settings, session.bugs, (progress) => {
      event.sender.send(IPC_CHANNELS.LLM_FIND_SIMILAR_PROGRESS, progress)
    })

    // Persist results in session
    const updatedSession: SessionData = { ...session, similarityResults: result }
    store.set('session', updatedSession)

    // Update catalog similarity metadata
    const catalog = store.get('bugCatalog') as BugCatalog | null
    if (catalog) {
      const updatedCatalog = updateCatalogSimilarityMetadata(catalog, result)
      store.set('bugCatalog', updatedCatalog)
    }

    return result
  })

  // Shell
  ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL, async (_event, url: unknown) => {
    if (typeof url !== 'string') {
      throw new Error('URL must be a string')
    }
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new Error(`Invalid URL: ${url}`)
    }
    if (parsed.protocol !== 'https:') {
      throw new Error('Only https:// URLs are allowed')
    }
    await shell.openExternal(url)
  })

  // Agent
  ipcMain.handle(IPC_CHANNELS.AGENT_CHECK_BINARY, async (): Promise<BinaryCheckResult> => {
    return new Promise((resolve) => {
      execFile('codex', ['--version'], { timeout: 5000 }, (error, stdout) => {
        if (error) {
          resolve({ installed: false, error: error.message })
          return
        }
        resolve({ installed: true, version: stdout.trim() })
      })
    })
  })

  ipcMain.handle(IPC_CHANNELS.AGENT_SELECT_DIRECTORY, async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(focusedWindow!, { properties: ['openDirectory'] })
    return result.filePaths[0] ?? null
  })

  ipcMain.handle(
    IPC_CHANNELS.AGENT_TEST_COPILOT,
    async (
      _event,
      payload?: {
        copilotByokEnabled?: boolean
        copilotByokProvider?: string
        copilotByokApiKey?: string
        copilotByokBaseUrl?: string
        agentProvider?: string
        llmProvider?: string
      }
    ): Promise<{ success: boolean; message: string }> => {
      const settings = payload
        ? ({ ...payload } as Partial<AppSettings>)
        : (store.get('settings') as AppSettings | null)
      if (!settings) {
        return { success: false, message: 'Settings non configurate' }
      }

      const effectiveProvider = payload
        ? (payload.agentProvider ?? 'copilot-sdk')
        : resolveAgentProviderType(settings as AppSettings)
      if (effectiveProvider !== 'copilot-sdk') {
        return { success: false, message: 'Provider agente non è Copilot SDK' }
      }

      if (settings.copilotByokEnabled) {
        // BYOK mode: test API call branched by provider
        const apiKey = settings.copilotByokApiKey?.trim()
        const baseUrl =
          settings.copilotByokBaseUrl?.trim() || resolveCopilotByokBaseUrl(settings as AppSettings)
        if (!apiKey) {
          return { success: false, message: 'API Key BYOK mancante' }
        }
        if (!baseUrl) {
          return { success: false, message: 'Base URL BYOK mancante' }
        }
        try {
          const { net } = await import('electron')
          const provider = settings.copilotByokProvider
          let url: string
          let headers: Record<string, string> = {}

          if (provider === 'anthropic') {
            url = `${baseUrl}/v1/models`
            headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
          } else if (provider === 'gemini') {
            url = `${baseUrl}/v1beta/models?key=${encodeURIComponent(apiKey)}`
          } else {
            // openai, openrouter, generic
            url = `${baseUrl}/models`
            headers = { Authorization: `Bearer ${apiKey}` }
          }

          const response = await net.fetch(url, {
            method: 'GET',
            ...(Object.keys(headers).length > 0 ? { headers } : {})
          })
          if (response.ok) {
            return { success: true, message: 'Connessione BYOK riuscita' }
          }
          return {
            success: false,
            message: `Errore API: ${response.status} ${response.statusText}`
          }
        } catch (err) {
          return {
            success: false,
            message: `Errore connessione: ${err instanceof Error ? err.message : String(err)}`
          }
        }
      } else {
        // Subscription mode: configuration check only (SDK handles auth at runtime)
        return {
          success: true,
          message:
            'Modalità subscription Copilot configurata. La verifica della sessione avverrà al primo avvio.'
        }
      }
    }
  )

  // Projects
  ipcMain.handle(IPC_CHANNELS.PROJECTS_GET, async () => {
    const settings = store.get('settings') as AppSettings
    return settings.projects ?? []
  })

  ipcMain.handle(IPC_CHANNELS.PROJECTS_SET, async (_event, projects: ProjectEntry[]) => {
    const settings = store.get('settings') as AppSettings
    settings.projects = projects
    store.set('settings', settings)
  })

  ipcMain.handle(IPC_CHANNELS.PROJECTS_VALIDATE_PATHS, async (_event, paths: string[]) => {
    const { existsSync, statSync } = await import('fs')
    const result: Record<string, string | null> = {}
    for (const p of paths) {
      if (!p.trim()) {
        result[p] = 'Path is required'
        continue
      }
      if (!existsSync(p)) {
        result[p] = 'Path does not exist'
        continue
      }
      try {
        const stat = statSync(p)
        if (!stat.isDirectory()) {
          result[p] = 'Path is not a directory'
          continue
        }
      } catch {
        result[p] = 'Unable to access path'
        continue
      }
      result[p] = null
    }
    return result
  })

  // Agent Sessions
  const sessionManager = new SessionManager()
  const sessionMcpStatus = new Map<string, McpStatus>()

  // Initialize with persisted sessions and settings
  {
    const settings = store.get('settings') as AppSettings | null
    if (settings?.maxConcurrentSessions) {
      sessionManager.setMaxConcurrent(settings.maxConcurrentSessions)
    }
    const persisted = loadPersistedSessions()
    const restored = markStaleRunning(persisted)
    sessionManager.restoreSessions(restored)
    pruneExpiredSessions()
    restored
      .filter(
        (s) => s.status === 'aborted' && persisted.find((p) => p.id === s.id)?.status === 'running'
      )
      .forEach((s) => persistSession(s))
  }

  ipcMain.handle(IPC_CHANNELS.AGENT_SUGGEST_PROJECTS, async (_event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') {
      throw { code: 'UNKNOWN_ERROR', message: 'Payload non valido per suggest-projects' }
    }

    const { bugId, primaryOverride } = payload as { bugId?: unknown; primaryOverride?: unknown }

    if (typeof bugId !== 'number' || !Number.isFinite(bugId)) {
      throw { code: 'UNKNOWN_ERROR', message: 'bugId deve essere un numero valido' }
    }

    const settings = store.get('settings') as AppSettings | null
    if (!settings) throw { code: 'STORE_ERROR', message: 'Settings non configurate' }

    const session = store.get('session') as SessionData | null
    const bug = session?.bugs?.find((b) => b.id === bugId) as CategorizedBug | undefined
    if (!bug) throw { code: 'STORE_ERROR', message: `Bug ${bugId} non trovato in sessione` }

    const projects = settings.projects ?? []

    // If primaryOverride is provided, use it directly (user changed primary in UI)
    const primaryProjectId =
      typeof primaryOverride === 'string' && projects.some((p) => p.id === primaryOverride)
        ? primaryOverride
        : selectPrimaryProject(bug, projects)

    const suggestedSecondaryIds = primaryProjectId
      ? suggestSecondaryProjects(primaryProjectId, projects)
      : []

    return { primaryProjectId, suggestedSecondaryIds }
  })

  ipcMain.handle(IPC_CHANNELS.AGENT_START, async (event: IpcMainInvokeEvent, payload: unknown) => {
    try {
      if (!payload || typeof payload !== 'object') {
        throw { code: 'UNKNOWN_ERROR', message: 'Payload non valido per agent:start' }
      }

      const {
        bugId,
        mode,
        primaryProjectId,
        secondaryProjectIds: rawSecondaryIds,
        userContext: rawUserContext
      } = payload as AgentStartPayload

      const trimmedUserContext =
        typeof rawUserContext === 'string' && rawUserContext.trim()
          ? rawUserContext.trim().slice(0, 2000)
          : undefined

      if (typeof bugId !== 'number' || !Number.isFinite(bugId)) {
        throw { code: 'UNKNOWN_ERROR', message: 'bugId deve essere un numero valido' }
      }
      if (typeof primaryProjectId !== 'string' || !primaryProjectId.trim()) {
        throw { code: 'UNKNOWN_ERROR', message: 'primaryProjectId mancante' }
      }

      const secondaryProjectIds = Array.isArray(rawSecondaryIds)
        ? rawSecondaryIds.filter(
            (id): id is string => typeof id === 'string' && id.trim().length > 0
          )
        : []

      if (mode !== 'analyze') {
        throw {
          code: 'AGENT_NOT_CONFIGURED',
          message: 'Solo la modalità Analyze è supportata in questa versione'
        }
      }

      const settings = store.get('settings') as AppSettings | null
      if (!settings) throw { code: 'STORE_ERROR', message: 'Settings non configurate' }

      // Resolve bug from session
      const session = store.get('session') as SessionData | null
      const bug = session?.bugs?.find((b) => b.id === bugId) as CategorizedBug | undefined
      if (!bug) throw { code: 'STORE_ERROR', message: `Bug ${bugId} non trovato in sessione` }

      // Resolve project from settings
      const project = settings.projects?.find((p) => p.id === primaryProjectId)
      if (!project)
        throw { code: 'STORE_ERROR', message: `Progetto ${primaryProjectId} non trovato` }

      // Resolve secondary projects
      const secondaryProjects: ProjectEntry[] = []
      if (secondaryProjectIds.length > 0) {
        const { existsSync, statSync } = await import('fs')
        for (const secId of secondaryProjectIds) {
          const secProject = settings.projects?.find((p) => p.id === secId)
          if (!secProject) continue
          if (!secProject.path.trim()) continue
          if (!existsSync(secProject.path)) continue
          try {
            const stat = statSync(secProject.path)
            if (!stat.isDirectory()) continue
          } catch {
            continue
          }
          secondaryProjects.push(secProject)
        }
      }

      const agentProvider = resolveAgentProviderType(settings)

      // Codex binary preflight
      if (agentProvider === 'codex-sdk') {
        await new Promise<void>((resolve, reject) => {
          execFile('codex', ['--version'], { timeout: 5000 }, (error) => {
            if (error) {
              reject({
                code: 'AGENT_BINARY_MISSING',
                message: 'Codex CLI non trovato. Installa con: npm i -g @openai/codex'
              })
            } else {
              resolve()
            }
          })
        })
      }

      const resolvedApiKey = resolveAgentApiKey(settings)
      const resolvedBaseUrl = resolveCopilotByokBaseUrl(settings)
      const resolvedByokProvider = resolveCopilotByokProvider(settings)

      if (agentProvider === 'copilot-sdk' && settings.copilotByokEnabled) {
        if (!resolvedByokProvider) {
          throw { code: 'AGENT_NOT_CONFIGURED', message: 'Provider BYOK Copilot mancante' }
        }
        if (!resolvedApiKey) {
          throw { code: 'AGENT_NOT_CONFIGURED', message: 'API Key BYOK Copilot mancante' }
        }
        if (!resolvedBaseUrl) {
          throw { code: 'AGENT_NOT_CONFIGURED', message: 'Base URL BYOK Copilot mancante' }
        }
      } else if (
        !resolvedApiKey &&
        agentProvider !== 'claude-sdk' &&
        agentProvider !== 'copilot-sdk'
      ) {
        throw { code: 'AGENT_NOT_CONFIGURED', message: 'API Key agente mancante' }
      }

      // Create runner
      let runner
      try {
        runner = createRunner(settings)
      } catch (err) {
        if (err instanceof AgentNotConfiguredError) {
          throw { code: 'AGENT_NOT_CONFIGURED', message: err.message }
        }
        throw err
      }

      // MCP health check and configuration
      let mcpStatus: McpStatus = { available: false, reason: 'MCP non configurabile' }
      const mcpFeasible = !!(settings.pat && settings.orgUrl && settings.projectName)

      if (mcpFeasible) {
        try {
          mcpStatus = await checkMcpHealth({
            orgUrl: settings.orgUrl,
            pat: settings.pat,
            timeoutMs: 5000
          })

          // Write .mcp.json for Claude/Codex (file-based MCP)
          if (mcpStatus.available && agentProvider !== 'copilot-sdk') {
            await writeMcpConfig(project.path, settings.orgUrl)
          }
        } catch {
          mcpStatus = { available: false, reason: 'Errore durante il check MCP' }
        }
      }

      // Choose prompt based on MCP availability
      const prompt = mcpStatus.available
        ? buildMcpPrompt(
            bug.id,
            project,
            settings.architectureContext ?? '',
            settings.orgUrl,
            settings.projectName,
            secondaryProjects.length > 0 ? secondaryProjects : undefined,
            trimmedUserContext
          )
        : buildAnalyzePrompt(
            bug,
            project,
            settings.architectureContext ?? '',
            secondaryProjects.length > 0 ? secondaryProjects : undefined,
            trimmedUserContext
          )

      // Generate session ID early so we can emit MCP status before session starts
      const sessionId = sessionManager.start(
        bugId,
        mode,
        primaryProjectId,
        agentProvider,
        runner,
        prompt,
        {
          primaryPath: project.path,
          secondaryPaths:
            secondaryProjects.length > 0 ? secondaryProjects.map((p) => p.path) : undefined,
          mode,
          apiKey: resolvedApiKey,
          baseUrl: resolvedBaseUrl,
          providerType: resolvedByokProvider,
          model: settings.agentModel,
          mcpAvailable: mcpStatus.available,
          adoPat: settings.pat,
          adoOrgUrl: settings.orgUrl,
          adoProjectName: settings.projectName
        },
        (chunk: AgentChunk) => {
          event.sender.send(IPC_CHANNELS.AGENT_CHUNK, chunk)
        },
        (sid: string, report: string, usage) => {
          event.sender.send(IPC_CHANNELS.AGENT_COMPLETED, { sessionId: sid, report, usage })
          const completedSession = sessionManager.getSession(sid)
          if (completedSession) {
            persistSession(completedSession)
            event.sender.send(IPC_CHANNELS.AGENT_SESSION_UPDATED, {
              sessionId: sid,
              status: completedSession.status,
              completedAt: completedSession.completedAt
            } as AgentSessionUpdatedPayload)
          }
        },
        (sid: string, error: AppErrorType) => {
          event.sender.send(IPC_CHANNELS.AGENT_ERROR, { sessionId: sid, error })
          const erroredSession = sessionManager.getSession(sid)
          if (erroredSession) {
            persistSession(erroredSession)
            event.sender.send(IPC_CHANNELS.AGENT_SESSION_UPDATED, {
              sessionId: sid,
              status: erroredSession.status,
              completedAt: erroredSession.completedAt
            } as AgentSessionUpdatedPayload)
          }
        },
        secondaryProjectIds.length > 0 ? secondaryProjects.map((p) => p.id) : undefined,
        secondaryProjects.length > 0
          ? secondaryProjects.map((p) => ({ name: p.name, path: p.path }))
          : undefined
      )

      // Track MCP status and persist running snapshot for crash recovery
      sessionMcpStatus.set(sessionId, mcpStatus)
      const startedSession = sessionManager.getSession(sessionId)
      if (startedSession) {
        persistSession(startedSession)
      }

      return { sessionId, agentProvider, mcpStatus }
    } catch (error: unknown) {
      throw toRendererError(error)
    }
  })

  ipcMain.handle(IPC_CHANNELS.AGENT_ABORT, async (_event, payload: unknown) => {
    try {
      const { sessionId } = payload as AgentAbortPayload
      const aborted = sessionManager.abort(sessionId)
      if (!aborted) {
        throw {
          code: 'AGENT_SESSION_NOT_FOUND',
          message: 'Sessione non trovata o non in esecuzione'
        }
      }
      const abortedSession = sessionManager.getSession(sessionId)
      if (abortedSession) {
        persistSession(abortedSession)
        const win = BrowserWindow.getFocusedWindow()
        if (win) {
          win.webContents.send(IPC_CHANNELS.AGENT_SESSION_UPDATED, {
            sessionId,
            status: abortedSession.status,
            completedAt: abortedSession.completedAt
          } as AgentSessionUpdatedPayload)
        }
      }
      return { aborted: true }
    } catch (error: unknown) {
      throw toRendererError(error)
    }
  })

  ipcMain.handle(IPC_CHANNELS.AGENT_GET_SESSION, async (_event, sessionId?: string) => {
    return sessionManager.getSession(sessionId)
  })

  ipcMain.handle(IPC_CHANNELS.AGENT_LIST_SESSIONS, async () => {
    const sessions = sessionManager.getAllSessions()
    return sessions.map(
      (s): AgentSessionSummary => ({
        id: s.id,
        bugId: s.bugId,
        mode: s.mode,
        primaryProjectId: s.primaryProjectId,
        secondaryProjectIds: s.secondaryProjectIds,
        agentProvider: s.agentProvider,
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        report: s.report,
        usage: s.usage,
        error: s.error,
        mcpStatus: sessionMcpStatus.get(s.id),
        chunkCount: s.chunks.length
      })
    )
  })

  ipcMain.handle(IPC_CHANNELS.AGENT_SAVE_REPORT, async (_event, payload: unknown) => {
    const { sessionId, defaultFilename } = payload as AgentSaveReportPayload
    const session = sessionManager.getSession(sessionId)
    if (!session?.report) {
      throw { code: 'AGENT_SESSION_NOT_FOUND', message: 'Sessione o report non trovato' }
    }
    const win = BrowserWindow.getFocusedWindow()
    if (!win) throw { code: 'UNKNOWN_ERROR', message: 'Nessuna finestra attiva' }
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      defaultPath: defaultFilename || `bug-${session.bugId}-report.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (canceled || !filePath) return { saved: false }
    const { writeFile } = await import('fs/promises')
    await writeFile(filePath, session.report, 'utf-8')
    return { saved: true, filePath }
  })
}
