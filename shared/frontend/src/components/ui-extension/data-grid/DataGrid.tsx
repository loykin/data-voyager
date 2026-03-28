import { useMemo, useRef, useState } from 'react'
import type { ColumnSizingState } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import type { DataGridProps } from './types'
import { Input } from '../../ui/input'
import { useDataGridCore } from './hooks/useDataGridCore'
import { useColumnSizing } from './hooks/useColumnSizing'
import { DataGridTableView } from './DataGridTableView'
import { DataGridPaginationBar } from './DataGridPaginationBar'
import { ColumnVisibilityDropdown } from './ColumnVisibilityDropdown'
import { createCheckboxColumn } from './checkbox-column'
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
  enableColumnVisibility = false,
  enableColumnFilters = false,
  visibilityState,
  initialPinning,
  columnSizingMode = 'auto',
  checkboxConfig,
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
  const [searchValue, setSearchValue] = useState(globalFilter ?? '')
  const [sizing, setSizing] = useState<ColumnSizingState>({})

  const columnsWithCheckbox = useMemo(() => {
    if (!checkboxConfig) return columns
    return [createCheckboxColumn(checkboxConfig), ...columns]
  }, [columns, checkboxConfig])

  const { table, handleGlobalFilterChange } = useDataGridCore({
      data,
      columns: columnsWithCheckbox,
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
      initialPinning,
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
    <div ref={wrapperRef} className="flex flex-col gap-3 w-full min-w-0 overflow-hidden">
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      {(searchableColumns?.length || leftFilters || rightFilters || enableColumnVisibility) && (
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {(searchableColumns?.length || !leftFilters) && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search…"
                  value={searchValue}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-60 pl-8"
                />
              </div>
            )}
            {leftFilters?.(table)}
          </div>
          <div className="flex items-center gap-2">
            {rightFilters?.(table)}
            {enableColumnVisibility && <ColumnVisibilityDropdown table={table} />}
          </div>
        </div>
      )}

      {/* ── Table + (pinned pagination when fixed height) ────────────── */}
      <div
        className={cn(
          'rounded-md border overflow-hidden min-w-0 flex-1 flex flex-col',
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
