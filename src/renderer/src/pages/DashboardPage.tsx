import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  List,
  Layers,
  Bug,
  Sparkles,
  Play,
  AlertTriangle,
  Loader2,
  XCircle,
  Bot
} from 'lucide-react'
import { useDashboard } from '@renderer/hooks/useDashboard'
import { useAiCluster } from '@renderer/hooks/useAiCluster'
import { useAgentSession } from '@renderer/hooks/useAgentSession'
import { SessionsPanel } from '@renderer/components/dashboard/SessionsPanel'
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
  getSubCategoriesForMacros,
  EMPTY_FILTER_STATE,
  DEFAULT_SORT_STATE,
  type FilterState,
  type SortState,
  type SortKey,
  type GroupBy
} from '@renderer/lib/dashboard-utils'
import { cn } from '@renderer/lib/utils'
import type { AppSettings, CategorizedBug } from '@shared/types'

type ViewMode = 'table' | 'card' | 'similarity' | 'sessions'

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
    sessionInfo,
    fetchBugs,
    categorizeBugs,
    cancelCategorization,
    clearCategorizeError
  } = useDashboard()

  const { session: agentSession, startSession, abortSession, clearSession } = useAgentSession()

  const [filterState, setFilterState] = useState<FilterState>(EMPTY_FILTER_STATE)
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
  const [projects, setProjects] = useState<Array<{ id: string; name: string; path: string }>>([])

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

  // Filter options derived from ALL bugs so user can always see all options
  const filterOptions = useMemo(() => {
    const assignees = getUniqueValues(bugs, 'assignee')
    const hasUnassigned = bugs.some((b) => b.assignee == null)
    if (hasUnassigned && !assignees.includes('Unassigned')) {
      assignees.push('Unassigned')
      assignees.sort((a, b) => a.localeCompare(b))
    }

    return {
      statuses: getUniqueValues(bugs, 'state'),
      assignees,
      macroCategories: getUniqueValues(bugs, 'macroCategory'),
      subCategories: getSubCategoriesForMacros(bugs, filterState.macroCategories)
    }
  }, [bugs, filterState.macroCategories])

  // Reconcile sub-category selections when macro-categories change
  useEffect(() => {
    if (filterState.subCategories.length > 0) {
      const validSubs = filterOptions.subCategories
      const reconciled = filterState.subCategories.filter((s) => validSubs.includes(s))
      if (reconciled.length !== filterState.subCategories.length) {
        setFilterState((prev) => ({ ...prev, subCategories: reconciled }))
      }
    }
  }, [filterOptions.subCategories]) // eslint-disable-line react-hooks/exhaustive-deps

  // Expand all groups by default when groupBy changes
  useEffect(() => {
    if (groupedBugs) {
      setExpandedGroups(new Set(groupedBugs.keys()))
    }
  }, [groupBy]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch ADO settings for "View in Azure DevOps" link
  useEffect(() => {
    window.electronAPI.getSettings().then((s: unknown) => {
      const settings = s as AppSettings | null
      if (settings) {
        setAdoSettings({ orgUrl: settings.orgUrl, projectName: settings.projectName })
        if (settings.projects) {
          setProjects(settings.projects.map((p) => ({ id: p.id, name: p.name, path: p.path })))
        }
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

  // Tab switching
  const setTab = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    setGroupBy(mode === 'card' ? 'macroCategory' : 'none')
  }, [])

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
    setFilterState(EMPTY_FILTER_STATE)
    setSearchText('')
    setSortState(DEFAULT_SORT_STATE)
    setGroupBy('none')
  }, [])

  // View in Azure DevOps
  const adoLinkEnabled = Boolean(adoSettings.orgUrl && adoSettings.projectName)
  const handleViewInAdo = useCallback(() => {
    if (!selectedBug || !adoLinkEnabled) return
    const url = `${adoSettings.orgUrl.replace(/\/$/, '')}/${adoSettings.projectName}/_workitems/edit/${selectedBug.id}`
    window.electronAPI.openExternal(url).catch(() => {
      // Silently handled — URL validation in main process prevents invalid links
    })
  }, [selectedBug, adoSettings, adoLinkEnabled])

  const handleAnalyze = useCallback(
    async (bugId: number, projectId: string) => {
      await startSession(bugId, projectId)
      setViewMode('sessions')
    },
    [startSession]
  )

  const handleSimilarityBugClick = useCallback(
    (bugId: number) => {
      const bug = bugs.find((item) => item.id === bugId)
      if (bug) {
        openDrawer(bug)
      }
    },
    [bugs, openDrawer]
  )

  // No bugs loaded at all
  if (!loading && bugs.length === 0) {
    return (
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
          <h3 className="text-lg font-medium text-gray-600">Nessun bug caricato</h3>
          <p className="text-sm text-gray-400 mt-1">
            Usa il pulsante &quot;Fetch Bugs&quot; per caricare i bug da Azure DevOps
          </p>
        </div>
      </div>
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
              Lista Completa
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
              Similarità (Beta)
            </button>
            <button
              onClick={() => setTab('sessions')}
              className={cn(
                'whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm',
                viewMode === 'sessions'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Bot className="w-4 h-4 mr-2 inline" />
              Sessioni
              {agentSession?.status === 'running' && (
                <span className="ml-1.5 inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </button>
          </nav>
        </div>

        {viewMode !== 'similarity' && <KpiCards kpis={kpis} />}

        {viewMode !== 'similarity' && (
          <FilterBar
            filterState={filterState}
            onFilterChange={setFilterState}
            filterOptions={filterOptions}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            onReset={handleReset}
            onCollapseAll={handleCollapseAll}
            allCollapsed={allCollapsed}
            searchText={searchText}
            onSearchChange={setSearchText}
          />
        )}

        {/* Bug list */}
        {viewMode === 'sessions' ? (
          <SessionsPanel session={agentSession} onAbort={abortSession} />
        ) : viewMode === 'similarity' ? (
          <DashboardSimilaritySection
            key={`${sessionInfo.fetchedAt ?? 'none'}-${sessionInfo.categorizedAt ?? 'none'}`}
            bugs={bugs}
            onBugClick={handleSimilarityBugClick}
          />
        ) : filteredBugs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-sm text-gray-500">Nessun bug corrisponde ai filtri</p>
            <button
              onClick={handleReset}
              className="text-sm text-indigo-600 hover:text-indigo-800 mt-2"
            >
              Reset Filtri
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
        onAnalyze={handleAnalyze}
        projects={projects}
        isAnalyzing={agentSession?.status === 'running'}
      />

      <ConfirmDialog
        open={categorizeError !== null}
        title="Errore categorizzazione"
        description={categorizeError ?? ''}
        confirmLabel="Chiudi"
        onConfirm={clearCategorizeError}
        onCancel={clearCategorizeError}
      />
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
  const { results, loading, analyzing, progress, canAnalyze, isStale, error, analyze } =
    useAiCluster()

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
        <h3 className="text-base font-medium text-gray-600">Categorizzazione richiesta</h3>
        <p className="text-sm text-gray-400 mt-1 max-w-xl px-4">
          Esegui prima la categorizzazione dalla Dashboard per abilitare l&apos;analisi di
          similarità.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Similarità</h2>
            <p className="text-sm text-gray-500 mt-1">
              Trova bug potenzialmente duplicati o correlati all&apos;interno della stessa
              macro-categoria.
            </p>
          </div>

          <div className="flex items-center gap-4">
            {results && !analyzing && (
              <p className="text-xs text-gray-400">
                Ultima analisi: {new Date(results.analyzedAt).toLocaleString('it-IT')}
              </p>
            )}

            <button
              onClick={analyze}
              disabled={analyzing}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:from-indigo-700 hover:to-purple-700 shadow-sm transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {analyzing ? 'Analisi in corso...' : 'Analizza Similarità'}
            </button>
          </div>
        </div>

        {isStale && !analyzing && (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              I risultati potrebbero essere obsoleti: la categorizzazione è stata aggiornata dopo
              l&apos;ultima analisi.
            </span>
          </div>
        )}

        {error && !analyzing && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {analyzing && progress && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Analisi gruppo: {progress.currentGroup}</span>
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
                gruppi trovati
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
                bug coinvolti
              </span>
              <span>·</span>
              <span>{results.categories.length} categorie analizzate</span>
            </div>

            <div className="space-y-4">
              {results.categories.map((category) => (
                <CategorySection
                  key={category.macroCategory}
                  category={category.macroCategory}
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
            <h3 className="text-base font-medium text-gray-600">Nessuna analisi eseguita</h3>
            <p className="text-sm text-gray-400 mt-1 max-w-xl px-4">
              Avvia l&apos;analisi per trovare bug simili che possono essere lavorati insieme o che
              potrebbero descrivere lo stesso problema.
            </p>
          </div>
        ) : null}
      </div>
    </>
  )
}
