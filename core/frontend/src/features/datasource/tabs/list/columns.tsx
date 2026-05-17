import type { DataGridColumnDef } from '@data-voyager/shared-ui'
import { Badge } from '@data-voyager/shared-ui'
import type { DatasourceInstance } from '@loykin/datasourcekit'
import { datasourceDescription, datasourceTags } from '@/features/datasource'

export function getColumns(): DataGridColumnDef<DatasourceInstance<Record<string, unknown>>>[] {
  return [
    {
      accessorKey: 'uid',
      header: 'UID',
      meta: { flex: 0.4 },
    },
    {
      accessorKey: 'name',
      header: 'Name',
      meta: { flex: 2 },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      meta: { flex: 1 },
      cell: ({ row }) => <Badge variant="secondary">{row.original.type}</Badge>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      meta: { flex: 1 },
      cell: ({ row }) => (
        <span className="text-muted-foreground">{datasourceDescription(row.original) ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'enabled',
      header: 'Status',
      meta: { flex: 0.8, align: 'center' },
      cell: ({ row }) => (
        <Badge variant={row.original.enabled ? 'default' : 'outline'}>
          {row.original.enabled ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      meta: { flex: 1.5 },
      cell: ({ row }) => (
        <div className="flex gap-1 flex-wrap">
          {datasourceTags(row.original).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
      ),
    },
  ]
}
