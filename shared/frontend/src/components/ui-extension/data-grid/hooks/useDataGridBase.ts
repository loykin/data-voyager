import { useMemo, useRef, useState } from 'react'
import type { ColumnSizingState } from '@tanstack/react-table'
import type { DataGridBaseProps, DataGridColumnDef } from '../types'
import { createCheckboxColumn } from '../checkbox-column'
import { useDataGridCore } from './useDataGridCore'
import { useColumnSizing } from './useColumnSizing'

interface UseDataGridBaseOptions<T extends object> extends DataGridBaseProps<T> {
  columns: DataGridColumnDef<T>[]
  // Pagination options (for DataGrid; Virtual/Infinity pass enablePagination: false)
  enablePagination?: boolean
  paginationConfig?: { pageSize?: number; initialPageIndex?: number }
  totalCount?: number
  onPageChange?: (pageIndex: number, pageSize: number) => void
}

export function useDataGridBase<T extends object>(options: UseDataGridBaseOptions<T>) {
  const {
    data = [],
    columns,
    enableSorting = true,
    initialSorting,
    onSortingChange,
    manualSorting,
    columnFilters,
    globalFilter,
    onGlobalFilterChange,
    searchableColumns,
    enableColumnResizing = true,
    enableColumnFilters = false,
    visibilityState,
    initialPinning,
    columnSizingMode = 'auto',
    checkboxConfig,
    tableKey,
    persistState,
    enablePagination = true,
    paginationConfig,
    totalCount,
    onPageChange,
    onTableReady,
    onColumnSizingChange,
  } = options

  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [searchValue, setSearchValue] = useState(globalFilter ?? '')
  const [sizing, setSizing] = useState<ColumnSizingState>({})

  const columnsWithCheckbox = useMemo(() => {
    if (!checkboxConfig) return columns
    return [createCheckboxColumn(checkboxConfig), ...columns]
  }, [columns, checkboxConfig])

  const { table, handleGlobalFilterChange } = useDataGridCore({
    data,
    columns: columnsWithCheckbox,
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
    initialPinning,
    tableKey,
    persistState,
    enablePagination,
    paginationConfig,
    totalCount,
    onPageChange,
    onTableReady,
    onColumnSizingChange,
    sizing,
    setSizing,
  })

  const { isSized } = useColumnSizing({
    columns,
    data,
    containerRef,
    mode: columnSizingMode,
    sizing,
    onSizeChange: setSizing,
  })

  const rows = table.getRowModel().rows

  const handleSearch = (value: string) => {
    setSearchValue(value)
    handleGlobalFilterChange(value)
  }

  return { wrapperRef, containerRef, table, rows, isSized, searchValue, handleSearch }
}
