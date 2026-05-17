import { Badge } from '@data-voyager/shared-ui'
import type { DataGridColumnDef } from '@data-voyager/shared-ui'
import type { DatasourceHistory } from '@/features/datasource'

const ACTION_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  created: 'default',
  updated: 'secondary',
  deleted: 'destructive',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export const historyColumns: DataGridColumnDef<DatasourceHistory>[] = [
  {
    accessorKey: 'datasourceName',
    header: 'Name',
    meta: { flex: 2 },
  },
  {
    accessorKey: 'datasourceType',
    header: 'Type',
    meta: { flex: 1 },
    cell: ({ row }) => (
      <Badge variant="secondary" className="text-xs">{row.original.datasourceType}</Badge>
    ),
  },
  {
    accessorKey: 'action',
    header: 'Action',
    meta: { flex: 1 },
    cell: ({ row }) => (
      <Badge variant={ACTION_VARIANT[row.original.action] ?? 'secondary'} className="text-xs capitalize">
        {row.original.action}
      </Badge>
    ),
  },
  {
    accessorKey: 'changedAt',
    header: 'When',
    meta: { flex: 1.5 },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDateTime(row.original.changedAt)}
      </span>
    ),
  },
]
