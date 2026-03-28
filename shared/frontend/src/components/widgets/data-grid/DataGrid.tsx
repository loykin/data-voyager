import type { DataGridProps } from './types'
import { useDataGridBase } from './hooks/useDataGridBase'
import { DataGridToolbar } from './DataGridToolbar'
import { DataGridTableView } from './DataGridTableView'
import { DataGridPaginationBar } from './DataGridPaginationBar'
import { cn } from '../../../lib/utils'

export function DataGrid<T extends object>(props: DataGridProps<T>) {
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
    tableHeight,
    emptyMessage,
    bordered,
    estimateRowHeight,
    overscan,
    enablePagination = true,
    pageSizes = [10, 20, 50, 100],
    totalCount,
  } = props

  const { wrapperRef, containerRef, table, rows, isSized, searchValue, handleSearch, measure } =
    useDataGridBase(props)

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

      <div
        className={cn(
          'rounded-md border overflow-hidden min-w-0',
          !isSized && 'invisible'
        )}
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
          tableHeight={tableHeight}
          bordered={bordered}
          estimateRowHeight={estimateRowHeight}
          overscan={overscan}
          onMeasureColumns={measure}
        />
      </div>

      {enablePagination && (
        <DataGridPaginationBar
          table={table}
          pageSizes={pageSizes}
          totalCount={totalCount}
        />
      )}
    </div>
  )
}
