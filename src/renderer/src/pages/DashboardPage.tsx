import { useState, useMemo, useCallback, useEffect } from 'react'
import { List, Layers, Bug, Sparkles, Play, AlertTriangle, Loader2 } from 'lucide-react'
import { useDashboard } from '@renderer/hooks/useDashboard'
import { useAiCluster } from '@renderer/hooks/useAiCluster'
import { useBugDrawer } from '@renderer/hooks/useBugDrawer'
import { DashboardHeader } from '@renderer/components/dashboard/DashboardHeader'
import { ConfirmDialog } from '@renderer/components/ui/confirm-dialog'
import { KpiCards } from '@renderer/components/dashboard/KpiCards'
import { FilterBar } from '@renderer/components/dashboard/FilterBar'
import { BugTable } from '@renderer/components/dashboard/BugTable'
import BugCard from '@renderer/components/dashboard/BugCard'
import { GroupAccordion } from '@renderer/components/dashboard/GroupAccordion'
import BugDetailDrawer from '@renderer/components/dashboard/BugDetailDrawer'
import { CategorySection } from '@renderer/components/ai-cluster/CategorySection'
import {
  filterBugs,
  sortBugs,
  groupBugs,
  computeKpis,
  getUniqueValues,
  getTechnicalLayersForMacros,
  EMPTY_FILTER_STATE,
  DEFAULT_SORT_STATE,
  type FilterState,
  type SortState,
  type SortKey,
  type GroupBy
} from '@renderer/lib/dashboard-utils'
import { errorLabel, sentinelLabel } from '@renderer/lib/labels'
import { cn } from '@renderer/lib/utils'
import type { AppSettings, CategorizedBug } from '@shared/types'
import { UNASSIGNED } from '@shared/categorization'

type ViewMode = 'table' | 'card' | 'similarity'

const DEFAULT_DRAWER_WIDTH = 400
const MIN_DRAWER_WIDTH = 400
const MAX_DRAWER_WIDTH = 760

function clampDrawerWidth(width: number): number {
  return Math.min(MAX_DRAWER_WIDTH, Math.max(MIN_DRAWER_WIDTH, width))
}

