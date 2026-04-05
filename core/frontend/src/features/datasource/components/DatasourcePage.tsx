import { useSearchParams } from 'react-router-dom'
import { TabbedPageTemplate } from '@data-voyager/shared-ui'
import { DatasourceListTab } from '../tabs/list'
import { ConnectionHistoryTab } from '../tabs/history'

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
        { id: 'list',    label: 'Datasources', content: <DatasourceListTab /> },
        { id: 'history', label: 'History',     content: <ConnectionHistoryTab /> },
      ]}
    />
  )
}
