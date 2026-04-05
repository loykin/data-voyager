import type { DataGridColumnDef } from '@data-voyager/shared-ui'
import { Badge } from '@data-voyager/shared-ui'
import type { Connection } from '../../api/datasource.api'

export function getColumns(): DataGridColumnDef<Connection>[] {
  return [
    {
      accessorKey: 'id',
      header: 'ID',
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
        <span className="text-muted-foreground">{row.original.description ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      meta: { flex: 0.8, align: 'center' },
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'default' : 'outline'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      meta: { flex: 1.5 },
      cell: ({ row }) => (
        <div className="flex gap-1 flex-wrap">
          {row.original.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
          ))}
        </div>
      ),
    },
  ]
}
