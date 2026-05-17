import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataGrid, DataGridPaginationBar } from '@data-voyager/shared-ui'
import { listDatasourceHistory } from '@/features/datasource'
import { historyColumns } from './columns'

export function DatasourceHistoryTab() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['datasource-history'],
    queryFn: () => listDatasourceHistory(100, 0),
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
