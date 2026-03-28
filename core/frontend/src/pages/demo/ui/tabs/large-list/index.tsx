import { DataGrid } from '@data-voyager/shared-ui'
import { RESOURCE_DATA } from './data'
import { columns } from './columns'

/**
 * Demonstrates:
 * - 300 rows loaded all at once (no pagination, no progressive fetch)
 * - Virtualizer auto-enabled (rows >= 100 + fixed height)
 * - Multi-line rows: Tags column wraps badges, Description wraps text
 * - measureElement tracks actual row height for correct virtual positioning
 */
export function LargeListTab() {
  return (
    <section className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        300 rows · no pagination · virtualizer auto-enabled ·{' '}
        <strong>Tags</strong> and <strong>Description</strong> columns wrap to multiple lines
      </p>
      <DataGrid
        data={RESOURCE_DATA}
        columns={columns}
        enablePagination={false}
        enableSorting
        enableColumnFilters
        bordered
        tableHeight={560}
        emptyMessage="No resources found"
      />
    </section>
  )
}
