import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataGrid } from '@data-voyager/shared-ui'
import { Button } from '@data-voyager/shared-ui/components/ui/button'
import { Input } from '@data-voyager/shared-ui/components/ui/input'
import { Plus, Search } from 'lucide-react'
import { useDatasources, useDeleteDatasource } from '@/entities/datasource'
import { getColumns } from './columns'

interface Props {
  typeFilter?: string
}

export function DataSourceList({ typeFilter }: Props) {
  const navigate = useNavigate()
  const { data, isLoading, error } = useDatasources(typeFilter)
  const { mutate: deleteDatasource } = useDeleteDatasource()

  const cols = useMemo(
    () => getColumns(
      (id) => navigate(`/datasource/edit?id=${id}`),
      (id) => deleteDatasource(id),
    ),
    [navigate, deleteDatasource],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => navigate('/datasource/create')}>
          <Plus />
          Add Data Source
        </Button>
      </div>

      <DataGrid
        data={data ?? []}
        columns={cols}
        isLoading={isLoading}
        error={error}
        enableSorting
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
        emptyMessage="No data sources yet. Add your first one."
        pageSizes={[10, 25, 50]}
      />
    </div>
  )
}
