import type React from 'react'
import type { Table } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { Input } from '../../ui/input'
import { ColumnVisibilityDropdown } from './ColumnVisibilityDropdown'

interface DataGridToolbarProps<T extends object> {
  table: Table<T>
  searchValue: string
  onSearch: (value: string) => void
  searchableColumns?: string[]
  leftFilters?: (table: Table<T>) => React.ReactNode
  rightFilters?: (table: Table<T>) => React.ReactNode
  enableColumnVisibility?: boolean
}

export function DataGridToolbar<T extends object>({
  table,
  searchValue,
  onSearch,
  searchableColumns,
  leftFilters,
  rightFilters,
  enableColumnVisibility,
}: DataGridToolbarProps<T>) {
  if (!(searchableColumns?.length || leftFilters || rightFilters || enableColumnVisibility)) {
    return null
  }

  return (
    <div className="flex items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-2">
        {searchableColumns?.length ? (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search…"
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
              className="w-60 pl-8"
            />
          </div>
        ) : null}
        {leftFilters?.(table)}
      </div>
      <div className="flex items-center gap-2">
        {rightFilters?.(table)}
        {enableColumnVisibility && <ColumnVisibilityDropdown table={table} />}
      </div>
    </div>
  )
}
