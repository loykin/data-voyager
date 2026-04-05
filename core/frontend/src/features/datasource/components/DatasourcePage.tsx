import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { TabbedPageTemplate, DataGrid } from '@data-voyager/shared-ui'
import { DatasourceList } from './DatasourceList'
import { datasourceApi } from '../api/datasource.api'
import { historyColumns } from './history-columns'

function ConnectionHistoryTab() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['connection-history'],
    queryFn: () => datasourceApi.listHistory(100, 0),
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

export function DatasourcePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'list'

  return (
    <TabbedPageTemplate
      activeTab={activeTab}
      onTabChange={(id) => setSearchParams({ tab: id })}
      header={
        <div>
          <h1 className="text-xl font-semibold">Datasources</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your database connections</p>
        </div>
      }
      tabs={[
        {
          id: 'list',
          label: 'Datasources',
          content: <DatasourceList />,
        },
        {
          id: 'history',
          label: 'History',
          content: <ConnectionHistoryTab />,
        },
      ]}
    />
  )
}
