import { useRef, useState } from 'react'
import type { ColumnSizingState } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import type { DataGridProps } from './types'
import { useDataGridCore } from './hooks/useDataGridCore'
import { useColumnSizing } from './hooks/useColumnSizing'
import { DataGridTableView } from './DataGridTableView'
import { DataGridPaginationBar } from './DataGridPaginationBar'
import { cn } from '../../../lib/utils'

export function DataGrid<T extends object>({
  data = [],
  columns,
  isLoading,
  error,
  enableSorting = true,
  initialSorting,
  onSortingChange,
  manualSorting,
  columnFilters,
  globalFilter,
  onGlobalFilterChange,
  searchableColumns,
  leftFilters,
  rightFilters,
  enableColumnResizing = true,
  enableColumnFilters = false,
  visibilityState,
  columnSizingMode = 'auto',
  onRowClick,
  rowCursor,
  tableKey,
  persistState,
  enablePagination = true,
  paginationConfig,
  pageSizes = [10, 20, 50, 100],
  totalCount,
  onPageChange,
  tableHeight,
  emptyMessage,
  onTableReady,
  onColumnSizingChange,
}: DataGridProps<T>) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [searchValue, setSearchValue] = useState('')
  const [sizing, setSizing] = useState<ColumnSizingState>({})

  const { table, handleGlobalFilterChange } = useDataGridCore({
      data,
      columns,
      enableSorting,
      initialSorting,
      onSortingChange,
      manualSorting,
      columnFilters,
      globalFilter,
      onGlobalFilterChange,
      searchableColumns,
      enableColumnResizing,
      enableColumnFilters,
      visibilityState,
      tableKey,
      persistState,
      enablePagination,
      paginationConfig,
      totalCount,
      onPageChange,
      onTableReady,
      onColumnSizingChange,
      sizing,
      setSizing,
    })

  const { isSized } = useColumnSizing({ columns, data, containerRef: wrapperRef, mode: columnSizingMode, sizing, onSizeChange: setSizing })

  const rows = table.getRowModel().rows

  const handleSearch = (value: string) => {
    setSearchValue(value)
    handleGlobalFilterChange(value)
  }

  // When tableHeight is set the border div becomes the fixed-height container:
  // header sticks to top, body scrolls, pagination pins to bottom.
  const hasFixedHeight = tableHeight != null && tableHeight !== 'auto'

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-destructive">
        {error.message}
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="flex flex-col gap-3 min-w-0">
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      {(searchableColumns?.length || leftFilters || rightFilters) && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {(searchableColumns?.length || !leftFilters) && (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search…"
                  value={searchValue}
                  onChange={(e) => handleSearch(e.target.value)}
                  className={cn(
                    'h-9 w-60 rounded-md border border-input bg-background',
                    'pl-8 pr-3 text-sm placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring'
                  )}
                />
              </div>
            )}
            {leftFilters?.(table)}
          </div>
          <div className="flex items-center gap-2">{rightFilters?.(table)}</div>
        </div>
      )}

      {/* ── Table + (pinned pagination when fixed height) ────────────── */}
      <div
        className={cn(
          'rounded-md border overflow-hidden min-w-0',
          hasFixedHeight && 'flex flex-col',
          !isSized && 'invisible'
        )}
        style={hasFixedHeight ? { height: tableHeight } : undefined}
      >
        <DataGridTableView
          table={table}
          rows={rows}
          containerRef={containerRef}
          isLoading={isLoading}
          emptyMessage={emptyMessage}
          onRowClick={onRowClick}
          rowCursor={rowCursor}
          enableColumnResizing={enableColumnResizing}
          enableColumnFilters={enableColumnFilters}
          sizing={sizing}
          tableHeight={hasFixedHeight ? undefined : tableHeight}
          fillHeight={hasFixedHeight}
        />
        {hasFixedHeight && enablePagination && (
          <DataGridPaginationBar
            table={table}
            pageSizes={pageSizes}
            totalCount={totalCount}
            pinned
          />
        )}
      </div>

      {/* Pagination below border when no fixed height */}
      {!hasFixedHeight && enablePagination && (
        <DataGridPaginationBar
          table={table}
          pageSizes={pageSizes}
          totalCount={totalCount}
        />
      )}
    </div>
  )
}
