import type { KpiData } from '@renderer/lib/dashboard-utils'

interface KpiCardsProps {
  kpis: KpiData
}

export function KpiCards({ kpis }: KpiCardsProps): JSX.Element {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-sm text-gray-500 mb-1">Total Bugs</div>
        <div className="text-2xl font-bold text-gray-900">{kpis.total}</div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-sm text-gray-500 mb-2">Stati</div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Todo</span>
            <span className="font-semibold text-slate-700">{kpis.statusSummary.todo}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">In progress</span>
            <span className="font-semibold text-amber-600">{kpis.statusSummary.inProgress}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Suspended</span>
            <span className="font-semibold text-sky-700">{kpis.statusSummary.suspended}</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-sm text-gray-500 mb-1">Macro-Categorie</div>
        <div className="text-2xl font-bold text-purple-600">{kpis.macroCategories}</div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="text-sm text-gray-500 mb-1">Top Assignees</div>
        {kpis.topAssignees.length > 0 ? (
          <div className="space-y-0.5">
            {kpis.topAssignees.slice(0, 3).map((assignee) => (
              <div key={assignee.name} className="flex justify-between text-sm">
                <span className="text-gray-900 truncate">{assignee.name}</span>
                <span className="text-gray-500 ml-2">{assignee.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400 italic">Nessun assegnatario</div>
        )}
      </div>
    </div>
  )
}
