import { DataGrid, useSidePanelStore } from '@data-voyager/shared-ui'
import { SMALL_DATA } from '../../data'
import { columns } from '../../columns'
import type { Employee } from '../../data'

function EmployeeDetail({ employee }: { employee: Employee }) {
  const statusColor =
    employee.status === 'Active'     ? 'bg-green-100 text-green-800'
    : employee.status === 'On Leave' ? 'bg-yellow-100 text-yellow-800'
    : 'bg-red-100 text-red-800'

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div>
          <p className="text-xs text-muted-foreground">Employee #{employee.id}</p>
          <h2 className="text-lg font-semibold">{employee.name}</h2>
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}>
          {employee.status}
        </span>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
        <section>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Position</p>
          <dl className="space-y-2">
            <Row label="Department" value={employee.department} />
            <Row label="Role"       value={employee.role} />
            <Row label="Start Date" value={employee.startDate} />
          </dl>
        </section>

        <section>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Performance</p>
          <dl className="space-y-2">
            <Row label="Salary" value={`$${employee.salary.toLocaleString()}`} />
            <Row label="Score"  value={String(employee.score)} />
          </dl>
        </section>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

export function SidePanelTab() {
  const { open } = useSidePanelStore()

  const handleRowClick = (employee: Employee) => {
    open(<EmployeeDetail employee={employee} />, 480)
  }

  return (
    <section className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Row click → side panel · outside click to close · drag left edge to resize
      </p>
      <DataGrid
        data={SMALL_DATA}
        columns={columns}
        enableSorting
        enableColumnFilters
        pageSizes={[10, 20, 50]}
        emptyMessage="No employees found"
        onRowClick={handleRowClick}
      />
    </section>
  )
}
