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
    enablePagination = true,
    pageSizes = [10, 20, 50, 100],
    totalCount,
  } = props

  const { wrapperRef, containerRef, table, rows, isSized, searchValue, handleSearch } =
    useDataGridBase(props)

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
      <DataGridToolbar
        table={table}
        searchValue={searchValue}
        onSearch={handleSearch}
        searchableColumns={searchableColumns}
        leftFilters={leftFilters}
        rightFilters={rightFilters}
        enableColumnVisibility={enableColumnVisibility}
      />

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
          bordered={bordered}
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
