import { useState, useEffect, useCallback } from 'react'
import { Bot, Loader2, AlertTriangle } from 'lucide-react'
import type { CategorizedBug, ProjectEntry, ProjectSuggestion } from '@shared/types'

interface AnalyzeStartPanelProps {
  bugId: number
  bug: CategorizedBug
  projects: ProjectEntry[]
  onAnalyze: (bugId: number, primaryProjectId: string, secondaryProjectIds: string[]) => void
  isAnalyzing: boolean
}

export function AnalyzeStartPanel({
  bugId,
  bug,
  projects,
  onAnalyze,
  isAnalyzing
}: AnalyzeStartPanelProps): JSX.Element {
  const [loading, setLoading] = useState(projects.length > 1)
  const [selectedPrimary, setSelectedPrimary] = useState<string>(
    projects.length === 1 ? projects[0].id : ''
  )
  const [checkedSecondaries, setCheckedSecondaries] = useState<string[]>([])

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
      onAnalyze(bugId, selectedPrimary, checkedSecondaries)
    }
  }, [bugId, selectedPrimary, checkedSecondaries, onAnalyze])

  // --- Render ---

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
      <div className="flex items-center justify-center mb-2">
        <button
          onClick={() => onAnalyze(bugId, projects[0].id, [])}
          disabled={isAnalyzing}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
          Analizza
        </button>
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

      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={!selectedPrimary || isAnalyzing}
        className="flex items-center justify-center gap-1 w-full px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
        Analizza
      </button>
    </div>
  )
}
