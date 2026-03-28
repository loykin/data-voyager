import { DataGrid } from '@data-voyager/shared-ui'
import { ALL_DATA } from '../../data'
import { columns } from '../../columns'

export function FixedHeightTab() {
  return (
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
  )
}
