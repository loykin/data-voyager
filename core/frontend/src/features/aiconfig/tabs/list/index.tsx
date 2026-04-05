import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button, useSidePanelStore, DataGrid } from '@data-voyager/shared-ui'
import { aiConfigApi } from '@/features/aiconfig'
import type { AIConfig } from '../../api/aiconfig.api'
import { getListColumns } from './columns'
import { AIConfigSheet } from './sheet'

export function AIConfigListTab() {
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

  const columns = useMemo(
    () => getListColumns(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refetch],
  )

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
