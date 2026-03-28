import type { DataGridColumnDef } from '@data-voyager/shared-ui'
import type { Employee } from './data'

const statusCell = (row: Employee) => {
  const s = row.status
  const color =
    s === 'Active'     ? 'bg-green-100 text-green-800'
    : s === 'On Leave' ? 'bg-yellow-100 text-yellow-800'
    : 'bg-red-100 text-red-800'
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{s}</span>
}

export const columns: DataGridColumnDef<Employee>[] = [
  { accessorKey: 'id',         header: 'ID',         meta: { flex: 0.5, filterType: 'number' } },
  { accessorKey: 'name',       header: 'Name',       meta: { flex: 2,   filterType: 'text' } },
  { accessorKey: 'department', header: 'Department', meta: { flex: 1.5, filterType: 'select' } },
  { accessorKey: 'role',       header: 'Role',       meta: { flex: 1.5, filterType: 'select' } },
  {
    accessorKey: 'salary',
    header: 'Salary',
    meta: { flex: 1, align: 'right', filterType: 'number' },
    cell: ({ row }) => `$${row.original.salary.toLocaleString()}`,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    meta: { flex: 1, filterType: 'select' },
    cell: ({ row }) => statusCell(row.original),
  },
  { accessorKey: 'startDate', header: 'Start Date', meta: { flex: 1,   filterType: 'text' } },
  { accessorKey: 'score',     header: 'Score',      meta: { flex: 0.8, align: 'right', filterType: 'number' } },
]
