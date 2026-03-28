import { DataGrid } from '@data-voyager/shared-ui'
import { ALL_DATA } from '../../data'
import { columns } from '../../columns'

export function BorderedTab() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Default — no column dividers</p>
        <DataGrid
          data={ALL_DATA}
          columns={columns}
          enableSorting
          enableColumnFilters
          pageSizes={[10, 20]}
          emptyMessage="No employees found"
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Bordered — vertical dividers between columns</p>
        <DataGrid
          data={ALL_DATA}
          columns={columns}
          enableSorting
          enableColumnFilters
          bordered
          pageSizes={[10, 20]}
          emptyMessage="No employees found"
        />
      </div>
    </section>
  )
}
