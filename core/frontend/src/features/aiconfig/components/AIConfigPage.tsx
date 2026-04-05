import { useSearchParams } from 'react-router-dom'
import { TabbedPageTemplate } from '@data-voyager/shared-ui'
import { AIConfigListTab } from '../tabs/list'
import { AIConfigHistoryTab } from '../tabs/history'

export function AIConfigPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'list'

  return (
    <TabbedPageTemplate
      tabs={[
        { id: 'list',    label: 'AI Configs', content: <AIConfigListTab /> },
        { id: 'history', label: 'History',    content: <AIConfigHistoryTab /> },
      ]}
      activeTab={activeTab}
      onTabChange={(id) => setSearchParams({ tab: id })}
      header={
        <div>
          <h1 className="text-xl font-semibold">AI Config</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage AI provider configurations for the chat assistant.
          </p>
        </div>
      }
    />
  )
}
