import { useMemo, useRef, useState } from 'react'
import type { ColumnSizingState } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { Input } from '../../ui/input'
import type { DataGridVirtualProps } from './types'
import { useDataGridCore } from './hooks/useDataGridCore'
import { useColumnSizing } from './hooks/useColumnSizing'
import { DataGridTableView } from './DataGridTableView'
import { ColumnVisibilityDropdown } from './ColumnVisibilityDropdown'
import { createCheckboxColumn } from './checkbox-column'
import { cn } from '../../../lib/utils'

/**
 * DataGridVirtual — renders all data at once with @tanstack/react-virtual.
 * Best for large local datasets (1k–100k+ rows).
 * - Only visible rows are painted → constant render time regardless of row count
 * - Combined with auto/flex column sizing for true Grafana-like experience
 */
export function DataGridVirtual<T extends object>({
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
  tableHeight = 600,
  emptyMessage,
  onTableReady,
  onColumnSizingChange,
  estimateRowHeight = 44,
  overscan = 10,
}: DataGridVirtualProps<T>) {
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
    enablePagination: false,
    onTableReady,
    onColumnSizingChange,
    sizing,
    setSizing,
  })

  const { isSized } = useColumnSizing({ columns, data, containerRef: wrapperRef, mode: columnSizingMode, sizing, onSizeChange: setSizing })

  // All filtered+sorted rows (no pagination)
  const rows = table.getRowModel().rows

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
    <div ref={wrapperRef} className="flex flex-col gap-3 w-full min-w-0 overflow-hidden">
      {(searchableColumns?.length || leftFilters || rightFilters || enableColumnVisibility) && (
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {searchableColumns?.length && (
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

      <div className={cn('rounded-md border overflow-hidden min-w-0 flex-1 flex flex-col', !isSized && 'invisible')}>
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
          tableHeight={tableHeight}
          virtual
          estimateRowHeight={estimateRowHeight}
          overscan={overscan}
        />
      </div>

      <div className="text-xs text-muted-foreground text-right">
        {rows.length.toLocaleString()} rows
      </div>
    </div>
  )
}
