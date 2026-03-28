import { DataGrid } from '@data-voyager/shared-ui'
import { SMALL_DATA, ALL_DATA } from '../../data'
import { columns } from '../../columns'
import { teamColumns, salaryColumns } from './columns'

export function DashboardTab() {
  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 min-w-0">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Team Overview</p>
          <DataGrid
            data={SMALL_DATA.slice(0, 20)}
            columns={teamColumns}
            enableSorting
            pageSizes={[5, 10]}
            paginationConfig={{ pageSize: 5 }}
            emptyMessage="No data"
          />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Salary & Score</p>
          <DataGrid
            data={SMALL_DATA.slice(0, 20)}
            columns={salaryColumns}
            enableSorting
            pageSizes={[5, 10]}
            paginationConfig={{ pageSize: 5 }}
            emptyMessage="No data"
          />
        </div>
      </div>

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
  )
}
