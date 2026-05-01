// @vitest-environment jsdom

import { render, screen, fireEvent, within } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import type { CategorizedBug } from '../../src/shared/types'
import type { KpiData, FilterState, SortState } from '../../src/renderer/src/lib/dashboard-utils'
import { KpiCards } from '../../src/renderer/src/components/dashboard/KpiCards'
import { BugTable } from '../../src/renderer/src/components/dashboard/BugTable'
import { FilterBar } from '../../src/renderer/src/components/dashboard/FilterBar'
import { MultiSelect } from '../../src/renderer/src/components/ui/multi-select'

// ============================================
// Test Fixtures
// ============================================

const mockKpis: KpiData = {
  total: 42,
  statusSummary: {
    todo: 6,
    inProgress: 28,
    suspended: 4
  },
  macroCategories: 8,
  topAssignees: [
    { name: 'Marco R.', count: 10 },
    { name: 'Laura K.', count: 7 },
    { name: 'Giovanni P.', count: 5 }
  ]
}

const mockBugs: CategorizedBug[] = [
  {
    id: 1024,
    title: 'OAuth login fails',
    state: 'Active',
    assignee: 'Laura K.',
    areaPath: 'ECommerce\\Frontend\\Auth',
    description: 'MSAL token error',
    priority: 1,
    createdDate: '2026-01-01',
    updatedDate: '2026-01-15',
    tags: ['auth'],
    macroCategory: 'Authentication',
    subCategory: 'OAuth',
    categoryReason: 'OAuth related',
    categorizedAt: '2026-01-15'
  },
  {
    id: 1031,
    title: 'SSO token expires',
    state: 'Resolved',
    assignee: null,
    areaPath: 'ECommerce\\Frontend\\Auth',
    description: 'Session timeout',
    priority: 2,
    createdDate: '2026-01-02',
    updatedDate: '2026-01-16',
    tags: [],
    macroCategory: 'Authentication',
    subCategory: 'SSO',
    categoryReason: 'SSO issue',
    categorizedAt: '2026-01-16'
  }
]

const defaultSortState: SortState = { key: 'priority', direction: 'asc' }

const defaultFilterState: FilterState = {
  statuses: [],
  assignees: [],
  macroCategories: [],
  subCategories: [],
  searchText: ''
}

// ============================================
// KpiCards
// ============================================

describe('KpiCards', () => {
  it('renders total bugs count', () => {
    render(<KpiCards kpis={mockKpis} />)
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Total Bugs')).toBeInTheDocument()
  })

  it('renders the status summary card with the requested states', () => {
    render(<KpiCards kpis={mockKpis} />)
    expect(screen.getByText('Stati')).toBeInTheDocument()
    expect(screen.getByText('Todo')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('Suspended')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('28')).toHaveClass('text-amber-600')
    expect(screen.getByText('4')).toHaveClass('text-sky-700')
  })

  it('renders macro-categories count in purple-600', () => {
    render(<KpiCards kpis={mockKpis} />)
    const macroElement = screen.getByText('8')
    expect(macroElement).toHaveClass('text-purple-600')
  })

  it('shows top assignees', () => {
    render(<KpiCards kpis={mockKpis} />)
    expect(screen.getByText('Marco R.')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Laura K.')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Giovanni P.')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows "Nessun assegnatario" when topAssignees is empty', () => {
    const emptyKpis: KpiData = { ...mockKpis, topAssignees: [] }
    render(<KpiCards kpis={emptyKpis} />)
    expect(screen.getByText('Nessun assegnatario')).toBeInTheDocument()
  })
})

// ============================================
// BugTable
// ============================================

