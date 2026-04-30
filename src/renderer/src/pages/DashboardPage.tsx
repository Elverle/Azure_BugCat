import { useState, useMemo, useCallback, useEffect } from 'react'
import { List, Layers, Bug } from 'lucide-react'
import { useDashboard } from '@renderer/hooks/useDashboard'
import { DashboardHeader } from '@renderer/components/dashboard/DashboardHeader'
import { KpiCards } from '@renderer/components/dashboard/KpiCards'
import { FilterBar } from '@renderer/components/dashboard/FilterBar'
import { BugTable } from '@renderer/components/dashboard/BugTable'
import BugCard from '@renderer/components/dashboard/BugCard'
import { GroupAccordion } from '@renderer/components/dashboard/GroupAccordion'
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

export function DashboardPage(): JSX.Element {
  const { bugs, loading, progress, sessionInfo, fetchBugs, categorizeBugs } = useDashboard()

  const [filterState, setFilterState] = useState<FilterState>(EMPTY_FILTER_STATE)
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT_STATE)
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [searchText, setSearchText] = useState('')

  // Computed values
  const filteredBugs = useMemo(
    () => filterBugs(bugs, { ...filterState, searchText }),
    [bugs, filterState, searchText]
  )

  const sortedBugs = useMemo(
    () => sortBugs(filteredBugs, sortState.key, sortState.direction),
    [filteredBugs, sortState]
  )

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
  const setTab = useCallback((mode: 'table' | 'card') => {
    if (mode === 'table') {
      setViewMode('table')
      setGroupBy('none')
    } else {
      setViewMode('card')
      setGroupBy('macroCategory')
    }
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

  // No bugs loaded at all
  if (!loading && bugs.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <DashboardHeader
          onFetch={fetchBugs}
          onCategorize={categorizeBugs}
          loading={loading}
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
    <div className="flex-1 overflow-y-auto p-6">
      <DashboardHeader
        onFetch={fetchBugs}
        onCategorize={categorizeBugs}
        loading={loading}
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
        </nav>
      </div>

      <KpiCards kpis={kpis} />

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

      {/* Bug list */}
      {filteredBugs.length === 0 ? (
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
              <BugTable bugs={groupBugs} sortState={sortState} onSort={handleSort} />
            ) : (
              <div className="p-4 space-y-3">
                {groupBugs.map((bug) => (
                  <BugCard key={bug.id} bug={bug} />
                ))}
              </div>
            )}
          </GroupAccordion>
        ))
      ) : viewMode === 'table' ? (
        <BugTable bugs={sortedBugs} sortState={sortState} onSort={handleSort} />
      ) : (
        <div className="space-y-3">
          {sortedBugs.map((bug) => (
            <BugCard key={bug.id} bug={bug} />
          ))}
        </div>
      )}
    </div>
  )
}
