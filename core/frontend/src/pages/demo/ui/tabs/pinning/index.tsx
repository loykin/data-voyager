import { DataGrid } from '@data-voyager/shared-ui'
import { ALL_DATA } from '../../data'
import { columns } from './columns'

export function PinningTab() {
  return (
    <section className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        <strong>ID</strong>, <strong>Name</strong> — pinned left via <code>meta.pin: &apos;left&apos;</code> ·{' '}
        <strong>Status</strong> — pinned right via <code>meta.pin: &apos;right&apos;</code> ·{' '}
        pinned columns stay fixed during horizontal scroll
      </p>
      <DataGrid
        data={ALL_DATA}
        columns={columns}
        columnSizingMode="fixed"
        enableSorting
        tableHeight={500}
        pageSizes={[20, 50, 100]}
        emptyMessage="No employees found"
      />
    </section>
  )
}
