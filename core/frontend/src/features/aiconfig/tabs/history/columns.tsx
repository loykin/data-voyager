import { Badge } from '@data-voyager/shared-ui'
import type { DataGridColumnDef } from '@data-voyager/shared-ui'
import type { AIConfigHistory } from '@/features/aiconfig'
import { PROVIDER_LABELS } from '../list/columns'

const ACTION_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  created:   'default',
  updated:   'secondary',
  deleted:   'destructive',
  activated: 'outline',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export const historyColumns: DataGridColumnDef<AIConfigHistory>[] = [
  {
    accessorKey: 'config_name',
    header: 'Name',
    meta: { flex: 2 },
  },
  {
    accessorKey: 'provider',
    header: 'Provider',
    meta: { flex: 1.5 },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {PROVIDER_LABELS[row.original.provider] ?? row.original.provider}
      </span>
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
    accessorKey: 'changed_at',
    header: 'When',
    meta: { flex: 1.5 },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDateTime(row.original.changed_at as unknown as string)}
      </span>
    ),
  },
]
