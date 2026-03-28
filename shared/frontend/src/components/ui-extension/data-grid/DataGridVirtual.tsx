import type { DataGridVirtualProps } from './types'
import { useDataGridBase } from './hooks/useDataGridBase'
import { DataGridToolbar } from './DataGridToolbar'
import { DataGridTableView } from './DataGridTableView'
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
  const { wrapperRef, containerRef, table, rows, isSized, searchValue, handleSearch } =
    useDataGridBase({
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
      enableColumnVisibility,
      enableColumnFilters,
      visibilityState,
      initialPinning,
      columnSizingMode,
      checkboxConfig,
      onRowClick,
      rowCursor,
      tableKey,
      persistState,
      enablePagination: false,
      tableHeight,
      emptyMessage,
      onTableReady,
      onColumnSizingChange,
    })

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-destructive">
        {error.message}
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="flex flex-col gap-3 w-full min-w-0 overflow-hidden">
      <DataGridToolbar
        table={table}
        searchValue={searchValue}
        onSearch={handleSearch}
        searchableColumns={searchableColumns}
        leftFilters={leftFilters}
        rightFilters={rightFilters}
        enableColumnVisibility={enableColumnVisibility}
      />

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
