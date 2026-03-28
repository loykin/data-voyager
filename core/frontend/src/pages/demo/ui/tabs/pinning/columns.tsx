import type { DataGridColumnDef } from '@data-voyager/shared-ui'
import type { Employee } from '../../data'

export const columns: DataGridColumnDef<Employee>[] = [
  { accessorKey: 'id',         header: 'ID',         size: 80,  meta: { pin: 'left' } },
  { accessorKey: 'name',       header: 'Name',        size: 200, meta: { pin: 'left' } },
  { accessorKey: 'department', header: 'Department',  size: 200 },
  { accessorKey: 'role',       header: 'Role',        size: 200 },
  {
    accessorKey: 'salary',
    header: 'Salary',
    size: 150,
    meta: { align: 'right' },
    cell: ({ row }) => `$${row.original.salary.toLocaleString()}`,
  },
  { accessorKey: 'startDate', header: 'Start Date', size: 150 },
  { accessorKey: 'score',     header: 'Score',      size: 120, meta: { align: 'right' } },
  {
    accessorKey: 'status',
    header: 'Status',
    size: 150,
    meta: { pin: 'right' },
    cell: ({ row }) => {
      const s = row.original.status
      const color =
        s === 'Active'     ? 'bg-green-100 text-green-800'
        : s === 'On Leave' ? 'bg-yellow-100 text-yellow-800'
        : 'bg-red-100 text-red-800'
      return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{s}</span>
    },
  },
]
