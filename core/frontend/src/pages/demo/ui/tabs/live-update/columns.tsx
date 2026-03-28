import type { DataGridColumnDef } from '@data-voyager/shared-ui'
import type { Pod } from './data'

const STATUS_STYLE: Record<Pod['status'], string> = {
  Running:           'bg-green-100 text-green-800',
  Pending:           'bg-yellow-100 text-yellow-800',
  Failed:            'bg-red-100 text-red-800',
  CrashLoopBackOff:  'bg-orange-100 text-orange-800',
  Terminating:       'bg-gray-100 text-gray-600',
}

export const columns: DataGridColumnDef<Pod>[] = [
  {
    accessorKey: 'name',
    header: 'Pod Name',
    meta: { flex: 3, filterType: 'text' },
  },
  {
    accessorKey: 'namespace',
    header: 'Namespace',
    meta: { flex: 1.2, filterType: 'select' },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    meta: { flex: 1.2, filterType: 'select' },
    cell: ({ row }) => {
      const s = row.original.status
      return (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s]}`}>
          {s}
        </span>
      )
    },
  },
  {
    accessorKey: 'cpu',
    header: 'CPU (m)',
    meta: { flex: 0.8, align: 'right', filterType: 'number' },
    cell: ({ row }) => `${row.original.cpu}m`,
  },
  {
    accessorKey: 'memory',
    header: 'Memory (Mi)',
    meta: { flex: 1, align: 'right', filterType: 'number' },
    cell: ({ row }) => `${row.original.memory}Mi`,
  },
  {
    accessorKey: 'restarts',
    header: 'Restarts',
    meta: { flex: 0.7, align: 'right', filterType: 'number' },
    cell: ({ row }) => {
      const n = row.original.restarts
      return (
        <span className={n >= 5 ? 'text-orange-600 font-medium' : undefined}>
          {n}
        </span>
      )
    },
  },
  {
    accessorKey: 'node',
    header: 'Node',
    meta: { flex: 1, filterType: 'select' },
  },
  {
    accessorKey: 'age',
    header: 'Age',
    meta: { flex: 0.6, align: 'right' },
  },
  {
    id: '__actions__',
    header: '',
    size: 48,
    enableSorting: false,
    enableResizing: false,
    meta: {
      filterType: false,
      actions: () => [
        { label: 'Describe', onClick: (p) => alert(`describe ${p.name}`) },
        { label: 'Logs',     onClick: (p) => alert(`logs ${p.name}`) },
        { label: 'Delete',   onClick: (p) => alert(`delete ${p.name}`), variant: 'destructive' as const },
      ],
    },
  },
]
