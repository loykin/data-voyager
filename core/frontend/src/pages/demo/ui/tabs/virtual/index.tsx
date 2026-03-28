import { DataGridVirtual } from '@data-voyager/shared-ui'
import { ALL_DATA } from '../../data'
import { columns } from '../../columns'

export function VirtualTab() {
  return (
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
  )
}
