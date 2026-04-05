import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button, useSidePanelStore, TabbedPageTemplate, DataGrid } from '@data-voyager/shared-ui'
import { aiConfigApi } from '../api/aiconfig.api'
import type { AIConfig } from '../api/aiconfig.api'
import { AIConfigSheet } from './AIConfigSheet'
import { getListColumns, historyColumns } from './columns'

function AIConfigListTab() {
  const { open } = useSidePanelStore()
  const navigate = useNavigate()

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['ai-configs'],
    queryFn: () => aiConfigApi.list(),
  })

  function openSheet(cfg: AIConfig) {
    open(
      <AIConfigSheet id={cfg.id} onChanged={() => { void refetch() }} />,
      560,
    )
  }

  const columns = useMemo(() => getListColumns(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refetch])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => navigate('/settings/ai/edit')}>
          <Plus className="h-4 w-4" />
          Add Config
        </Button>
      </div>
      <DataGrid
        data={data}
        columns={columns}
        isLoading={isLoading}
        error={error}
        bordered={true}
        enableSorting
        onRowClick={openSheet}
        rowCursor={true}
        emptyMessage="No AI configs yet. Click Add Config to create one."
        pageSizes={[10, 25, 50]}
      />
    </div>
  )
}

function AIConfigHistoryTab() {
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
