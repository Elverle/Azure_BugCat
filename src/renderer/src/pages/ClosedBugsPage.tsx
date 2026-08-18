import { useState } from 'react'
import { AlertTriangle, Archive, ChevronDown, ChevronUp, Loader2, Search } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { useClosedBugKpis } from '@renderer/hooks/useClosedBugKpis'
import { errorLabel, sentinelLabel } from '@renderer/lib/labels'

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'N/A'
  }

  return new Date(value).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function ClosedBugsPage(): JSX.Element {
  const { kpis, loading, error } = useClosedBugKpis()
  const [detailQuery, setDetailQuery] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500 gap-3">
        <AlertTriangle className="w-12 h-12" />
        <p className="text-lg font-medium">{errorLabel(error.code)}</p>
        <p className="text-sm text-gray-500">{error.message}</p>
      </div>
    )
  }

  if (!kpis || kpis.totalClosed === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
        <Archive className="w-12 h-12" />
        <p className="text-lg font-medium">No closed or done bug history found</p>
        <p className="text-sm">
          Bugs that leave the ADO query are tracked here automatically.
        </p>
      </div>
    )
  }

  const normalizedDetailQuery = detailQuery.trim().toLowerCase()
  const visibleCategoryDistribution = kpis.categoryDistribution
    .map((category) => ({
      ...category,
      visibleBugs: normalizedDetailQuery
        ? category.bugs.filter((bug) => {
            return (
              String(bug.id).includes(normalizedDetailQuery) ||
              bug.title.toLowerCase().includes(normalizedDetailQuery)
            )
          })
        : category.bugs
    }))
    .filter((category) => category.visibleBugs.length > 0)

  const visibleBugCount = visibleCategoryDistribution.reduce(
    (total, category) => total + category.visibleBugs.length,
    0
  )
  const visibleCategoryNames = visibleCategoryDistribution.map((category) => category.category)
  const allVisibleCollapsed =
    visibleCategoryNames.length > 0 &&
    visibleCategoryNames.every((categoryName) => collapsedCategories[categoryName] === true)
  const maxCount = kpis.categoryDistribution.length > 0 ? kpis.categoryDistribution[0].count : 0

  function toggleCategory(categoryName: string): void {
    setCollapsedCategories((current) => ({
      ...current,
      [categoryName]: !current[categoryName]
    }))
  }

  function toggleAllVisibleCategories(): void {
    setCollapsedCategories((current) => {
      const nextValue = !allVisibleCollapsed
      const nextState = { ...current }

      for (const categoryName of visibleCategoryNames) {
        nextState[categoryName] = nextValue
      }

      return nextState
    })
  }

  return (
    <div className="px-6 py-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center gap-2">
        <Archive className="w-5 h-5 text-gray-700" />
        <h1 className="text-xl font-bold text-gray-900">Closed bug history</h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Total closed bugs</div>
          <div className="text-2xl font-bold text-gray-900">{kpis.totalClosed}</div>
          <div className="text-xs text-gray-400 mt-2">
            Last history clear: {formatDateTime(kpis.lastClearedAt)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Closed in last update</div>
          <div className="text-2xl font-bold text-indigo-600">{kpis.recentlyClosedCount}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">In similarity group</div>
          <div className="text-2xl font-bold text-purple-600">
            {kpis.similarityGroupCount}
            <span className="text-sm font-normal text-gray-500 ml-1">
              / {kpis.totalClosed} ({kpis.similarityGroupPercentage}%)
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Last update</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatDateTime(kpis.lastUpdateAt)}
          </div>
        </div>
      </div>

      {kpis.categoryDistribution.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm text-gray-500">Distribution by category</div>
              <div className="text-xs text-gray-400 mt-1">
                {visibleBugCount} bugs visible in {visibleCategoryDistribution.length} categories
              </div>
            </div>
            <div className="w-full md:max-w-sm">
              <label htmlFor="closed-bugs-detail-filter" className="sr-only">
                Filter closed bug details
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="closed-bugs-detail-filter"
                  value={detailQuery}
                  onChange={(event) => setDetailQuery(event.target.value)}
                  className="pl-9 bg-white"
                  placeholder="Filter by ID or title"
                />
              </div>
            </div>
          </div>

          {visibleCategoryDistribution.length > 0 ? (
            <div className="mb-4 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleAllVisibleCategories}
              >
                {allVisibleCollapsed ? 'Expand all categories' : 'Collapse all categories'}
              </Button>
            </div>
          ) : null}

          {visibleCategoryDistribution.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
              No bugs match the current filter.
            </div>
          ) : (
            <div className="space-y-4">
              {visibleCategoryDistribution.map(({ category, count, visibleBugs }) => {
                const isCollapsed = collapsedCategories[category] ?? false
                const categoryLabel = sentinelLabel(category)

                return (
                  <div
                    key={category}
                    className="rounded-lg border border-gray-100 p-3 bg-gray-50/40"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 text-left"
                      onClick={() => toggleCategory(category)}
                      aria-expanded={!isCollapsed}
                      aria-label={`${isCollapsed ? 'Show' : 'Hide'} category details ${categoryLabel}`}
                    >
                      <span className="text-sm text-gray-700 w-40 truncate" title={categoryLabel}>
                        {categoryLabel}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all"
                          style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 min-w-20 text-right">
                        {count}
                        {normalizedDetailQuery ? (
                          <span className="ml-1 text-xs font-normal text-gray-500">
                            ({visibleBugs.length} visible)
                          </span>
                        ) : null}
                      </span>
                      {isCollapsed ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      )}
                    </button>

                    {!isCollapsed ? (
                      <div className="mt-3 overflow-hidden rounded-md border border-gray-200 bg-white">
                        <div className="grid grid-cols-[96px_minmax(0,1fr)_180px] gap-3 border-b border-gray-200 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                          <span>ID</span>
                          <span>Title</span>
                          <span>Similarity history</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {visibleBugs.map((bug) => (
                            <div
                              key={bug.id}
                              className="grid grid-cols-[96px_minmax(0,1fr)_180px] gap-3 px-3 py-2 text-sm"
                            >
                              <span className="font-semibold text-gray-900">#{bug.id}</span>
                              <div className="min-w-0">
                                <div className="truncate text-gray-900" title={bug.title}>
                                  {bug.title}
                                </div>
                                <div className="text-xs text-gray-400">
                                  Closed: {formatDateTime(bug.closedAt)}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {bug.everInSimilarityGroup
                                  ? `Seen in similarity${bug.lastSimilarityGroupAt ? ` on ${formatDateTime(bug.lastSimilarityGroupAt)}` : ''}`
                                  : 'No saved group'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Bugs no longer present in the active ADO query. The &quot;closed&quot; state means absence
        from the query, not necessarily closure in Azure DevOps.
      </p>
    </div>
  )
}
