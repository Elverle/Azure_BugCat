import { useState, useCallback, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useAgentSessions } from '@renderer/hooks/useAgentSessions'
import { SessionListPanel } from '@renderer/components/dashboard/SessionListPanel'
import { SessionDetailPanel } from '@renderer/components/dashboard/SessionDetailPanel'
import { AnalyzeStartPanel } from '@renderer/components/dashboard/AnalyzeStartPanel'
import type { CategorizedBug, ProjectEntry } from '@shared/types'

interface SessionWorkspaceProps {
  maxConcurrentSessions: number
  projects: ProjectEntry[]
  bugs: CategorizedBug[]
  onRunningCountChange?: (count: number) => void
  agentAvailability?: { available: boolean; reason?: string }
  agentHint?: string | null
}

export function SessionWorkspace({
  maxConcurrentSessions,
  projects,
  bugs,
  onRunningCountChange,
  agentAvailability,
  agentHint
}: SessionWorkspaceProps): JSX.Element {
  const {
    sessions,
    allSessions,
    selectedSession,
    selectedSessionId,
    runningCount,
    statusFilter,
    selectSession,
    setStatusFilter,
    startSession,
    abortSession,
    copyReport,
    saveReport,
    openBugInAdo
  } = useAgentSessions()

  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false)
  const [selectedBugId, setSelectedBugId] = useState<number | null>(
    bugs.length > 0 ? bugs[0].id : null
  )

  // Report running count to parent for tab badge
  useEffect(() => {
    onRunningCountChange?.(runningCount)
  }, [runningCount, onRunningCountChange])

  // Auto-select new session when it starts
  const prevSessionCountRef = useRef(allSessions.length)
  useEffect(() => {
    if (allSessions.length > prevSessionCountRef.current) {
      // A new session appeared — select the most recent one
      const newest = [...allSessions].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      )[0]
      if (newest) {
        selectSession(newest.id)
      }
    }
    prevSessionCountRef.current = allSessions.length
  }, [allSessions.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewSession = useCallback(() => {
    setShowNewSessionDialog(true)
  }, [])

  const handleAnalyze = useCallback(
    async (bugId: number, primaryProjectId: string, secondaryProjectIds: string[]) => {
      await startSession(bugId, primaryProjectId, secondaryProjectIds)
      setShowNewSessionDialog(false)
    },
    [startSession]
  )

  const selectedBug = bugs.find((b) => b.id === selectedBugId) ?? null

  return (
    <div className="flex h-[calc(100vh-280px)] rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Left panel — session list */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-gray-50">
        <SessionListPanel
          sessions={sessions}
          selectedId={selectedSessionId}
          onSelect={selectSession}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          runningCount={runningCount}
          maxConcurrentSessions={maxConcurrentSessions}
          onNewSession={handleNewSession}
        />
      </div>

      {/* Right panel — session detail */}
      <div className="flex-1 overflow-y-auto p-4">
        <SessionDetailPanel
          session={selectedSession}
          onAbort={abortSession}
          onCopyReport={copyReport}
          onSaveReport={saveReport}
          onOpenBug={openBugInAdo}
        />
      </div>

      {/* New session dialog overlay */}
      {showNewSessionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowNewSessionDialog(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nuova Sessione di Analisi</h2>

            {bugs.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nessun bug disponibile. Carica prima i bug dalla Dashboard.
              </p>
            ) : (
              <>
                {/* Bug selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seleziona Bug
                  </label>
                  <select
                    value={selectedBugId ?? ''}
                    onChange={(e) => setSelectedBugId(Number(e.target.value))}
                    className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {bugs.map((bug) => (
                      <option key={bug.id} value={bug.id}>
                        #{bug.id} — {bug.title.slice(0, 60)}
                        {bug.title.length > 60 ? '…' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reuse AnalyzeStartPanel for project selection */}
                {selectedBug && (
                  <AnalyzeStartPanel
                    bugId={selectedBug.id}
                    bug={selectedBug}
                    projects={projects}
                    onAnalyze={handleAnalyze}
                    isAnalyzing={false}
                    agentAvailability={agentAvailability}
                    agentHint={agentHint}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
