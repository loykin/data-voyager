import { useState } from 'react'
import { DataGrid } from '@data-voyager/shared-ui'
import { SMALL_DATA } from '../../data'
import { columns } from '../../columns'

export function SelectionTab() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          checkboxConfig · {selectedIds.size} row(s) selected
        </p>
        {selectedIds.size > 0 && (
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear selection
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
  )
}
