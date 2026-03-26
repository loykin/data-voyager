import React, { useMemo } from 'react'
import { flexRender, type Row, type Table, type Column } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, X } from 'lucide-react'
import type { ColumnSizingState } from '@tanstack/react-table'
import type { ColumnSizingMode } from './types'
import { cn } from '../../../lib/utils'

interface DataGridTableViewProps<T extends object> {
  table: Table<T>
  rows: Row<T>[]
  containerRef: React.RefObject<HTMLDivElement | null>
  isLoading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
  rowCursor?: boolean
  enableColumnResizing?: boolean
  /** Show per-column filter inputs below the header */
  enableColumnFilters?: boolean
  columnSizingMode?: ColumnSizingMode
  /** Current sizing state — to detect which flex cols have been user-resized */
  sizing?: ColumnSizingState
  tableHeight?: string | number | 'auto'
  /** Enable TanStack Virtual for large datasets */
  virtual?: boolean
  estimateRowHeight?: number
  overscan?: number
  /** Sentinel element ref for infinite scroll */
  loadMoreRef?: React.RefObject<HTMLDivElement | null>
  isFetchingNextPage?: boolean
}

const SKELETON_ROW_COUNT = 6

function SkeletonRows({ colCount }: { colCount: number }) {
  return (
    <>
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
        <tr key={i} className="border-b">
          {Array.from({ length: colCount }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 animate-pulse rounded bg-muted" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function DataGridTableView<T extends object>({
  table,
  rows,
  containerRef,
  isLoading,
  emptyMessage = 'No data',
  onRowClick,
  rowCursor,
  enableColumnResizing = true,
  enableColumnFilters = false,
  columnSizingMode = 'fixed',
  sizing = {},
  tableHeight,
  virtual = false,
  estimateRowHeight = 44,
  overscan = 10,
  loadMoreRef,
  isFetchingNextPage,
}: DataGridTableViewProps<T>) {
  const headerGroups = table.getHeaderGroups()
  const visibleLeafColumns = table.getVisibleLeafColumns()
  const visibleColCount = visibleLeafColumns.length

  // flex mode without virtualizer = CSS flex (no JS sizing needed)
  const isCssFlex = !virtual && columnSizingMode === 'flex'

  /**
   * Per-column style: CSS flex for unresized flex-mode columns,
   * explicit pixel width for everything else.
   */
  function cellStyle(col: Column<T>): React.CSSProperties {
    if (virtual) return { width: col.getSize() }
    const meta = col.columnDef.meta
    if (isCssFlex && meta?.flex != null && !sizing[col.id]) {
      // Pure CSS proportional distribution \u2014 no JS required
      return { flex: `${meta.flex} 0 0`, minWidth: meta.minWidth ?? 60 }
    }
    return { width: col.getSize(), flexShrink: 0 }
  }

  // Unique values for 'select' filter type per column
  const selectOptions = useMemo(() => {
    if (!enableColumnFilters) return {}
    const map: Record<string, string[]> = {}
    for (const col of visibleLeafColumns) {
      const ft = col.columnDef.meta?.filterType
      if (ft !== 'select') continue
      const vals = new Set<string>()
      table.getCoreRowModel().rows.forEach((row) => {
        const v = row.getValue(col.id)
        if (v != null) vals.add(String(v))
      })
      map[col.id] = Array.from(vals).sort()
    }
    return map
  }, [enableColumnFilters, visibleLeafColumns, table])

  // Virtual row support via @tanstack/react-virtual
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => estimateRowHeight,
    overscan,
    enabled: virtual,
  })

  const containerStyle: React.CSSProperties = {
    overflow: 'auto',
    position: 'relative',
    ...(virtual
      ? {
          height:
            typeof tableHeight === 'number'
              ? tableHeight
              : tableHeight && tableHeight !== 'auto'
              ? tableHeight
              : 500,
        }
      : tableHeight && tableHeight !== 'auto'
      ? {
          maxHeight:
            typeof tableHeight === 'number' ? tableHeight : tableHeight,
        }
      : {}),
  }

  // ── Virtual body ──────────────────────────────────────────────────────────
  const renderVirtualBody = () => {
    const virtualItems = rowVirtualizer.getVirtualItems()
    const totalSize = rowVirtualizer.getTotalSize()

    return (
      <tbody
        style={{
          display: 'grid',
          height: totalSize,
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const row = rows[virtualRow.index]!
          return (
            <tr
              key={row.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              className={cn(
                'flex absolute w-full border-b transition-colors',
                onRowClick || rowCursor
                  ? 'cursor-pointer hover:bg-muted/50'
                  : 'hover:bg-muted/30'
              )}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm overflow-hidden',
                    cell.column.columnDef.meta?.align === 'right' && 'justify-end',
                    cell.column.columnDef.meta?.align === 'center' && 'justify-center'
                  )}
                  style={{ width: cell.column.getSize() }}
                >
                  <span className="truncate">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </span>
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    )
  }

  // ── Regular body ──────────────────────────────────────────────────────────
  const renderBody = () => (
    <tbody>
      {isLoading ? (
        <SkeletonRows colCount={visibleColCount} />
      ) : rows.length === 0 ? (
        <tr>
          <td
            colSpan={visibleColCount}
            className="py-12 text-center text-sm text-muted-foreground"
          >
            {emptyMessage}
          </td>
        </tr>
      ) : (
        rows.map((row) => (
          <tr
            key={row.id}
            onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            className={cn(
              'border-b transition-colors',
              onRowClick || rowCursor
                ? 'cursor-pointer hover:bg-muted/50'
                : 'hover:bg-muted/30'
            )}
          >
            {row.getVisibleCells().map((cell) => (
              <td
                key={cell.id}
                className={cn(
                  'px-3 py-2 text-sm overflow-hidden',
                  cell.column.columnDef.meta?.align === 'right' && 'text-right',
                  cell.column.columnDef.meta?.align === 'center' && 'text-center'
                )}
                style={{ width: cell.column.getSize() }}
              >
                <span className="block truncate">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </span>
              </td>
            ))}
          </tr>
        ))
      )}
    </tbody>
  )

  // ── Flex body (CSS flex mode) ─────────────────────────────────────────────
  const renderFlexBody = () => (
    <tbody style={{ display: 'block' }}>
      {isLoading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <tr key={i} className="flex w-full border-b">
            {visibleLeafColumns.map((col) => (
              <td key={col.id} className="px-3 py-2" style={cellStyle(col)}>
                <div className="h-4 animate-pulse rounded bg-muted" />
              </td>
            ))}
          </tr>
        ))
      ) : rows.length === 0 ? (
        <tr className="flex w-full">
          <td className="flex-1 py-12 text-center text-sm text-muted-foreground">{emptyMessage}</td>
        </tr>
      ) : (
        rows.map((row) => (
          <tr
            key={row.id}
            onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            className={cn(
              'flex w-full border-b transition-colors',
              onRowClick || rowCursor
                ? 'cursor-pointer hover:bg-muted/50'
                : 'hover:bg-muted/30'
            )}
          >
            {row.getVisibleCells().map((cell) => (
              <td
                key={cell.id}
                className={cn(
                  'px-3 py-2 text-sm overflow-hidden',
                  cell.column.columnDef.meta?.align === 'right' && 'text-right',
                  cell.column.columnDef.meta?.align === 'center' && 'text-center'
                )}
                style={cellStyle(cell.column)}
              >
                <span className="block truncate">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </span>
              </td>
            ))}
          </tr>
        ))
      )}
    </tbody>
  )

  return (
    <div ref={containerRef} style={containerStyle}>
      <table
        style={
          virtual
            ? { display: 'grid', width: table.getTotalSize() }
            : isCssFlex
            ? { display: 'block', width: '100%' }
            : { tableLayout: 'fixed', width: table.getTotalSize() }
        }
        className="w-full text-sm"
      >
        {/* ── Header (+ optional filter row, same sticky thead) ───── */}
        <thead
          className="sticky top-0 z-10 bg-background"
          style={(virtual || isCssFlex) ? { display: 'block' } : undefined}
        >
          {/* Sort / label row */}
          {headerGroups.map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="border-b"
              style={(virtual || isCssFlex) ? { display: 'flex', width: '100%' } : undefined}
            >
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  colSpan={header.colSpan}
                  className={cn(
                    'relative px-3 py-2 text-left text-xs font-medium',
                    'text-muted-foreground',
                    'select-none group',
                    header.column.getCanSort() && 'cursor-pointer'
                  )}
                  style={{
                    ...(virtual
                      ? { display: 'flex', alignItems: 'center', width: header.getSize() }
                      : isCssFlex
                      ? { ...cellStyle(header.column), display: 'flex', alignItems: 'center', overflow: 'hidden' }
                      : { width: header.getSize() }),
                  }}
                  onClick={
                    header.column.getCanSort()
                      ? header.column.getToggleSortingHandler()
                      : undefined
                  }
                >
                  <span className="flex items-center gap-1 min-w-0 overflow-hidden">
                    <span className="truncate">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </span>
                    {header.column.getCanSort() && (
                      <span className="ml-1 shrink-0">
                        {header.column.getIsSorted() === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ArrowDown className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
                        )}
                      </span>
                    )}
                  </span>

                  {/* Column resize handle */}
                  {enableColumnResizing && header.column.getCanResize() && (
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={cn(
                        'absolute right-0 top-0 h-full w-1.5 cursor-col-resize',
                        'select-none touch-none opacity-0 group-hover:opacity-100',
                        'bg-border hover:bg-primary',
                        header.column.getIsResizing() && 'opacity-100 bg-primary'
                      )}
                    />
                  )}
                </th>
              ))}
            </tr>
          ))}

          {/* Filter row — same thead, no gap */}
          {enableColumnFilters && (
            <tr
              className="border-b bg-muted/50"
              style={(virtual || isCssFlex) ? { display: 'flex', width: '100%' } : undefined}
            >
              {visibleLeafColumns.map((col) => {
                const ft = col.columnDef.meta?.filterType
                const filterValue = (col.getFilterValue() ?? '') as string
                const clearFilter = () => col.setFilterValue(undefined)

                const thStyle: React.CSSProperties = virtual
                  ? { display: 'flex', alignItems: 'center', width: col.getSize() }
                  : isCssFlex
                  ? { ...cellStyle(col), display: 'flex', alignItems: 'center' }
                  : { width: col.getSize() }

                if (ft === false) {
                  return <th key={col.id} className="px-2 py-1" style={thStyle} />
                }

                return (
                  <th
                    key={col.id}
                    className="px-2 py-1 font-normal"
                    style={thStyle}
                  >
                    {ft === 'select' ? (
                      <div className="relative">
                        <select
                          value={filterValue}
                          onChange={(e) => col.setFilterValue(e.target.value || undefined)}
                          className={cn(
                            'h-7 w-full rounded border border-input bg-background px-2 text-xs',
                            'focus:outline-none focus:ring-1 focus:ring-ring appearance-none',
                          )}
                        >
                          <option value="">All</option>
                          {(selectOptions[col.id] ?? []).map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                    ) : ft === 'number' ? (
                      <div className="flex gap-1">
                        <input
                          type="number"
                          placeholder="Min"
                          value={(col.getFilterValue() as [string, string] | undefined)?.[0] ?? ''}
                          onChange={(e) =>
                            col.setFilterValue((old: [string, string] = ['', '']) => [e.target.value, old[1]])
                          }
                          className="h-7 w-full rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={(col.getFilterValue() as [string, string] | undefined)?.[1] ?? ''}
                          onChange={(e) =>
                            col.setFilterValue((old: [string, string] = ['', '']) => [old[0], e.target.value])
                          }
                          className="h-7 w-full rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                    ) : (
                      // default: 'text'
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Filter…"
                          value={filterValue}
                          onChange={(e) => col.setFilterValue(e.target.value || undefined)}
                          className="h-7 w-full rounded border border-input bg-background px-2 pr-6 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        {filterValue && (
                          <button
                            onClick={clearFilter}
                            className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </th>
                )
              })}
            </tr>
          )}
        </thead>

        {virtual ? renderVirtualBody() : isCssFlex ? renderFlexBody() : renderBody()}
      </table>

      {/* Infinity scroll sentinel */}
      {loadMoreRef && (
        <div ref={loadMoreRef} className="py-2 flex justify-center">
          {isFetchingNextPage && (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  )
}
