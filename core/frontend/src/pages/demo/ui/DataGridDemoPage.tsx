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

// ── Pinned column definitions ──────────────────────────────────────────────
// Fixed widths (no flex) so columns overflow the container → horizontal scroll
// reveals pinned column behaviour

const pinnedColumns: DataGridColumnDef<Employee>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    size: 80,
    meta: { pin: 'left' },
  },
  {
    accessorKey: 'name',
    header: 'Name',
    size: 200,
    meta: { pin: 'left' },
  },
  {
    accessorKey: 'department',
    header: 'Department',
    size: 200,
  },
  {
    accessorKey: 'role',
    header: 'Role',
    size: 200,
  },
  {
    accessorKey: 'salary',
    header: 'Salary',
    size: 150,
    meta: { align: 'right' },
    cell: ({ getValue }) => `$${(getValue() as number).toLocaleString()}`,
  },
  {
    accessorKey: 'startDate',
    header: 'Start Date',
    size: 150,
  },
  {
    accessorKey: 'score',
    header: 'Score',
    size: 120,
    meta: { align: 'right' },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    size: 150,
    meta: { pin: 'right' },
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
]

// ── Infinite scroll helpers ────────────────────────────────────────────────

const PAGE = 50

// ── Demo page ─────────────────────────────────────────────────────────────

type Tab = 'pagination' | 'infinity' | 'virtual' | 'fixed' | 'pinning' | 'dashboard' | 'selection'

export function DataGridDemoPage() {
  const [tab, setTab] = useState<Tab>('pagination')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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
    { id: 'pinning', label: 'Column Pinning' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'selection', label: 'Row Selection' },
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
            50 rows · enableColumnFilters · enableColumnVisibility · text / select / number range filters
          </p>
          <DataGrid
            data={SMALL_DATA}
            columns={columns}
            enableColumnFilters
            enableColumnVisibility
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

      {/* ── Column Pinning tab ── */}
      {tab === 'pinning' && (
        <section className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            <strong>ID</strong>, <strong>Name</strong> — pinned left via <code>meta.pin: &apos;left&apos;</code> ·{' '}
            <strong>Status</strong> — pinned right via <code>meta.pin: &apos;right&apos;</code> ·{' '}
            pinned columns stay fixed during horizontal scroll
          </p>
          <DataGrid
            data={ALL_DATA}
            columns={pinnedColumns}
            columnSizingMode="fixed"
            enableSorting
            tableHeight={500}
            pageSizes={[20, 50, 100]}
            emptyMessage="No employees found"
          />
        </section>
      )}

      {/* ── Dashboard tab ── */}
      {tab === 'dashboard' && (
        <section className="flex flex-col gap-4">
          {/* Top row: 2 tables side by side */}
          <div className="grid grid-cols-2 gap-4 min-w-0">
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Team Overview</p>
              <DataGrid
                data={SMALL_DATA.slice(0, 20)}
                columns={[
                  { accessorKey: 'id', header: 'ID', meta: { flex: 0.5 } },
                  { accessorKey: 'name', header: 'Name', meta: { flex: 2 } },
                  { accessorKey: 'department', header: 'Dept', meta: { flex: 1.5 } },
                  { accessorKey: 'status', header: 'Status', meta: { flex: 1 },
                    cell: ({ getValue }) => {
                      const s = getValue() as Employee['status']
                      const color = s === 'Active' ? 'bg-green-100 text-green-800' : s === 'On Leave' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{s}</span>
                    },
                  },
                ] satisfies DataGridColumnDef<Employee>[]}
                enableSorting
                pageSizes={[5, 10]}
                paginationConfig={{ pageSize: 5, initialPageIndex: 0 }}
                emptyMessage="No data"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Salary & Score</p>
              <DataGrid
                data={SMALL_DATA.slice(0, 20)}
                columns={[
                  { accessorKey: 'name', header: 'Name', meta: { flex: 2 } },
                  { accessorKey: 'role', header: 'Role', meta: { flex: 1.5 } },
                  { accessorKey: 'salary', header: 'Salary', meta: { flex: 1, align: 'right' },
                    cell: ({ getValue }) => `$${(getValue() as number).toLocaleString()}`,
                  },
                  { accessorKey: 'score', header: 'Score', meta: { flex: 0.8, align: 'right' } },
                ] satisfies DataGridColumnDef<Employee>[]}
                enableSorting
                pageSizes={[5, 10]}
                paginationConfig={{ pageSize: 5, initialPageIndex: 0 }}
                emptyMessage="No data"
              />
            </div>
          </div>

          {/* Bottom: full-width table */}
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">All Employees</p>
            <DataGrid
              data={ALL_DATA}
              columns={columns}
              enableColumnFilters
              enableSorting
              pageSizes={[10, 20, 50]}
              emptyMessage="No employees found"
            />
          </div>
        </section>
      )}

      {/* ── Row Selection tab ── */}
      {tab === 'selection' && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              checkboxConfig · 선택된 행: {selectedIds.size}개
            </p>
            {selectedIds.size > 0 && (
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                선택 해제
              </button>
            )}
          </div>
          <DataGrid
            data={SMALL_DATA}
            columns={columns}
            enableSorting
            enableColumnVisibility
            pageSizes={[10, 20, 50]}
            emptyMessage="No employees found"
            checkboxConfig={{
              getRowId: (row) => String(row.id),
              selectedIds,
              onSelectAll: (rows, checked) => {
                setSelectedIds((prev) => {
                  const next = new Set(prev)
                  rows.forEach((r) => {
                    if (checked) next.add(String(r.original.id))
                    else next.delete(String(r.original.id))
                  })
                  return next
                })
              },
              onSelectOne: (id, checked) => {
                setSelectedIds((prev) => {
                  const next = new Set(prev)
                  if (checked) next.add(id)
                  else next.delete(id)
                  return next
                })
              },
            }}
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
