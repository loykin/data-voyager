import type { Table } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Button } from '../../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select'

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

  const pageSizeItems = pageSizes.map((size) => ({ label: String(size), value: size }))

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 text-sm text-muted-foreground',
        pinned ? 'shrink-0 border-t bg-background px-4 py-2' : 'px-1 py-1'
      )}
    >
      <div className="flex items-center gap-2">
        <span>Rows per page</span>
        <Select
          items={pageSizeItems}
          value={pageSize}
          onValueChange={(val) => table.setPageSize(val as number)}
        >
          <SelectTrigger size="sm" className="w-16">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1">
        <span>
          {totalCount !== undefined
            ? `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, totalCount)} of ${totalCount}`
            : `Page ${pageIndex + 1} of ${Math.max(pageCount, 1)}`}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => table.firstPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronsLeft />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <ChevronRight />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => table.lastPage()}
          disabled={!table.getCanNextPage()}
        >
          <ChevronsRight />
        </Button>
      </div>
    </div>
  )
}
