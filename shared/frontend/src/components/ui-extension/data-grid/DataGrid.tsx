import { useRef, useState } from 'react'
import type { ColumnSizingState } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react'
import type { DataGridProps } from './types'
import { useDataGridCore } from './hooks/useDataGridCore'
import { useColumnSizing } from './hooks/useColumnSizing'
import { DataGridTableView } from './DataGridTableView'
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

  const { table, pagination, handleGlobalFilterChange } = useDataGridCore({
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

  const { isSized } = useColumnSizing({ table, columns, data, containerRef: wrapperRef, mode: columnSizingMode, sizing, onSizeChange: setSizing })

  const rows = table.getRowModel().rows
  const { pageIndex, pageSize } = pagination
  const pageCount = table.getPageCount()

  const handleSearch = (value: string) => {
    setSearchValue(value)
    handleGlobalFilterChange(value)
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-destructive">
        {error.message}
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="flex flex-col gap-3">
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

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div className={cn('rounded-md border overflow-hidden', !isSized && 'invisible')}>
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
          columnSizingMode={columnSizingMode}
          sizing={sizing}
          tableHeight={tableHeight}
        />
      </div>

      {/* ── Pagination ───────────────────────────────────────────────── */}
      {enablePagination && (
        <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className={cn(
                'h-8 rounded border border-input bg-background px-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring'
              )}
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span>
              {totalCount !== undefined
                ? `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, totalCount)} of ${totalCount}`
                : `Page ${pageIndex + 1} of ${Math.max(pageCount, 1)}`}
            </span>
            <button
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.lastPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
