import { useSearchParams } from 'react-router-dom'
import { TabbedPageTemplate } from '@data-voyager/shared-ui'
import { DataSourceList } from '@/widgets/datasource-list'

const HISTORY_PLACEHOLDER = (
  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
    <p className="text-sm">Change history coming soon.</p>
  </div>
)

export function DatasourcePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'list'

  return (
    <TabbedPageTemplate
      activeTab={activeTab}
      onTabChange={(id) => setSearchParams({ tab: id })}
      header={
        <div>
          <h1 className="text-xl font-semibold">Data Sources</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your database connections</p>
        </div>
      }
      tabs={[
        {
          id: 'list',
          label: 'Data Sources',
          content: <DataSourceList />,
        },
        {
          id: 'history',
          label: 'History',
          content: HISTORY_PLACEHOLDER,
        },
      ]}
    />
  )
}