describe('BugTable', () => {
  it('renders all column headers', () => {
    render(<BugTable bugs={mockBugs} sortState={defaultSortState} onSort={vi.fn()} />)
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('Titolo')).toBeInTheDocument()
    expect(screen.getByText('Priorità')).toBeInTheDocument()
    expect(screen.getByText('Stato')).toBeInTheDocument()
    expect(screen.getByText('Assegnatario')).toBeInTheDocument()
    expect(screen.getByText('Area Path')).toBeInTheDocument()
    expect(screen.getByText('Macro-cat')).toBeInTheDocument()
    expect(screen.getByText('Sotto-cat')).toBeInTheDocument()
  })

  it('calls onSort when clicking a column header', () => {
    const onSort = vi.fn()
    render(<BugTable bugs={mockBugs} sortState={defaultSortState} onSort={onSort} />)
    fireEvent.click(screen.getByText('Titolo'))
    expect(onSort).toHaveBeenCalledWith('title')
  })

  it('shows "Unassigned" for null assignee', () => {
    render(<BugTable bugs={mockBugs} sortState={defaultSortState} onSort={vi.fn()} />)
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('renders Active status badge with red classes', () => {
    render(<BugTable bugs={mockBugs} sortState={defaultSortState} onSort={vi.fn()} />)
    const activeBadge = screen.getByText('Active')
    expect(activeBadge).toHaveClass('bg-red-100')
    expect(activeBadge).toHaveClass('text-red-700')
  })

  it('renders correct number of rows', () => {
    render(<BugTable bugs={mockBugs} sortState={defaultSortState} onSort={vi.fn()} />)
    const rows = screen.getAllByRole('row')
    // 1 header row + 2 data rows
    expect(rows).toHaveLength(3)
  })
})

// ============================================
// MultiSelect
// ============================================

describe('MultiSelect', () => {
  const options = ['Active', 'Resolved', 'Closed']

  it('renders placeholder when nothing selected', () => {
    render(<MultiSelect options={options} selected={[]} onChange={vi.fn()} placeholder="Stato" />)
    expect(screen.getByText('Stato')).toBeInTheDocument()
  })

  it('opens dropdown on click', () => {
    render(<MultiSelect options={options} selected={[]} onChange={vi.fn()} placeholder="Stato" />)
    fireEvent.click(screen.getByText('Stato'))
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Resolved')).toBeInTheDocument()
    expect(screen.getByText('Closed')).toBeInTheDocument()
  })

  it('shows options in dropdown', () => {
    render(<MultiSelect options={options} selected={[]} onChange={vi.fn()} placeholder="Stato" />)
    fireEvent.click(screen.getByText('Stato'))
    options.forEach((option) => {
      expect(screen.getByText(option)).toBeInTheDocument()
    })
  })

  it('selects an item when clicked', () => {
    const onChange = vi.fn()
    render(<MultiSelect options={options} selected={[]} onChange={onChange} placeholder="Stato" />)
    fireEvent.click(screen.getByText('Stato'))
    fireEvent.click(screen.getByText('Active'))
    expect(onChange).toHaveBeenCalledWith(['Active'])
  })

  it('deselects an item when clicked again', () => {
    const onChange = vi.fn()
    render(
      <MultiSelect
        options={options}
        selected={['Active']}
        onChange={onChange}
        placeholder="Stato"
      />
    )
    fireEvent.click(screen.getByRole('button'))
    // "Active" appears in both the button text and the dropdown option — click the second one
    const activeElements = screen.getAllByText('Active')
    fireEvent.click(activeElements[activeElements.length - 1])
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('searchable variant filters options', () => {
    render(
      <MultiSelect
        options={options}
        selected={[]}
        onChange={vi.fn()}
        placeholder="Stato"
        searchable
      />
    )
    fireEvent.click(screen.getByText('Stato'))
    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'Res' } })
    expect(screen.getByText('Resolved')).toBeInTheDocument()
    expect(screen.queryByText('Active')).not.toBeInTheDocument()
    expect(screen.queryByText('Closed')).not.toBeInTheDocument()
  })

  it('closes on Escape key', () => {
    render(<MultiSelect options={options} selected={[]} onChange={vi.fn()} placeholder="Stato" />)
    fireEvent.click(screen.getByText('Stato'))
    expect(screen.getByText('Active')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Active')).not.toBeInTheDocument()
  })
})

// ============================================
// FilterBar
// ============================================

describe('FilterBar', () => {
  const filterOptions = {
    statuses: ['Active', 'Resolved'],
    assignees: ['Laura K.', 'Marco R.'],
    macroCategories: ['Authentication', 'UI'],
    subCategories: ['OAuth', 'SSO']
  }

  function renderFilterBar(overrides = {}): ReturnType<typeof render> {
    const defaultProps = {
      filterState: defaultFilterState,
      onFilterChange: vi.fn(),
      filterOptions,
      groupBy: 'none' as const,
      onGroupByChange: vi.fn(),
      onReset: vi.fn(),
      onCollapseAll: vi.fn(),
      allCollapsed: false,
      searchText: '',
      onSearchChange: vi.fn()
    }
    return render(<FilterBar {...defaultProps} {...overrides} />)
  }

  it('renders search input', () => {
    renderFilterBar()
    expect(screen.getByPlaceholderText('Search titles, descriptions...')).toBeInTheDocument()
  })

  it('renders all multi-selects', () => {
    renderFilterBar()
    expect(screen.getByText('Stato')).toBeInTheDocument()
    expect(screen.getByText('Assegnatario')).toBeInTheDocument()
    expect(screen.getByText('Macro-Categoria')).toBeInTheDocument()
    expect(screen.getByText('Sotto-Categoria')).toBeInTheDocument()
  })

  it('renders groupBy select', () => {
    renderFilterBar()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByText('Nessuno')).toBeInTheDocument()
    expect(screen.getByText('Per Macro-Categoria')).toBeInTheDocument()
  })

  it('Reset button calls onReset', () => {
    const onReset = vi.fn()
    renderFilterBar({ onReset })
    fireEvent.click(screen.getByText('Reset'))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('Collapse all button calls onCollapseAll', () => {
    const onCollapseAll = vi.fn()
    renderFilterBar({ onCollapseAll })
    fireEvent.click(screen.getByText('Chiudi tutti'))
    expect(onCollapseAll).toHaveBeenCalledOnce()
  })
})
