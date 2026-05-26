import type { AppSettings } from '@shared/types'

export type AgentAvailabilityResult = { available: true } | { available: false; reason: string }

/**
 * Determines whether agent sessions can start given the current settings.
 * Used by AnalyzeStartPanel and BugDetailDrawer to proactively block the Analyze action.
 */
export function checkAgentAvailability(settings: AppSettings): AgentAvailabilityResult {
  // Projects check applies to ALL provider paths
  if (!settings.projects || settings.projects.length === 0) {
    return {
      available: false,
      reason: 'Nessun progetto configurato. Aggiungi almeno un progetto in Settings.'
    }
  }

  // Auto-derived providers are always available (credentials come from LLM config)
  if (settings.llmProvider === 'anthropic' || settings.llmProvider === 'openai') {
    return { available: true }
  }

  const effectiveProvider = settings.agentProvider

  if (effectiveProvider === 'none') {
    return {
      available: false,
      reason: 'Agent Sessions disabilitato. Configura un provider agente in Settings.'
    }
  }

  if (effectiveProvider === 'codex-sdk' && !settings.agentApiKey?.trim()) {
    return {
      available: false,
      reason: 'API Key agente richiesta per Codex. Configurala in Settings.'
    }
  }

  if (effectiveProvider === 'copilot-sdk' && settings.copilotByokEnabled) {
    if (!settings.copilotByokProvider || !settings.copilotByokApiKey?.trim()) {
      return {
        available: false,
        reason: 'Configurazione BYOK Copilot incompleta. Verifica in Settings.'
      }
    }
  }

  return { available: true }
}

/**
 * Returns an informational hint when the agent provider requires local configuration.
 * Currently only applies to Claude SDK without an explicit API key.
 */
export function getAgentAvailabilityHint(settings: AppSettings): string | null {
  if (settings.llmProvider === 'anthropic' || settings.llmProvider === 'openai') {
    return null
  }

  if (settings.agentProvider === 'claude-sdk' && !settings.agentApiKey?.trim()) {
    return 'Assicurati che Claude Code sia configurato localmente.'
  }

  return null
}
