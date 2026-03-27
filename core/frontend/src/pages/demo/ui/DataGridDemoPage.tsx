import { useState } from 'react';
import type { DataGridColumnDef } from '@data-voyager/shared-ui';
import { DataGrid, DataGridInfinity, DataGridVirtual } from '@data-voyager/shared-ui';

// ── Sample data types ──────────────────────────────────────────────────────

interface Employee {
  id: number
  name: string
  department: string
  role: string
  salary: number
  status: 'Active' | 'On Leave' | 'Terminated'
  startDate: string
  score: number
}

const DEPARTMENTS = ['Engineering', 'Design', 'Product', 'Sales', 'HR', 'Finance']
const ROLES = ['Engineer', 'Senior Engineer', 'Lead', 'Manager', 'Director', 'Analyst']
const STATUSES: Employee['status'][] = ['Active', 'On Leave', 'Terminated']

function makeRow(i: number): Employee {
  const dept = DEPARTMENTS[i % DEPARTMENTS.length]!
  return {
    id: i + 1,
    name: `Employee ${i + 1}`,
    department: dept,
    role: ROLES[Math.floor(i / DEPARTMENTS.length) % ROLES.length]!,
    salary: 40000 + ((i * 1337) % 120000),
    status: STATUSES[i % 3]!,
    startDate: `202${i % 5}-${String((i % 12) + 1).padStart(2, '0')}-01`,
    score: Math.round(((i * 17) % 100) * 10) / 10,
  }
}

const ALL_DATA: Employee[] = Array.from({ length: 500 }, (_, i) => makeRow(i))
const SMALL_DATA = ALL_DATA.slice(0, 50)

// ── Column definitions ─────────────────────────────────────────────────────

const columns: DataGridColumnDef<Employee>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    meta: { flex: 0.5, filterType: 'number' },
  },
  {
    accessorKey: 'name',
    header: 'Name',
    meta: { flex: 2, filterType: 'text' },
  },
  {
    accessorKey: 'department',
    header: 'Department',
    meta: { flex: 1.5, filterType: 'select' },
  },
  {
    accessorKey: 'role',
    header: 'Role',
    meta: { flex: 1.5, filterType: 'select' },
  },
  {
    accessorKey: 'salary',
    header: 'Salary',
    meta: { flex: 1, align: 'right', filterType: 'number' },
    cell: ({ getValue }) =>
      `$${(getValue() as number).toLocaleString()}`,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    meta: { flex: 1, filterType: 'select' },
    cell: ({ getValue }) => {
      const s = getValue() as Employee['status']
      const color =
        s === 'Active'
          ? 'bg-green-100 text-green-800'
          : s === 'On Leave'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-red-100 text-red-800'
      return (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
          {s}
        </span>
      )
    },
  },
  {
    accessorKey: 'startDate',
    header: 'Start Date',
    meta: { flex: 1, filterType: 'text' },
  },
  {
    accessorKey: 'score',
    header: 'Score',
    meta: { flex: 0.8, align: 'right', filterType: 'number' },
  },
]

// ── Infinite scroll helpers ────────────────────────────────────────────────

const PAGE = 50

// ── Demo page ─────────────────────────────────────────────────────────────

type Tab = 'pagination' | 'infinity' | 'virtual' | 'fixed'

export function DataGridDemoPage() {
  const [tab, setTab] = useState<Tab>('pagination')

  // Infinite scroll state
  const [infinityData, setInfinityData] = useState(() => ALL_DATA.slice(0, PAGE))
  const [isFetching, setIsFetching] = useState(false)
  const hasNextPage = infinityData.length < ALL_DATA.length

  const fetchNextPage = () => {
    if (isFetching || !hasNextPage) return
    setIsFetching(true)
    setTimeout(() => {
      setInfinityData((prev) => {
        return ALL_DATA.slice(0, prev.length + PAGE)
      })
      setIsFetching(false)
    }, 400)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'pagination', label: 'Pagination' },
    { id: 'infinity', label: 'Infinite Scroll' },
    { id: 'virtual', label: 'Virtual (500 rows)' },
    { id: 'fixed', label: 'Fixed Height' },
  ]

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-xl font-semibold">DataGrid Demo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          TanStack Table · canvas auto-sizing · column filters · 500 sample rows
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Pagination tab ── */}
      {tab === 'pagination' && (
        <section className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            50 rows · enableColumnFilters · text / select / number range filters
          </p>
          <DataGrid
            data={SMALL_DATA}
            columns={columns}
            enableColumnFilters
            enableSorting
            pageSizes={[10, 20, 50]}
            emptyMessage="No employees found"
          />
        </section>
      )}

      {/* ── Infinity tab ── */}
      {tab === 'infinity' && (
        <section className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Loads {PAGE} rows at a time on scroll ({infinityData.length} / {ALL_DATA.length} loaded)
          </p>
          <DataGridInfinity
            data={infinityData}
            columns={columns}
            enableColumnFilters
            enableSorting
            tableHeight={480}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetching}
            fetchNextPage={fetchNextPage}
            emptyMessage="No employees found"
          />
        </section>
      )}

      {/* ── Virtual tab ── */}
      {tab === 'virtual' && (
        <section className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            All 500 rows rendered virtually — constant performance regardless of row count
          </p>
          <DataGridVirtual
            data={ALL_DATA}
            columns={columns}
            enableColumnFilters
            enableSorting
            columnSizingMode="auto"
            tableHeight={520}
            emptyMessage="No employees found"
          />
        </section>
      )}

      {/* ── Fixed Height tab ── */}
      {tab === 'fixed' && (
        <section className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            tableHeight=500 · sticky header · scrollable body · pagination pinned to bottom
          </p>
          <DataGrid
            data={ALL_DATA}
            columns={columns}
            enableColumnFilters
            enableSorting
            tableHeight={500}
            pageSizes={[20, 50, 100]}
            emptyMessage="No employees found"
          />
        </section>
      )}
    </div>
  )
}
