import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataGrid, DataGridPaginationBar } from '@data-voyager/shared-ui'
import { datasourceApi } from '@/features/datasource'
import { historyColumns } from './columns'

export function ConnectionHistoryTab() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['connection-history'],
    queryFn: () => datasourceApi.listHistory(100, 0),
  })

  const cols = useMemo(() => historyColumns, [])

  return (
    <DataGrid
      data={data}
      columns={cols}
      isLoading={isLoading}
      error={error}
      bordered={true}
      enableSorting
      emptyMessage="No history recorded. Enable a statistics store to start tracking changes."
      pagination={{ pageSize: 25 }}
      footer={(table) => <DataGridPaginationBar table={table} pageSizes={[25, 50, 100]} />}
    />
  )
}