export function DashboardPage(): JSX.Element {
  const {
    bugs,
    loading,
    isCategorizing,
    isCancelling,
    progress,
    categorizeError,
    fetchError,
    sessionInfo,
    fetchBugs,
    categorizeBugs,
    cancelCategorization,
    clearCategorizeError,
    clearFetchError
  } = useDashboard()

  const [selectedFilters, setSelectedFilters] = useState<FilterState>(EMPTY_FILTER_STATE)
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT_STATE)
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [searchText, setSearchText] = useState('')
  const [drawerWidth, setDrawerWidth] = useState(DEFAULT_DRAWER_WIDTH)
  const [adoSettings, setAdoSettings] = useState<{ orgUrl: string; projectName: string }>({
    orgUrl: '',
    projectName: ''
  })

  // Filter options derived from ALL bugs so user can always see all options
  const filterOptions = useMemo(() => {
    const assignees = getUniqueValues(bugs, 'assignee')
    const hasUnassigned = bugs.some((b) => b.assignee == null)
    if (hasUnassigned && !assignees.includes(UNASSIGNED)) {
      assignees.push(UNASSIGNED)
      assignees.sort((a, b) => a.localeCompare(b))
    }

    return {
      statuses: getUniqueValues(bugs, 'state'),
      assignees,
      macroCategories: getUniqueValues(bugs, 'macroCategory'),
      technicalLayers: getTechnicalLayersForMacros(bugs, selectedFilters.macroCategories)
    }
  }, [bugs, selectedFilters.macroCategories])

  // Sub-category selections that the current macro-category choice (or the current
  // bug set) no longer offers are dropped here rather than reconciled in an effect.
  const filterState = useMemo<FilterState>(() => {
    if (selectedFilters.technicalLayers.length === 0) {
      return selectedFilters
    }

    const reconciled = selectedFilters.technicalLayers.filter((sub) =>
      filterOptions.technicalLayers.includes(sub)
    )

    return reconciled.length === selectedFilters.technicalLayers.length
      ? selectedFilters
      : { ...selectedFilters, technicalLayers: reconciled }
  }, [selectedFilters, filterOptions.technicalLayers])

  // Computed values
  const filteredBugs = useMemo(
    () => filterBugs(bugs, { ...filterState, searchText }),
    [bugs, filterState, searchText]
  )

  const sortedBugs = useMemo(
    () => sortBugs(filteredBugs, sortState.key, sortState.direction),
    [filteredBugs, sortState]
  )

  const drawerBugs = useMemo(
    () => (viewMode === 'similarity' ? bugs : sortedBugs),
    [viewMode, bugs, sortedBugs]
  )

  // Bug drawer
  const {
    isOpen: drawerOpen,
    selectedBug,
    hasPrev,
    hasNext,
    openDrawer,
    closeDrawer,
    goToPrev,
    goToNext
  } = useBugDrawer(drawerBugs)

  const kpis = useMemo(() => computeKpis(filteredBugs), [filteredBugs])

  const groupedBugs = useMemo(
    () => (groupBy !== 'none' ? groupBugs(sortedBugs, groupBy) : null),
    [sortedBugs, groupBy]
  )

  // Fetch ADO settings for "View in Azure DevOps" link
  useEffect(() => {
    window.electronAPI.getSettings().then((s: unknown) => {
      const settings = s as AppSettings | null
      if (settings) {
        setAdoSettings({ orgUrl: settings.orgUrl, projectName: settings.projectName })
      }
    })
  }, [])

  // Sort handler with tri-state toggle: asc → desc → none
  const handleSort = useCallback((key: SortKey) => {
    setSortState((prev) => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' as const }
        return { key: null, direction: 'asc' as const }
      }
      return { key, direction: 'asc' as const }
    })
  }, [])

  // Grouping changes start with every group expanded
  const changeGroupBy = useCallback(
    (next: GroupBy) => {
      setGroupBy(next)
      if (next !== 'none') {
        setExpandedGroups(new Set(groupBugs(sortedBugs, next).keys()))
      }
    },
    [sortedBugs]
  )

  // Tab switching
  const setTab = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode)
      changeGroupBy(mode === 'card' ? 'macroCategory' : 'none')
    },
    [changeGroupBy]
  )

  // Expand/Collapse
  const toggleGroup = useCallback((groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupName)) {
        next.delete(groupName)
      } else {
        next.add(groupName)
      }
      return next
    })
  }, [])

  const handleCollapseAll = useCallback(() => {
    if (expandedGroups.size === 0 && groupedBugs) {
      setExpandedGroups(new Set(groupedBugs.keys()))
    } else {
      setExpandedGroups(new Set())
    }
  }, [expandedGroups.size, groupedBugs])

  const allCollapsed = expandedGroups.size === 0

  // Reset all filters
  const handleReset = useCallback(() => {
    setSelectedFilters(EMPTY_FILTER_STATE)
    setSearchText('')
    setSortState(DEFAULT_SORT_STATE)
    changeGroupBy('none')
  }, [changeGroupBy])

  // View in Azure DevOps
  const adoLinkEnabled = Boolean(adoSettings.orgUrl && adoSettings.projectName)
  const handleViewInAdo = useCallback(() => {
    if (!selectedBug || !adoLinkEnabled) return
    const url = `${adoSettings.orgUrl.replace(/\/$/, '')}/${adoSettings.projectName}/_workitems/edit/${selectedBug.id}`
    window.electronAPI.openExternal(url).catch(() => {
      // Silently handled — URL validation in main process prevents invalid links
    })
  }, [selectedBug, adoSettings, adoLinkEnabled])

  const handleSimilarityBugClick = useCallback(
    (bugId: number) => {
      const bug = bugs.find((item) => item.id === bugId)
      if (bug) {
        openDrawer(bug)
      }
    },
    [bugs, openDrawer]
  )

  // Rendered on EVERY branch: an operation can fail while no bugs are loaded
  // (fresh install, bad PAT, empty query), which is exactly when the user has
  // nothing else on screen to explain the failure.
  const errorDialogs = (
    <>
      <ConfirmDialog
        open={categorizeError !== null}
        title={categorizeError ? errorLabel(categorizeError.code) : ''}
        description={categorizeError?.message ?? ''}
        confirmLabel="Close"
        onConfirm={clearCategorizeError}
        onCancel={clearCategorizeError}
      />

      <ConfirmDialog
        open={fetchError !== null}
        title={fetchError ? errorLabel(fetchError.code) : ''}
        description={fetchError?.message ?? ''}
        confirmLabel="Close"
        onConfirm={clearFetchError}
        onCancel={clearFetchError}
      />
    </>
  )

  // No bugs loaded at all
  if (!loading && bugs.length === 0) {
    return (
      <>
        <div className="flex-1 overflow-y-auto p-6">
          <DashboardHeader
            onFetch={fetchBugs}
            onCategorize={categorizeBugs}
            onCancelCategorize={cancelCategorization}
            loading={loading}
            isCategorizing={isCategorizing}
            isCancelling={isCancelling}
            sessionInfo={sessionInfo}
            progress={progress}
          />
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Bug className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600">No bugs loaded</h3>
            <p className="text-sm text-gray-400 mt-1">
              Use the &quot;Fetch Bugs&quot; button to load bugs from Azure DevOps
            </p>
          </div>
        </div>
        {errorDialogs}
      </>
    )
  }

  return (
    <>
      <div
        className="flex-1 overflow-y-auto p-6 transition-all duration-200"
        style={drawerOpen ? { paddingRight: `${drawerWidth}px` } : undefined}
      >
        <DashboardHeader
          onFetch={fetchBugs}
          onCategorize={categorizeBugs}
          onCancelCategorize={cancelCategorization}
          loading={loading}
          isCategorizing={isCategorizing}
          isCancelling={isCancelling}
          sessionInfo={sessionInfo}
          progress={progress}
        />

        {/* View Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setTab('table')}
              className={cn(
                'whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm',
                viewMode === 'table'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <List className="w-4 h-4 mr-2 inline" />
              Full list
            </button>
            <button
              onClick={() => setTab('card')}
              className={cn(
                'whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm',
                viewMode === 'card'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Layers className="w-4 h-4 mr-2 inline" />
              AI Clusters (Raggruppati)
            </button>
            <button
              onClick={() => setTab('similarity')}
              className={cn(
                'whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm',
                viewMode === 'similarity'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Sparkles className="w-4 h-4 mr-2 inline" />
              Similarity (Beta)
            </button>
          </nav>
        </div>

        {viewMode !== 'similarity' && <KpiCards kpis={kpis} />}

        {viewMode !== 'similarity' && (
          <FilterBar
            filterState={filterState}
            onFilterChange={setSelectedFilters}
            filterOptions={filterOptions}
            groupBy={groupBy}
            onGroupByChange={changeGroupBy}
            onReset={handleReset}
            onCollapseAll={handleCollapseAll}
            allCollapsed={allCollapsed}
            searchText={searchText}
            onSearchChange={setSearchText}
          />
        )}

        {/* Bug list */}
        {viewMode === 'similarity' ? (
          <DashboardSimilaritySection bugs={bugs} onBugClick={handleSimilarityBugClick} />
        ) : filteredBugs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-sm text-gray-500">No bugs match the filters</p>
            <button
              onClick={handleReset}
              className="text-sm text-indigo-600 hover:text-indigo-800 mt-2"
            >
              Reset filters
            </button>
          </div>
        ) : groupedBugs ? (
          Array.from(groupedBugs.entries()).map(([groupName, groupBugs]) => (
            <GroupAccordion
              key={groupName}
              groupName={groupName}
              bugCount={groupBugs.length}
              isExpanded={expandedGroups.has(groupName)}
              onToggle={() => toggleGroup(groupName)}
            >
              {viewMode === 'table' ? (
                <BugTable
                  bugs={groupBugs}
                  sortState={sortState}
                  onSort={handleSort}
                  onBugClick={openDrawer}
                />
              ) : (
                <div className="p-4 space-y-3">
                  {groupBugs.map((bug) => (
                    <BugCard key={bug.id} bug={bug} onClick={openDrawer} />
                  ))}
                </div>
              )}
            </GroupAccordion>
          ))
        ) : viewMode === 'table' ? (
          <BugTable
            bugs={sortedBugs}
            sortState={sortState}
            onSort={handleSort}
            onBugClick={openDrawer}
          />
        ) : (
          <div className="space-y-3">
            {sortedBugs.map((bug) => (
              <BugCard key={bug.id} bug={bug} onClick={openDrawer} />
            ))}
          </div>
        )}
      </div>
      <BugDetailDrawer
        bug={selectedBug}
        isOpen={drawerOpen}
        width={drawerWidth}
        minWidth={MIN_DRAWER_WIDTH}
        maxWidth={MAX_DRAWER_WIDTH}
        onResize={(nextWidth) => setDrawerWidth(clampDrawerWidth(nextWidth))}
        onClose={closeDrawer}
        onPrev={goToPrev}
        onNext={goToNext}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onViewInAdo={handleViewInAdo}
        adoLinkEnabled={adoLinkEnabled}
      />

      {errorDialogs}
    </>
  )
}

