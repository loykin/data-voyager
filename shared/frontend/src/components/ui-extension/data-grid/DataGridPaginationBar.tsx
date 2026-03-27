import type { Table } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '../../../lib/utils'

interface DataGridPaginationBarProps<T extends object> {
  table: Table<T>
  pageSizes: number[]
  totalCount?: number
  /**
   * When true renders the bar as a pinned footer inside the border container
   * (border-t, bg-background, horizontal padding).
   * When false renders as a standalone row below the table border.
   */
  pinned?: boolean
}

export function DataGridPaginationBar<T extends object>({
  table,
  pageSizes,
  totalCount,
  pinned = false,
}: DataGridPaginationBarProps<T>) {
  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 text-sm text-muted-foreground',
        pinned
          ? 'shrink-0 border-t bg-background px-4 py-2'
          : 'px-1 py-1'
      )}
    >
      <div className="flex items-center gap-2">
        <span>Rows per page</span>
        <select
          value={pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          className={cn(
            'h-8 rounded border border-input bg-background px-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring'
          )}
        >
          {pageSizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <span>
          {totalCount !== undefined
            ? `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, totalCount)} of ${totalCount}`
            : `Page ${pageIndex + 1} of ${Math.max(pageCount, 1)}`}
        </span>
        <button
          onClick={() => table.firstPage()}
          disabled={!table.getCanPreviousPage()}
          className="p-1 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="p-1 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="p-1 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => table.lastPage()}
          disabled={!table.getCanNextPage()}
          className="p-1 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
