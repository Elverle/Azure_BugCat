import { useState, useEffect, useCallback } from 'react'
import { Bot, Loader2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import type { CategorizedBug, ProjectEntry, ProjectSuggestion } from '@shared/types'

interface AnalyzeStartPanelProps {
  bugId: number
  bug: CategorizedBug
  projects: ProjectEntry[]
  onAnalyze: (
    bugId: number,
    primaryProjectId: string,
    secondaryProjectIds: string[],
    userContext?: string
  ) => void
  isAnalyzing: boolean
  agentAvailability?: { available: boolean; reason?: string }
  agentHint?: string | null
}

export function AnalyzeStartPanel({
  bugId,
  bug,
  projects,
  onAnalyze,
  isAnalyzing,
  agentAvailability,
  agentHint
}: AnalyzeStartPanelProps): JSX.Element {
  const [loading, setLoading] = useState(projects.length > 1)
  const [selectedPrimary, setSelectedPrimary] = useState<string>(
    projects.length === 1 ? projects[0].id : ''
  )
  const [checkedSecondaries, setCheckedSecondaries] = useState<string[]>([])
  const [userContext, setUserContext] = useState('')
  const [contextExpanded, setContextExpanded] = useState(false)

  // Reset userContext when bugId changes
  useEffect(() => {
    setUserContext('')
    setContextExpanded(false)
  }, [bugId])

  // Fetch suggestions on mount or when bug/projects change (only for multi-project)
  useEffect(() => {
    if (projects.length <= 1) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const api = window.electronAPI as any
    api
      .agentSuggestProjects({ bugId })
      .then((result: ProjectSuggestion) => {
        if (cancelled) return
        const primary = result.primaryProjectId ?? projects[0].id
        setSelectedPrimary(primary)
        setCheckedSecondaries(result.suggestedSecondaryIds.filter((id) => id !== primary))
      })
      .catch(() => {
        if (cancelled) return
        setSelectedPrimary(projects[0].id)
        setCheckedSecondaries([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [bugId, projects])

  const handlePrimaryChange = useCallback(
    (newPrimaryId: string) => {
      setSelectedPrimary(newPrimaryId)
      setLoading(true)

      // Re-invoke IPC with primaryOverride to recompute secondaries
      const api = window.electronAPI as any
      api
        .agentSuggestProjects({ bugId, primaryOverride: newPrimaryId })
        .then((result: ProjectSuggestion) => {
          setCheckedSecondaries(result.suggestedSecondaryIds.filter((id) => id !== newPrimaryId))
        })
        .catch(() => {
          setCheckedSecondaries([])
        })
        .finally(() => {
          setLoading(false)
        })
    },
    [bugId]
  )

  const handleSecondaryToggle = useCallback((projectId: string) => {
    setCheckedSecondaries((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    )
  }, [])

  const handleAnalyze = useCallback(() => {
    if (selectedPrimary) {
      const trimmed = userContext.trim() || undefined
      onAnalyze(bugId, selectedPrimary, checkedSecondaries, trimmed)
    }
  }, [bugId, selectedPrimary, checkedSecondaries, userContext, onAnalyze])

  // --- Render ---

  if (agentAvailability && !agentAvailability.available) {
    return (
      <div className="flex items-center gap-2 p-2 mb-2 rounded-md bg-amber-50 border border-amber-200">
        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
        <p className="text-xs text-amber-700">{agentAvailability.reason}</p>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center mb-2">
        Configura almeno un progetto in Settings per abilitare l&apos;analisi.
      </p>
    )
  }

  // Single project: auto-select, direct start (no IPC needed)
  if (projects.length === 1) {
    return (
      <div className="flex flex-col items-center justify-center mb-2 space-y-2">
        <UserContextCollapsible
          expanded={contextExpanded}
          onToggle={() => setContextExpanded((v) => !v)}
          value={userContext}
          onChange={setUserContext}
          disabled={isAnalyzing}
        />
        <button
          onClick={() => onAnalyze(bugId, projects[0].id, [], userContext.trim() || undefined)}
          disabled={isAnalyzing}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
          Analizza
        </button>
        {agentHint && <p className="text-xs text-gray-400 text-center mt-1">{agentHint}</p>}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-2 mb-2">
        <Loader2 size={14} className="animate-spin text-gray-400" />
        <span className="text-xs text-gray-400">Calcolo suggerimenti progetto...</span>
      </div>
    )
  }

  const secondaryOptions = projects.filter((p) => p.id !== selectedPrimary)

  return (
    <div className="space-y-2 mb-2">
      {/* Primary project selector */}
      <div className="flex items-center gap-2">
        <select
          value={selectedPrimary}
          onChange={(e) => handlePrimaryChange(e.target.value)}
          className="flex-1 text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          disabled={isAnalyzing}
        >
          <option value="">Seleziona progetto primario...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Secondary projects checkboxes */}
      {secondaryOptions.length > 0 && (
        <div className="border border-gray-100 rounded-md p-2 bg-gray-50">
          <p className="text-xs text-gray-500 mb-1.5">Progetti secondari (contesto aggiuntivo):</p>
          <div className="space-y-1">
            {secondaryOptions.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checkedSecondaries.includes(p.id)}
                  onChange={() => handleSecondaryToggle(p.id)}
                  disabled={isAnalyzing}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>{p.name}</span>
                <span className="text-gray-400">({p.type})</span>
              </label>
            ))}
          </div>
          {checkedSecondaries.length > 3 && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-600">
              <AlertTriangle size={12} />
              <span>Molti progetti secondari possono rallentare l&apos;analisi</span>
            </div>
          )}
        </div>
      )}

      {/* User context notes */}
      <UserContextCollapsible
        expanded={contextExpanded}
        onToggle={() => setContextExpanded((v) => !v)}
        value={userContext}
        onChange={setUserContext}
        disabled={isAnalyzing}
      />

      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={!selectedPrimary || isAnalyzing}
        className="flex items-center justify-center gap-1 w-full px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
        Analizza
      </button>
      {agentHint && <p className="text-xs text-gray-400 text-center mt-1">{agentHint}</p>}
    </div>
  )
}

const USER_CONTEXT_MAX = 2000

function UserContextCollapsible({
  expanded,
  onToggle,
  value,
  onChange,
  disabled
}: {
  expanded: boolean
  onToggle: () => void
  value: string
  onChange: (v: string) => void
  disabled: boolean
}): JSX.Element {
  return (
    <div className="w-full border border-gray-100 rounded-md bg-gray-50">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 w-full px-2 py-1.5 text-left"
        disabled={disabled}
      >
        {expanded ? (
          <ChevronDown size={12} className="text-gray-400" />
        ) : (
          <ChevronRight size={12} className="text-gray-400" />
        )}
        <span className="text-xs text-gray-500">Note per l&apos;analisi</span>
        {!expanded && value.trim().length > 0 && (
          <span className="ml-auto text-[10px] text-indigo-500 font-medium">compilato</span>
        )}
      </button>
      {expanded && (
        <div className="px-2 pb-2">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={USER_CONTEXT_MAX}
            disabled={disabled}
            rows={3}
            placeholder="Hint, considerazioni o contesto aggiuntivo per l'agente..."
            className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 placeholder:text-gray-300"
          />
          {value.length > 0 && (
            <span className="text-[10px] text-gray-400 mt-0.5 block text-right">
              {value.length}/{USER_CONTEXT_MAX}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
