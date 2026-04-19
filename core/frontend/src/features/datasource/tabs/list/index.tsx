import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataGrid, DataGridPaginationBar, useSidePanelStore } from '@data-voyager/shared-ui'
import { Button } from '@data-voyager/shared-ui/components/ui/button'
import { Input } from '@data-voyager/shared-ui/components/ui/input'
import { Plus, Search } from 'lucide-react'
import { useDatasources } from '@/features/datasource'
import type { Connection } from '../../api/datasource.api'
import { getColumns } from './columns'
import { DatasourceSheet } from './sheet'

export function DatasourceListTab() {
  const navigate = useNavigate()
  const { open } = useSidePanelStore()
  const { data, isLoading, error, refetch } = useDatasources()

  const cols = useMemo(() => getColumns(), [])

  function openSheet(conn: Connection) {
    open(
      <DatasourceSheet id={conn.id} onChanged={() => { void refetch() }} />,
      560,
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => navigate('/datasource/create')}>
          <Plus />
          Add Datasource
        </Button>
      </div>
      <DataGrid
        data={data ?? []}
        columns={cols}
        isLoading={isLoading}
        error={error}
        bordered={true}
        enableSorting
        onRowClick={openSheet}
        rowCursor={true}
        searchableColumns={['name', 'type', 'description']}
        leftFilters={(table) => (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search…"
              value={(table.getState().globalFilter as string) ?? ''}
              onChange={(e) => table.setGlobalFilter(e.target.value)}
              className="w-60 pl-8 focus-visible:ring-0"
            />
          </div>
        )}
        emptyMessage="No datasources yet. Add your first one."
        pagination={{ pageSize: 10 }}
        footer={(table) => <DataGridPaginationBar table={table} pageSizes={[10, 25, 50]} />}
      />
    </div>
  )
}
