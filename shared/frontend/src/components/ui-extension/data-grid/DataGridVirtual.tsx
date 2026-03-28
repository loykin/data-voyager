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
export function DataGridVirtual<T extends object>(props: DataGridVirtualProps<T>) {
  const {
    isLoading,
    error,
    searchableColumns,
    leftFilters,
    rightFilters,
    enableColumnVisibility = false,
    enableColumnResizing = true,
    enableColumnFilters = false,
    onRowClick,
    rowCursor,
    tableHeight = 600,
    emptyMessage,
    bordered,
    estimateRowHeight = 44,
    overscan = 10,
  } = props

  const { wrapperRef, containerRef, table, rows, isSized, searchValue, handleSearch } =
    useDataGridBase({ ...props, tableHeight, enablePagination: false })

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
          bordered={bordered}
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