interface DashboardSimilaritySectionProps {
  bugs: CategorizedBug[]
  onBugClick: (bugId: number) => void
}

function DashboardSimilaritySection({
  bugs,
  onBugClick
}: DashboardSimilaritySectionProps): JSX.Element {
  const {
    results,
    loading,
    analyzing,
    isCancelling,
    progress,
    canAnalyze,
    isStale,
    error,
    analyze,
    cancel,
    clearError
  } = useAiCluster()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-7 h-7 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (!canAnalyze) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center rounded-lg border border-dashed border-gray-200 bg-white">
        <Sparkles className="w-10 h-10 text-gray-300 mb-3" />
        <h3 className="text-base font-medium text-gray-600">Categorization required</h3>
        <p className="text-sm text-gray-400 mt-1 max-w-xl px-4">
          Run categorization from the Dashboard first to enable similarity analysis.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Similarity</h2>
            <p className="text-sm text-gray-500 mt-1">
              Finds potentially duplicate or related bugs within the same category.
            </p>
          </div>

          <div className="flex items-center gap-4">
            {results && !analyzing && (
              <p className="text-xs text-gray-400">
                Last analysis: {new Date(results.analyzedAt).toLocaleString('it-IT')}
              </p>
            )}

            <button
              onClick={analyzing ? cancel : analyze}
              disabled={analyzing && isCancelling}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:from-indigo-700 hover:to-purple-700 shadow-sm transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {analyzing
                ? isCancelling
                  ? 'Cancelling…'
                  : 'Cancel analysis'
                : 'Analyze similarity'}
            </button>
          </div>
        </div>

        {isStale && !analyzing && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              These results may be stale: categorization was updated after the last analysis.
            </span>
          </div>
        )}

        {analyzing && progress && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Analyzing group: {progress.currentGroup}</span>
              <span>
                {progress.completed}/{progress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.completed / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {results && !analyzing ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span className="font-medium">
                {results.categories.reduce((sum, category) => sum + category.groups.length, 0)}{' '}
                groups found
              </span>
              <span>·</span>
              <span>
                {
                  new Set(
                    results.categories.flatMap((category) =>
                      category.groups.flatMap((group) => group.bugIds)
                    )
                  ).size
                }{' '}
                bugs involved
              </span>
              <span>·</span>
              <span>{results.categories.length} categories analyzed</span>
            </div>

            <div className="space-y-4">
              {results.categories.map((category) => (
                <CategorySection
                  key={category.macroCategory}
                  category={sentinelLabel(category.macroCategory)}
                  groups={category.groups}
                  bugs={bugs}
                  error={category.error}
                  onBugClick={onBugClick}
                />
              ))}
            </div>
          </div>
        ) : !analyzing ? (
          <div className="flex flex-col items-center justify-center h-48 text-center rounded-lg border border-dashed border-gray-200 bg-white">
            <Sparkles className="w-10 h-10 text-gray-300 mb-3" />
            <h3 className="text-base font-medium text-gray-600">No analysis run yet</h3>
            <p className="text-sm text-gray-400 mt-1 max-w-xl px-4">
              Start the analysis to find similar bugs that can be worked on together or that may describe the same problem.
            </p>
          </div>
        ) : null}
      </div>

      {/* Module-scope `error` (see useAiCluster) survives a tab switch or a
          route navigation, so it needs an explicit dismiss affordance — a
          successful analyze() is not the only way out of it. Consistent with
          categorizeError/fetchError above (FIX 4). */}
      <ConfirmDialog
        open={error !== null && !analyzing}
        title={error ? errorLabel(error.code) : ''}
        description={error?.message ?? ''}
        confirmLabel="Close"
        onConfirm={clearError}
        onCancel={clearError}
      />
    </>
  )
}
