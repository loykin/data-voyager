import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataGrid } from '@data-voyager/shared-ui'
import { aiConfigApi } from '@/features/aiconfig'
import { historyColumns } from './columns'

export function AIConfigHistoryTab() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['aiconfig-history'],
    queryFn: () => aiConfigApi.listHistory(100, 0),
  })

  const columns = useMemo(() => historyColumns, [])

  return (
    <DataGrid
      data={data}
      columns={columns}
      isLoading={isLoading}
      error={error}
      bordered={true}
      enableSorting
      emptyMessage="No history recorded. Enable a statistics store to start tracking changes."
      pageSizes={[25, 50, 100]}
    />
  )
}
