import { useMemo } from 'react'
import { Plus, Loader2, CheckCircle2, XCircle, AlertTriangle, FolderGit2, Plug } from 'lucide-react'
import type { AgentSessionSummary, AgentSessionFilter } from '@shared/types'
import { cn } from '@renderer/lib/utils'

interface SessionListPanelProps {
  sessions: AgentSessionSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
  statusFilter: AgentSessionFilter
  onStatusFilterChange: (filter: AgentSessionFilter) => void
  runningCount: number
  maxConcurrentSessions: number
  onNewSession: () => void
}

const FILTER_TABS: { value: AgentSessionFilter; label: string }[] = [
  { value: 'all', label: 'Tutte' },
  { value: 'running', label: 'In corso' },
  { value: 'completed', label: 'Completate' },
  { value: 'error', label: 'Fallite' },
  { value: 'aborted', label: 'Interrotte' }
]

const PROVIDER_LABELS: Record<string, string> = {
  'claude-sdk': 'Claude',
  'codex-sdk': 'Codex',
  'copilot-sdk': 'Copilot'
}

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  if (diff < 60_000) return 'ora'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m fa`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h fa`
  return new Date(isoDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}

export function SessionListPanel({
  sessions,
  selectedId,
  onSelect,
  statusFilter,
  onStatusFilterChange,
  runningCount,
  maxConcurrentSessions,
  onNewSession
}: SessionListPanelProps): JSX.Element {
  const sorted = useMemo(
    () =>
      [...sessions].sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      ),
    [sessions]
  )

  const isNewDisabled = runningCount >= maxConcurrentSessions

  return (
    <div className="flex flex-col h-full">
      {/* Header with new session button */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200">
        <div className="text-sm font-semibold text-gray-700">
          Sessioni
          {runningCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full">
              {runningCount}
            </span>
          )}
        </div>
        <button
          onClick={onNewSession}
          disabled={isNewDisabled}
          title={
            isNewDisabled ? `Max ${maxConcurrentSessions} sessioni concorrenti` : 'Nuova Sessione'
          }
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
            isNewDisabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          )}
        >
          <Plus size={12} />
          Nuova
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-gray-100 px-2 pt-2 pb-0 gap-1 overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onStatusFilterChange(tab.value)}
            className={cn(
              'px-2 py-1 text-[11px] font-medium rounded-t-md whitespace-nowrap transition-colors',
              statusFilter === tab.value
                ? 'bg-white text-indigo-700 border border-gray-200 border-b-white -mb-px'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <p className="text-xs text-gray-400">Nessuna sessione</p>
          </div>
        ) : (
          <div className="py-1">
            {sorted.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isSelected={session.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SessionItem({
  session,
  isSelected,
  onSelect
}: {
  session: AgentSessionSummary
  isSelected: boolean
  onSelect: (id: string) => void
}): JSX.Element {
  const secondaryCount = session.secondaryProjectIds?.length ?? 0

  return (
    <button
      onClick={() => onSelect(session.id)}
      className={cn(
        'w-full text-left px-3 py-2.5 border-b border-gray-50 transition-colors',
        isSelected ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-gray-50'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={session.status} />
          <span className="text-sm font-semibold text-gray-900 truncate">#{session.bugId}</span>
        </div>
        <span className="text-[10px] text-gray-400 whitespace-nowrap">
          {relativeTime(session.startedAt)}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">
          {PROVIDER_LABELS[session.agentProvider] ?? session.agentProvider}
        </span>
        {secondaryCount > 0 && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-50 text-purple-600">
            <FolderGit2 size={9} />+{secondaryCount} repo
          </span>
        )}
        {session.mcpStatus?.available && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-50 text-emerald-600">
            <Plug size={9} />
            MCP
          </span>
        )}
        {session.status === 'running' && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-600">
            {session.chunkCount} chunks
          </span>
        )}
      </div>
    </button>
  )
}

function StatusDot({ status }: { status: AgentSessionSummary['status'] }): JSX.Element {
  switch (status) {
    case 'running':
      return <Loader2 size={12} className="text-blue-500 animate-spin flex-shrink-0" />
    case 'completed':
      return <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
    case 'aborted':
      return <XCircle size={12} className="text-amber-500 flex-shrink-0" />
    case 'error':
      return <AlertTriangle size={12} className="text-red-500 flex-shrink-0" />
  }
}
