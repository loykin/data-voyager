import type React from 'react'
import type {
  ColumnDef,
  ColumnFiltersState,
  ColumnSizingState,
  Row,
  SortingState,
  Table,
  VisibilityState,
} from '@tanstack/react-table'

// Augment TanStack Table ColumnMeta with our custom fields
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    /** CSS flex ratio — remaining container width distributed proportionally */
    flex?: number
    /** Auto-fit to content width via canvas text measurement */
    autoSize?: boolean
    minWidth?: number
    maxWidth?: number
    align?: 'left' | 'center' | 'right'
    /**
     * Column-level filter type (renders filter row under the header).
     * - 'text'   : free-text contains match (default when enableColumnFilters=true)
     * - 'select' : dropdown of unique values from current data
     * - 'number' : numeric range (min / max)
     * - false    : disable filter for this column
     */
    filterType?: 'text' | 'select' | 'number' | false
  }
}

export type DataGridColumnDef<T extends object> = ColumnDef<T, unknown>

export type ColumnSizingMode = 'auto' | 'flex' | 'fixed'

export interface CheckboxConfig<T extends object> {
  getRowId: (row: T) => string
  selectedIds: Set<string>
  onSelectAll: (rows: Row<T>[], checked: boolean) => void
  onSelectOne: (rowId: string, checked: boolean) => void
}

export interface ExportConfig<T extends object> {
  fileName?: string
  mapRow?: (row: T) => Record<string, unknown>
}

export interface DataGridBaseProps<T extends object> {
  data?: T[]
  columns: DataGridColumnDef<T>[]
  isLoading?: boolean
  error?: Error | null

  // Sorting
  enableSorting?: boolean
  initialSorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
  manualSorting?: boolean

  // Filtering
  /** Show per-column filter row below the header (AG Grid style) */
  enableColumnFilters?: boolean
  columnFilters?: ColumnFiltersState
  globalFilter?: string
  onGlobalFilterChange?: (value: string) => void
  searchableColumns?: string[]
  leftFilters?: (table: Table<T>) => React.ReactNode
  rightFilters?: (table: Table<T>) => React.ReactNode

  // Column sizing
  enableColumnResizing?: boolean
  enableColumnVisibility?: boolean
  visibilityState?: VisibilityState
  columnSizingMode?: ColumnSizingMode

  // Selection
  checkboxConfig?: CheckboxConfig<T>

  // Export
  exportConfig?: ExportConfig<T>

  // Rows
  onRowClick?: (row: T) => void
  rowCursor?: boolean

  // State persistence (Zustand)
  tableKey?: string
  persistState?: boolean

  // UI
  tableHeight?: string | number | 'auto'
  emptyMessage?: string

  // Callbacks
  onTableReady?: (table: Table<T>) => void
  onColumnSizingChange?: (sizing: ColumnSizingState) => void
}

export interface DataGridProps<T extends object> extends DataGridBaseProps<T> {
  enablePagination?: boolean
  paginationConfig?: { pageSize?: number; initialPageIndex?: number }
  pageSizes?: number[]
  /** Server-side total row count for manual pagination */
  totalCount?: number
  onPageChange?: (pageIndex: number, pageSize: number) => void
}

export interface DataGridInfinityProps<T extends object>
  extends DataGridBaseProps<T> {
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  fetchNextPage?: () => void
  /** IntersectionObserver rootMargin to trigger next page load */
  rootMargin?: string
}

export interface DataGridVirtualProps<T extends object>
  extends DataGridBaseProps<T> {
  /** Estimated row height in px for virtualizer (default: 44) */
  estimateRowHeight?: number
  /** Rows to render outside visible area (default: 10) */
  overscan?: number
}
