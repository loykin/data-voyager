import { Loader2 } from 'lucide-react'
import type { DataGridInfinityProps } from './types'
import { useDataGridBase } from './hooks/useDataGridBase'
import { useInfiniteScroll } from './hooks/useInfiniteScroll'
import { DataGridToolbar } from './DataGridToolbar'
import { DataGridTableView } from './DataGridTableView'
import { cn } from '../../../lib/utils'

export function DataGridInfinity<T extends object>({
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
  tableHeight,
  emptyMessage,
  onTableReady,
  onColumnSizingChange,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '100px',
}: DataGridInfinityProps<T>) {
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

  const { loadMoreRef } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    rootMargin,
    enabled: !isLoading,
  })

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
          loadMoreRef={loadMoreRef}
          isFetchingNextPage={isFetchingNextPage}
        />
      </div>

      {isFetchingNextPage && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
