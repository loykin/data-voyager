import { useRef, useState } from 'react'
import type { ColumnSizingState } from '@tanstack/react-table'
import { Loader2, Search } from 'lucide-react'
import { Input } from '../../ui/input'
import type { DataGridInfinityProps } from './types'
import { useDataGridCore } from './hooks/useDataGridCore'
import { useColumnSizing } from './hooks/useColumnSizing'
import { useInfiniteScroll } from './hooks/useInfiniteScroll'
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
  enableColumnFilters = false,
  visibilityState,
  columnSizingMode = 'auto',
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
    enablePagination: false,
    onTableReady,
    onColumnSizingChange,
    sizing,
    setSizing,
  })

  const { isSized } = useColumnSizing({ columns, data, containerRef, mode: columnSizingMode, sizing, onSizeChange: setSizing })

  const { loadMoreRef } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    rootMargin,
    enabled: !isLoading,
  })

  const rows = table.getRowModel().rows

  const handleSearch = (value: string) => {
    setSearchValue(value)
    handleGlobalFilterChange(value)
  }

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
      {(searchableColumns?.length || leftFilters || rightFilters) && (
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
          <div className="flex items-center gap-2">{rightFilters?.(table)}</div>
        </div>
      )}

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
          sizing={sizing}
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
