import React, { useMemo } from 'react'
import {
  flexRender,
  type Row,
  type Table,
  type Column,
  type HeaderGroup,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, SlidersHorizontal, X } from 'lucide-react'
import type { Virtualizer } from '@tanstack/react-virtual'
import { cn } from '../../../lib/utils'
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../ui/table'
import { Input } from '../../ui/input'
import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'
import { ScrollTable } from './ScrollTable'
import type { TableViewConfig } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface DataGridTableViewProps<T extends object> extends TableViewConfig<T> {
  table: Table<T>
  rows: Row<T>[]
  containerRef: React.RefObject<HTMLDivElement | null>
  virtual?: boolean
  estimateRowHeight?: number
  overscan?: number
  loadMoreRef?: React.RefObject<HTMLDivElement | null>
  isFetchingNextPage?: boolean
  /**
   * When true the scroll container fills 100% of its parent height.
   * Parent must have an explicit height (flex-col layout).
   */
  fillHeight?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function colStyle<T extends object>(col: Column<T>): React.CSSProperties {
  const pinned = col.getIsPinned()
  return {
    width: col.getSize(),
    flexShrink: 0,
    ...(pinned === 'left' && {
      position: 'sticky',
      left: col.getStart('left'),
      zIndex: 1,
    }),
    ...(pinned === 'right' && {
      position: 'sticky',
      right: col.getAfter('right'),
      zIndex: 1,
    }),
  }
}

function isPinnedEdge<T extends object>(col: Column<T>, table: Table<T>): 'left-edge' | 'right-edge' | false {
  const pinned = col.getIsPinned()
  if (pinned === 'left') {
    const leftCols = table.getLeftLeafColumns()
    return leftCols[leftCols.length - 1]?.id === col.id ? 'left-edge' : false
  }
  if (pinned === 'right') {
    const rightCols = table.getRightLeafColumns()
    return rightCols[0]?.id === col.id ? 'right-edge' : false
  }
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// DataGridHeaderRow
// ─────────────────────────────────────────────────────────────────────────────

interface DataGridHeaderRowProps<T extends object>
  extends Pick<TableViewConfig<T>, 'enableColumnResizing' | 'bordered'> {
  headerGroup: HeaderGroup<T>
  table: Table<T>
  virtual: boolean
}

function DataGridHeaderRow<T extends object>({
  headerGroup,
  table,
  enableColumnResizing,
  virtual,
  bordered,
}: DataGridHeaderRowProps<T>) {
  return (
    <TableRow
      className="hover:bg-transparent"
      style={{ display: 'flex', width: '100%' }}
    >
      {headerGroup.headers.map((header) => {
        const edge = isPinnedEdge(header.column, table)
        return (
        <TableHead
          key={header.id}
          colSpan={header.colSpan}
          className={cn(
            'relative px-3 py-2 text-xs font-medium h-auto bg-background',
            'text-muted-foreground whitespace-normal',
            'select-none group',
            header.column.getCanSort() && 'cursor-pointer',
            bordered && 'border-r border-border',
            edge === 'left-edge' && 'shadow-[1px_0_0_0_hsl(var(--border))]',
            edge === 'right-edge' && 'shadow-[-1px_0_0_0_hsl(var(--border))]',
          )}
          style={
            virtual
              ? { display: 'flex', alignItems: 'center', width: header.getSize() }
              : { ...colStyle(header.column), display: 'flex', alignItems: 'center', overflow: 'hidden' }
          }
          onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
        >
          <span className="flex items-center gap-1 min-w-0 overflow-hidden">
            <span className="truncate">
              {header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, header.getContext())}
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

          {enableColumnResizing && header.column.getCanResize() && (
            // Outer: full-height transparent hit area
            // Inner: thin line with vertical inset for refined look
            <div
              onMouseDown={(e) => { e.stopPropagation(); header.getResizeHandler()(e) }}
              onTouchStart={(e) => { e.stopPropagation(); header.getResizeHandler()(e) }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 h-full w-3 cursor-col-resize select-none touch-none"
            >
              <div className={cn(
                'absolute right-1.5 top-2 bottom-2 w-px rounded-full transition-colors',
                'opacity-0 group-hover:opacity-100',
                header.column.getIsResizing()
                  ? 'opacity-100 bg-primary'
                  : 'bg-border hover:bg-primary',
              )} />
            </div>
          )}
        </TableHead>
        )
      })}
      {/* Spacer: absorbs remaining width so columns don't shift on resize */}
      {!virtual && <TableHead style={{ flex: 1, minWidth: 0, padding: 0 }} className="bg-background" />}
    </TableRow>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// NumberFilterPopover
// ─────────────────────────────────────────────────────────────────────────────

function NumberFilterPopover<T extends object>({ col }: { col: Column<T> }) {
  const numFilter = col.getFilterValue() as [string, string] | undefined
  const min = numFilter?.[0] ?? ''
  const max = numFilter?.[1] ?? ''
  const hasFilter = min !== '' || max !== ''

  const label = hasFilter
    ? [min && `≥${min}`, max && `≤${max}`].filter(Boolean).join(' ')
    : 'Filter…'

  return (
    <Popover>
      <PopoverTrigger render={(props) => (
        <Button
          {...props}
          variant={hasFilter ? 'outline' : 'ghost'}
          size="sm"
          className="h-7 w-full justify-start text-xs font-normal"
        >
          <SlidersHorizontal className="h-3 w-3 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      )} />
      <PopoverContent side="bottom" align="start" className="w-48">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Min</span>
            <Input
              type="number"
              placeholder="Min"
              value={min}
              onChange={(e) =>
                col.setFilterValue((old: [string, string] = ['', '']) => [e.target.value, old[1]])
              }
              className="h-7 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Max</span>
            <Input
              type="number"
              placeholder="Max"
              value={max}
              onChange={(e) =>
                col.setFilterValue((old: [string, string] = ['', '']) => [old[0], e.target.value])
              }
              className="h-7 text-xs"
            />
          </div>
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => col.setFilterValue(undefined)}
            >
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DataGridFilterRow
// ─────────────────────────────────────────────────────────────────────────────

interface DataGridFilterRowProps<T extends object>
  extends Pick<TableViewConfig<T>, 'bordered'> {
  visibleLeafColumns: Column<T>[]
  selectOptions: Record<string, string[]>
  virtual: boolean
}

function DataGridFilterRow<T extends object>({
  visibleLeafColumns,
  selectOptions,
  virtual,
  bordered,
}: DataGridFilterRowProps<T>) {
  return (
    <TableRow
      className="border-b bg-muted/50 hover:bg-muted/50"
      style={{ display: 'flex', width: '100%' }}
    >
      {visibleLeafColumns.map((col) => {
        const ft = col.columnDef.meta?.filterType
        const filterValue = (col.getFilterValue() ?? '') as string
        const thStyle: React.CSSProperties = virtual
          ? { display: 'flex', alignItems: 'center', width: col.getSize() }
          : { ...colStyle(col), display: 'flex', alignItems: 'center' }

        // Base UI Select requires `items` on root so SelectValue can display
        // the selected label even when the popup is closed.
        const selectItems = ft === 'select'
          ? [{ label: 'All', value: null }, ...(selectOptions[col.id] ?? []).map((v) => ({ label: v, value: v }))]
          : []

        if (ft === false) {
          return <TableHead key={col.id} className={cn('px-2 py-1 h-auto', bordered && 'border-r border-border')} style={thStyle} />
        }

        return (
          <TableHead key={col.id} className={cn('px-2 py-1 h-auto font-normal', bordered && 'border-r border-border')} style={thStyle}>
            {ft === 'select' ? (
              <Select
                items={selectItems}
                value={filterValue || null}
                onValueChange={(val) => col.setFilterValue(val ?? undefined)}
              >
                <SelectTrigger size="sm" className="h-7 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectItems.map((item) => (
                    <SelectItem key={item.value ?? '__all__'} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : ft === 'number' ? (
              <NumberFilterPopover col={col} />
            ) : (
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Filter…"
                  value={filterValue}
                  onChange={(e) => col.setFilterValue(e.target.value || undefined)}
                  className="h-7 text-xs pr-6"
                />
                {filterValue && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => col.setFilterValue(undefined)}
                    className="absolute right-0.5 top-1/2 -translate-y-1/2"
                  >
                    <X />
                  </Button>
                )}
              </div>
            )}
          </TableHead>
        )
      })}
      {/* Spacer */}
      {!virtual && <TableHead style={{ flex: 1, minWidth: 0, padding: 0 }} />}
    </TableRow>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DataGridBodyRow
// ─────────────────────────────────────────────────────────────────────────────

interface DataGridBodyRowProps<T extends object>
  extends Pick<TableViewConfig<T>, 'onRowClick' | 'rowCursor' | 'bordered'> {
  row: Row<T>
  table: Table<T>
  style?: React.CSSProperties
  dataIndex?: number
  measureRef?: (node: Element | null) => void
  showSpacer?: boolean
}

function DataGridBodyRow<T extends object>({
  row,
  table,
  onRowClick,
  rowCursor,
  style,
  dataIndex,
  measureRef,
  showSpacer = false,
  bordered = false,
}: DataGridBodyRowProps<T>) {
  return (
    <TableRow
      data-index={dataIndex}
      ref={measureRef}
      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
      className={cn(
        'flex w-full',
        onRowClick || rowCursor ? 'cursor-pointer' : 'hover:bg-muted/30',
      )}
      style={style}
    >
      {row.getVisibleCells().map((cell) => {
        const edge = isPinnedEdge(cell.column, table)
        return (
          <TableCell
            key={cell.id}
            className={cn(
              'px-3 py-2 overflow-hidden bg-background',
              cell.column.columnDef.meta?.align === 'right' && 'text-right',
              cell.column.columnDef.meta?.align === 'center' && 'text-center',
              bordered && 'border-r border-border',
              edge === 'left-edge' && 'shadow-[1px_0_0_0_hsl(var(--border))]',
              edge === 'right-edge' && 'shadow-[-1px_0_0_0_hsl(var(--border))]',
            )}
            style={colStyle(cell.column)}
          >
            <span className="block truncate">
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </span>
          </TableCell>
        )
      })}
      {/* Spacer: absorbs remaining width so columns don't shift on resize */}
      {showSpacer && <TableCell style={{ flex: 1, minWidth: 0, padding: 0 }} className="bg-background" />}
    </TableRow>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DataGridVirtualBody
// ─────────────────────────────────────────────────────────────────────────────

interface DataGridVirtualBodyProps<T extends object>
  extends Pick<TableViewConfig<T>, 'onRowClick' | 'rowCursor' | 'bordered'> {
  rows: Row<T>[]
  table: Table<T>
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>
}

function DataGridVirtualBody<T extends object>({
  rows,
  table,
  rowVirtualizer,
  onRowClick,
  rowCursor,
  bordered,
}: DataGridVirtualBodyProps<T>) {
  const virtualItems = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()

  return (
    <TableBody style={{ display: 'grid', height: totalSize, position: 'relative' }}>
      {virtualItems.map((virtualRow) => {
        const row = rows[virtualRow.index]!
        return (
          <DataGridBodyRow
            key={row.id}
            row={row}
            table={table}
            onRowClick={onRowClick}
            rowCursor={rowCursor}
            bordered={bordered}
            dataIndex={virtualRow.index}
            measureRef={rowVirtualizer.measureElement}
            style={{ position: 'absolute', width: '100%', transform: `translateY(${virtualRow.start}px)` }}
          />
        )
      })}
    </TableBody>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DataGridFlexBody
// ─────────────────────────────────────────────────────────────────────────────

interface DataGridFlexBodyProps<T extends object>
  extends Pick<TableViewConfig<T>, 'isLoading' | 'emptyMessage' | 'onRowClick' | 'rowCursor' | 'bordered'> {
  rows: Row<T>[]
  table: Table<T>
  visibleLeafColumns: Column<T>[]
}

function DataGridFlexBody<T extends object>({
  rows,
  table,
  visibleLeafColumns,
  isLoading,
  emptyMessage,
  onRowClick,
  rowCursor,
  bordered,
}: DataGridFlexBodyProps<T>) {
  if (isLoading) {
    return (
      <TableBody style={{ display: 'block' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <TableRow key={i} className="flex w-full">
            {visibleLeafColumns.map((col) => (
              <TableCell key={col.id} className={cn('px-3 py-2', bordered && 'border-r border-border')} style={colStyle(col)}>
                <div className="h-4 animate-pulse rounded bg-muted" />
              </TableCell>
            ))}
            <TableCell style={{ flex: 1, minWidth: 0, padding: 0 }} />
          </TableRow>
        ))}
      </TableBody>
    )
  }

  if (rows.length === 0) {
    return (
      <TableBody style={{ display: 'block' }}>
        <TableRow className="flex w-full hover:bg-transparent">
          <TableCell className="flex-1 py-12 text-center text-muted-foreground">
            {emptyMessage}
          </TableCell>
        </TableRow>
      </TableBody>
    )
  }

  return (
    <TableBody style={{ display: 'block' }}>
      {rows.map((row) => (
        <DataGridBodyRow
          key={row.id}
          row={row}
          table={table}
          onRowClick={onRowClick}
          rowCursor={rowCursor}
          bordered={bordered}
          showSpacer
        />
      ))}
    </TableBody>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DataGridTableView (main)
// ─────────────────────────────────────────────────────────────────────────────

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
  tableHeight,
  virtual = false,
  estimateRowHeight = 44,
  overscan = 10,
  loadMoreRef,
  isFetchingNextPage,
  fillHeight = false,
  bordered = false,
}: DataGridTableViewProps<T>) {
  const headerGroups = table.getHeaderGroups()
  const visibleLeafColumns = table.getVisibleLeafColumns()

  const selectOptions = useMemo(() => {
    if (!enableColumnFilters) return {}
    const map: Record<string, string[]> = {}
    for (const col of visibleLeafColumns) {
      if (col.columnDef.meta?.filterType !== 'select') continue
      const vals = new Set<string>()
      table.getCoreRowModel().rows.forEach((row) => {
        const v = row.getValue(col.id)
        if (v != null) vals.add(String(v))
      })
      map[col.id] = Array.from(vals).sort()
    }
    return map
  }, [enableColumnFilters, visibleLeafColumns, table])

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
    width: '100%',
    minWidth: 0,
    flex: 1,
    scrollbarGutter: 'stable',
    // 새 stacking context → sticky 헤더 z-index가 테이블 영역 안에만 적용됨
    isolation: 'isolate',
    ...(virtual
      ? { height: typeof tableHeight === 'number' ? tableHeight : tableHeight && tableHeight !== 'auto' ? tableHeight : 500 }
      : fillHeight
      ? { minHeight: 0 }
      : tableHeight && tableHeight !== 'auto'
      ? { maxHeight: tableHeight }
      : {}),
  }

  return (
    <div ref={containerRef} style={containerStyle}>
      <ScrollTable
        style={
          virtual
            ? { display: 'grid', width: table.getTotalSize() }
            : { display: 'block', width: table.getTotalSize(), minWidth: '100%' }
        }
      >
        <TableHeader
          className="sticky top-0 z-10 bg-background [&_tr]:border-b"
          style={{ display: 'block', transform: 'translateZ(0)', willChange: 'transform' }}
        >
          {headerGroups.map((headerGroup) => (
            <DataGridHeaderRow
              key={headerGroup.id}
              headerGroup={headerGroup}
              table={table}
              enableColumnResizing={enableColumnResizing}
              virtual={virtual}
              bordered={bordered}
            />
          ))}
          {enableColumnFilters && (
            <DataGridFilterRow
              visibleLeafColumns={visibleLeafColumns}
              selectOptions={selectOptions}
              virtual={virtual}
              bordered={bordered}
            />
          )}
        </TableHeader>

        {virtual ? (
          <DataGridVirtualBody
            rows={rows}
            table={table}
            rowVirtualizer={rowVirtualizer}
            onRowClick={onRowClick}
            rowCursor={rowCursor}
            bordered={bordered}
          />
        ) : (
          <DataGridFlexBody
            rows={rows}
            table={table}
            visibleLeafColumns={visibleLeafColumns}
            isLoading={isLoading}
            emptyMessage={emptyMessage}
            onRowClick={onRowClick}
            rowCursor={rowCursor}
            bordered={bordered}
          />
        )}
      </ScrollTable>

      {loadMoreRef && (
        <div ref={loadMoreRef} className="py-2 flex justify-center">
          {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
      )}
    </div>
  )
}
