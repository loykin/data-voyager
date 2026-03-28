import { DataGrid } from '@data-voyager/shared-ui'
import { SMALL_DATA } from '../../data'
import { columns } from '../../columns'

export function PaginationTab() {
  return (
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
  )
}
