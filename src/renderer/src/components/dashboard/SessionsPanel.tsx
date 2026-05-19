import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Loader2,
  StopCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Bot,
  Terminal,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import type { AgentSession, AgentChunk } from '@shared/types'
import { cn } from '@renderer/lib/utils'

interface SessionsPanelProps {
  session: AgentSession | null
  onAbort: () => void
}

export function SessionsPanel({ session, onAbort }: SessionsPanelProps): JSX.Element {
  const logEndRef = useRef<HTMLDivElement>(null)
  const [logOpen, setLogOpen] = useState(true)
  const [reportOpen, setReportOpen] = useState(true)

  // Auto-scroll to bottom when new chunks arrive
  useEffect(() => {
    if (logOpen && typeof logEndRef.current?.scrollIntoView === 'function') {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [session?.chunks.length, logOpen])

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Bot className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-600">Nessuna sessione attiva</h3>
        <p className="text-sm text-gray-400 mt-1">
          Apri il dettaglio di un bug e clicca &quot;Analizza&quot; per avviare una sessione.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Session header — always visible */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <SessionStatusBadge status={session.status} />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Bug #{session.bugId} — Analisi</h3>
            <p className="text-xs text-gray-500">
              Avviata {new Date(session.startedAt).toLocaleTimeString('it-IT')}
              {session.completedAt && (
                <> · Terminata {new Date(session.completedAt).toLocaleTimeString('it-IT')}</>
              )}
            </p>
          </div>
        </div>
        {session.status === 'running' && (
          <button
            onClick={onAbort}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors"
          >
            <StopCircle size={14} />
            Interrompi
          </button>
        )}
      </div>

      {/* Error message */}
      {session.status === 'error' && session.error && (
        <div className="bg-red-50 border-b border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-800 font-semibold text-sm mb-1">
            <AlertTriangle size={16} />
            Errore sessione
          </div>
          <p className="text-sm text-red-700">{session.error.message}</p>
        </div>
      )}

      {/* Log accordion */}
      <div className="border-b border-gray-100">
        <button
          type="button"
          onClick={() => setLogOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-gray-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Log sessione
            </span>
            <span className="text-xs text-gray-400">({session.chunks.length} eventi)</span>
          </div>
          {logOpen ? (
            <ChevronUp size={14} className="text-gray-400" />
          ) : (
            <ChevronDown size={14} className="text-gray-400" />
          )}
        </button>
        {logOpen && (
          <div className="max-h-[600px] overflow-y-auto p-4 font-mono text-xs space-y-1">
            {session.chunks.length === 0 ? (
              <p className="text-gray-400 italic">In attesa di eventi...</p>
            ) : (
              session.chunks.map((chunk, i) => <ChunkLine key={i} chunk={chunk} />)
            )}
            <div ref={logEndRef} />
          </div>
        )}
      </div>

      {/* Report accordion */}
      {session.status === 'completed' && session.report && (
        <div>
          <button
            type="button"
            onClick={() => setReportOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-green-50 hover:bg-green-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-green-600" />
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                Report finale
              </span>
            </div>
            {reportOpen ? (
              <ChevronUp size={14} className="text-green-400" />
            ) : (
              <ChevronDown size={14} className="text-green-400" />
            )}
          </button>
          {reportOpen && (
            <div className="p-4 prose prose-sm max-w-none text-gray-800 prose-table:border-collapse prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:px-3 prose-th:py-1.5 prose-td:border prose-td:border-gray-200 prose-td:px-3 prose-td:py-1.5">
              <Markdown remarkPlugins={[remarkGfm]}>{session.report}</Markdown>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SessionStatusBadge({ status }: { status: AgentSession['status'] }): JSX.Element {
  switch (status) {
    case 'running':
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
          <Loader2 size={10} className="animate-spin" />
          In corso
        </span>
      )
    case 'completed':
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
          <CheckCircle2 size={10} />
          Completata
        </span>
      )
    case 'aborted':
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
          <XCircle size={10} />
          Interrotta
        </span>
      )
    case 'error':
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
          <AlertTriangle size={10} />
          Errore
        </span>
      )
  }
}

function ChunkLine({ chunk }: { chunk: AgentChunk }): JSX.Element {
  const time = new Date(chunk.timestamp).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  switch (chunk.type) {
    case 'text':
      return (
        <div className="text-gray-800 whitespace-pre-wrap break-words">
          <span className="text-gray-400 mr-2">{time}</span>
          {chunk.content}
        </div>
      )
    case 'tool_use':
      return (
        <div className="text-indigo-600 pl-4 break-words">
          <span className="text-gray-400 mr-2">{time}</span>
          <span className="font-semibold">→ {chunk.toolName ?? 'tool'}</span>{' '}
          <span className="text-indigo-400">
            {chunk.content}
          </span>
        </div>
      )
    case 'tool_result':
      return (
        <div className="text-gray-500 pl-4 whitespace-pre-wrap break-words">
          <span className="text-gray-400 mr-2">{time}</span>← {chunk.content}
        </div>
      )
    case 'status':
      return (
        <div className="text-amber-600 font-semibold">
          <span className="text-gray-400 mr-2">{time}</span>● {chunk.content}
        </div>
      )
  }
}
