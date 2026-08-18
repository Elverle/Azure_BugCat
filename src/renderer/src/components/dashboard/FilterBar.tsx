import { useState, useEffect, useRef } from 'react'
import { Search, RotateCcw, Minimize2, Maximize2 } from 'lucide-react'
import { MultiSelect } from '@renderer/components/ui/multi-select'
import type { FilterState, GroupBy } from '@renderer/lib/dashboard-utils'
import { cn } from '@renderer/lib/utils'

interface FilterBarProps {
  filterState: FilterState
  onFilterChange: (filters: FilterState) => void
  filterOptions: {
    statuses: string[]
    assignees: string[]
    macroCategories: string[]
    technicalLayers: string[]
  }
  groupBy: GroupBy
  onGroupByChange: (groupBy: GroupBy) => void
  onReset: () => void
  onCollapseAll: () => void
  allCollapsed: boolean
  searchText: string
  onSearchChange: (text: string) => void
}

const DEBOUNCE_MS = 200

export function FilterBar({
  filterState,
  onFilterChange,
  filterOptions,
  groupBy,
  onGroupByChange,
  onReset,
  onCollapseAll,
  allCollapsed,
  searchText,
  onSearchChange
}: FilterBarProps): JSX.Element {
  // While the user types, the draft holds the pending text tagged with the value it
  // was typed over; committing it drops the draft so the box falls back to the prop
  // and an external change (Reset) always wins, with no effect syncing it back.
  const [draft, setDraft] = useState<{ committed: string; text: string } | null>(null)
  const localSearch = draft?.committed === searchText ? draft.text : searchText
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (localSearch === searchText) return

    timerRef.current = setTimeout(() => {
      setDraft(null)
      onSearchChange(localSearch)
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [localSearch, searchText, onSearchChange])

  return (
    <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm mb-4 flex gap-3 items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search titles, descriptions..."
          value={localSearch}
          onChange={(e) => setDraft({ committed: searchText, text: e.target.value })}
          className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded bg-gray-50 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      <MultiSelect
        options={filterOptions.statuses}
        selected={filterState.statuses}
        onChange={(v) => onFilterChange({ ...filterState, statuses: v })}
        placeholder="Stato"
      />

      <MultiSelect
        options={filterOptions.assignees}
        selected={filterState.assignees}
        onChange={(v) => onFilterChange({ ...filterState, assignees: v })}
        placeholder="Assegnatario"
        searchable
      />

      <MultiSelect
        options={filterOptions.macroCategories}
        selected={filterState.macroCategories}
        onChange={(v) => onFilterChange({ ...filterState, macroCategories: v })}
        placeholder="Macro-Categoria"
      />

      <MultiSelect
        options={filterOptions.technicalLayers}
        selected={filterState.technicalLayers}
        onChange={(v) => onFilterChange({ ...filterState, technicalLayers: v })}
        placeholder="Sotto-Categoria"
      />

      <select
        value={groupBy}
        onChange={(e) => onGroupByChange(e.target.value as GroupBy)}
        className="text-sm border border-gray-300 rounded px-3 py-1.5 bg-gray-50"
      >
        <option value="none">Nessuno</option>
        <option value="macroCategory">Per Macro-Categoria</option>
        <option value="technicalLayer">Per Sotto-Categoria</option>
        <option value="assignee">Per Assegnatario</option>
      </select>

      <button
        type="button"
        onClick={onReset}
        className={cn(
          'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border border-gray-300',
          'bg-gray-50 hover:bg-gray-100 text-gray-700 whitespace-nowrap'
        )}
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset
      </button>

      <button
        type="button"
        onClick={onCollapseAll}
        className={cn(
          'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border border-gray-300',
          'bg-gray-50 hover:bg-gray-100 text-gray-700 whitespace-nowrap'
        )}
      >
        {allCollapsed ? (
          <Maximize2 className="w-3.5 h-3.5" />
        ) : (
          <Minimize2 className="w-3.5 h-3.5" />
        )}
        {allCollapsed ? 'Espandi tutti' : 'Chiudi tutti'}
      </button>
    </div>
  )
}
